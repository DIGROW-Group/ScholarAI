const ClaudeService = require('../services/ClaudeService');
const RAGService = require('../services/RAGService');
const { PFSM, TutoringSession, RLReward } = require('../database/models');

class TutorAgent {
  constructor(subject) {
    this.subject = subject;
    this.modes = ['recall', 'diagnostic', 'scaffold'];
  }

  getSystemPrompt(mode, studentContext) {
    const subjectNames = {
      math: 'Mathematics',
      physics: 'Physics',
      arabic: 'Arabic Language & Literature',
      english: 'English Language',
      french: 'French Language',
      informatique: 'Computer Science / IT'
    };
    
    const subjectName = subjectNames[this.subject] || this.subject.toUpperCase();
    
    const basePrompt = `You are an expert ${subjectName} tutor working in an advanced AI tutoring system for Moroccan students (École Marocaine des Sciences de l'Ingénieur). Your goal is to help students learn through effective pedagogy, not just give answers.

Student Context:
${studentContext}

Current Mode: ${mode.toUpperCase()}

Guidelines:
- ALWAYS cite sources when using information from course materials. Format: "[Source: DocumentName]"
- Never give the full answer immediately unless the student has genuinely tried multiple steps
- Be encouraging and supportive, especially if the student is struggling
- Adjust your language to be clear and age-appropriate
- Break complex problems into manageable steps`;

    const modeSpecificPrompts = {
      recall: `\n\nRECALL MODE:
- Ask the student to recall relevant concepts, formulas, or prior knowledge
- Prompt with questions like "What do you remember about...?" or "Can you think of a formula that might help?"
- Help activate their existing knowledge before diving into the problem
- If they can't recall, provide a gentle hint to jog their memory`,

      diagnostic: `\n\nDIAGNOSTIC MODE:
- The student has attempted something or is stuck - figure out WHY
- Ask probing questions: "Can you explain your reasoning?" or "Which part is confusing?"
- Identify the specific misconception or knowledge gap
- Don't correct immediately - first understand their thinking
- Note any patterns that might indicate deeper misunderstandings`,

      scaffold: `\n\nSCAFFOLD MODE:
- Provide graduated hints and guidance, not the full solution
- Break the problem into smaller sub-questions
- Give the next step or a partial solution, then wait for the student to continue
- Use leading questions: "What if you tried...?" or "Have you considered...?"
- Only give more direct help if the student is truly stuck after multiple attempts
- Celebrate small wins as they progress through steps`
    };

    return basePrompt + (modeSpecificPrompts[mode] || '');
  }

  async determineMode(conversation, pfsmState) {
    // Simple heuristic-based mode selection
    // In production, this could use an ML model or more sophisticated logic
    
    if (conversation.length === 0) {
      return 'recall'; // Start with recall for new questions
    }

    const lastStudentMessage = conversation[conversation.length - 1];
    const studentText = lastStudentMessage.content?.toLowerCase() || '';

    // Check PFSM for student's typical needs
    const needsScaffolding = pfsmState?.weaknesses?.includes(this.subject);

    // Diagnostic if student expresses confusion
    if (studentText.includes("don't understand") || 
        studentText.includes("confused") || 
        studentText.includes("stuck")) {
      return 'diagnostic';
    }

    // Scaffold if student has tried something or needs help
    if (studentText.includes("tried") || 
        studentText.includes("got") ||
        needsScaffolding) {
      return 'scaffold';
    }

    // Default progression: recall -> diagnostic -> scaffold
    if (conversation.length <= 2) {
      return 'recall';
    } else if (conversation.length <= 4) {
      return 'diagnostic';
    } else {
      return 'scaffold';
    }
  }

  buildStudentContext(pfsmState) {
    if (!pfsmState) {
      return 'No prior context available for this student.';
    }

    const mastery = pfsmState.masteryLevels?.[this.subject] || {};
    const strengths = pfsmState.strengths || [];
    const weaknesses = pfsmState.weaknesses || [];
    const misconceptions = pfsmState.misconceptions || [];
    const learningStyle = pfsmState.learningStyle || 'unknown';

    return `
Mastery Levels: ${Object.entries(mastery).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).join(', ') || 'Not yet assessed'}
Strengths: ${strengths.join(', ') || 'To be determined'}
Weaknesses: ${weaknesses.join(', ') || 'To be determined'}
Recent Misconceptions: ${misconceptions.slice(-3).map(m => m.description).join('; ') || 'None noted'}
Learning Style: ${learningStyle}
`.trim();
  }

  async generateResponse(studentId, question, conversation = []) {
    try {
      // Get student's PFSM state
      const pfsmState = await PFSM.findOne({ where: { studentId } });
      
      // Retrieve relevant course materials using RAG
      const ragResults = await RAGService.queryDocuments(this.subject, question, 3);
      
      // Get teacher's guidelines for this subject
      const { CourseDocument } = require('../database/models');
      const documentsWithGuidelines = await CourseDocument.findAll({
        where: { 
          subject: this.subject,
          guidelines: { [require('sequelize').Op.ne]: null }
        },
        attributes: ['guidelines'],
        limit: 5
      });
      
      // Build context from retrieved documents
      let retrievedContext = '';
      if (ragResults.documents.length > 0) {
        retrievedContext = '\n\nRelevant Course Materials:\n';
        ragResults.documents.forEach((doc, idx) => {
          const meta = ragResults.metadatas[idx];
          retrievedContext += `\n[Document: ${meta.title || 'Unknown'}]\n${doc}\n`;
        });
      }

      // Add teacher guidelines
      if (documentsWithGuidelines.length > 0) {
        retrievedContext += '\n\nTeacher Guidelines & Instructions:\n';
        documentsWithGuidelines.forEach((doc) => {
          if (doc.guidelines) {
            retrievedContext += `\n${doc.guidelines}\n`;
          }
        });
        retrievedContext += '\nIMPORTANT: Follow these teacher guidelines closely in your tutoring approach.\n';
      }

      // Determine appropriate tutoring mode
      const mode = await this.determineMode(conversation, pfsmState);

      // Build student context
      const studentContext = this.buildStudentContext(pfsmState);

      // Construct system prompt
      const systemPrompt = this.getSystemPrompt(mode, studentContext) + retrievedContext;

      // Build conversation history for Claude
      const messages = [
        ...conversation.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: question
        }
      ];

      // Get response from Claude
      const response = await ClaudeService.generateResponse(systemPrompt, messages);

      // Count hints (simple heuristic: questions or suggestions in response)
      const hintsGiven = (response.content.match(/\?/g) || []).length;

      return {
        answer: response.content,
        mode,
        sources: ragResults.sources,
        hintsGiven,
        usage: response.usage
      };
    } catch (error) {
      console.error('Tutor agent error:', error);
      throw error;
    }
  }

  async updatePFSM(studentId, sessionData, outcome) {
    try {
      let pfsm = await PFSM.findOne({ where: { studentId } });
      
      if (!pfsm) {
        pfsm = await PFSM.create({ studentId });
      }

      // Update mastery levels based on outcome
      const masteryLevels = pfsm.masteryLevels || {};
      const currentMastery = masteryLevels[this.subject] || 0.5;

      if (outcome === 'solved') {
        masteryLevels[this.subject] = Math.min(1.0, currentMastery + 0.05);
      } else if (outcome === 'needs_review') {
        masteryLevels[this.subject] = Math.max(0.0, currentMastery - 0.02);
      }

      // Update engagement metrics
      const engagementMetrics = pfsm.engagementMetrics || {};
      engagementMetrics.totalSessions = (engagementMetrics.totalSessions || 0) + 1;
      engagementMetrics[`${this.subject}Sessions`] = (engagementMetrics[`${this.subject}Sessions`] || 0) + 1;

      // Add to recent interactions
      const recentInteractions = pfsm.recentInteractions || [];
      recentInteractions.unshift({
        subject: this.subject,
        outcome,
        timestamp: new Date(),
        hintsNeeded: sessionData.hintsGiven
      });

      // Keep only last 20 interactions
      if (recentInteractions.length > 20) {
        recentInteractions.pop();
      }

      await pfsm.update({
        masteryLevels,
        engagementMetrics,
        recentInteractions,
        lastUpdatedBy: `tutor_${this.subject}`,
        version: pfsm.version + 1
      });

      return pfsm;
    } catch (error) {
      console.error('PFSM update error:', error);
      throw error;
    }
  }
}

module.exports = TutorAgent;

