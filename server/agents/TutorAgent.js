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
    
    const basePrompt = `Tu es un tuteur expert en ${subjectName} dans un système pédagogique pour les étudiants de l'EMSI (École Marocaine des Sciences de l'Ingénieur).

CONSIGNES STRICTES :
1. Tu dois TOUJOURS répondre en FRANÇAIS.
2. Tu dois te baser STRICTEMENT sur les supports de cours du professeur ("SUPPORT DU PROFESSEUR") fournis ci-dessous.
3. Ne réinvente JAMAIS de fausses équations ou formules mathématiques. Utilise uniquement les formules réelles indiquées dans le cours.
4. Cite systématiquement le document source : "[Source: NomDuDocument]".
5. Guide l'élève étape par étape de manière encourageante.
6. HORS-SUJET : Si la question ne figure PAS dans le support de cours du professeur, indique clairement à l'élève que le sujet n'est pas couvert dans le support de cours transmis par le professeur.

Contexte élève :
${studentContext}

Mode actuel : ${mode.toUpperCase()}`;

    const modeSpecificPrompts = {
      recall: `\n\nMODE RAPPEL :
- Demande à l'élève de se rappeler des concepts et formules clés du support du professeur.
- Pose une question de guidage comme : "Que te rappelles-tu du cours du professeur concernant cette formule ?"
- Aide-le à réactiver ses connaissances à partir du document transmis.`,

      diagnostic: `\n\nMODE DIAGNOSTIC :
- L'élève hésite ou est bloqué : identifie la formule du cours qui lui manque.
- Pose une question ciblée : "Quelle partie de la formule du cours te semble difficile ?"
- Corrige avec bienveillance en rappelant la règle exacte du professeur.`,

      scaffold: `\n\nMODE GUIDAGE PAS À PAS :
- Donne un indice progressif basé sur le cours du professeur, sans donner directement tout le résultat final.
- Décompose le calcul en sous-étapes simples suivant la méthode du professeur.
- Invite l'élève à calculer la première étape.`
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
      // Handle simple greetings gracefully
      const textLower = (question || '').trim().toLowerCase().replace(/[^\w\s]/gi, '');
      const greetings = ['salut', 'bonjour', 'hello', 'hi', 'coucou', 'bonsoir', 'hola'];
      if (greetings.includes(textLower)) {
        const subName = this.subject === 'math' ? 'Mathématiques' : this.subject === 'physics' ? 'Physique-Chimie' : this.subject;
        return {
          answer: `Bonjour ! 👋 Je suis votre tuteur IA pour le cours de **${subName}**. Quelle notion ou question souhaitez-vous réviser ensemble aujourd'hui ?`,
          mode: 'recall',
          sources: [],
          hintsGiven: 0
        };
      }

      // Get student's PFSM state
      const pfsmState = await PFSM.findOne({ where: { studentId } });
      
      // Retrieve relevant course materials using RAG (Top 1 most relevant course document)
      const ragResults = await RAGService.queryDocuments(this.subject, question, 1);
      
      // Get teacher's guidelines for this subject
      const { CourseDocument } = require('../database/models');
      const documentsWithGuidelines = await CourseDocument.findAll({
        where: { 
          subject: this.subject,
          guidelines: { [require('sequelize').Op.ne]: null }
        },
        attributes: ['title', 'chapter', 'guidelines'],
        limit: 5
      });
      
      // Build context from retrieved documents
      let retrievedContext = '';
      if (ragResults.documents && ragResults.documents.length > 0) {
        retrievedContext = '\n\nTEACHER COURSE MATERIALS (SUPPORT DU PROFESSEUR):\n';
        ragResults.documents.forEach((doc, idx) => {
          const meta = ragResults.metadatas[idx] || {};
          const title = meta.title || meta.documentTitle || 'Support de cours';
          retrievedContext += `\n[Document: ${title}]\n${doc}\n`;
        });
      }

      // Add teacher guidelines
      if (documentsWithGuidelines.length > 0) {
        retrievedContext += '\n\nTEACHER GUIDELINES & INSTRUCTIONS (CONSIGNES DU PROFESSEUR):\n';
        documentsWithGuidelines.forEach((doc) => {
          if (doc.guidelines) {
            retrievedContext += `\n[Document "${doc.title}"]: ${doc.guidelines}\n`;
          }
        });
        retrievedContext += '\nIMPORTANT: You must strictly respect these teacher guidelines and course contents.\n';
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

      // Update mastery levels based on outcome (cloning to avoid Sequelize JSONB change detection issue)
      const masteryLevels = { ...(pfsm.masteryLevels || {}) };
      const currentMastery = masteryLevels[this.subject] || 0.5;

      if (outcome === 'solved') {
        masteryLevels[this.subject] = Math.min(1.0, currentMastery + 0.05);
      } else if (outcome === 'needs_review') {
        masteryLevels[this.subject] = Math.max(0.0, currentMastery - 0.02);
      }

      // Update engagement metrics (cloning to avoid Sequelize JSONB change detection issue)
      const engagementMetrics = { ...(pfsm.engagementMetrics || {}) };
      engagementMetrics.totalSessions = (engagementMetrics.totalSessions || 0) + 1;
      engagementMetrics[`${this.subject}Sessions`] = (engagementMetrics[`${this.subject}Sessions`] || 0) + 1;

      // Add to recent interactions (cloning to avoid Sequelize JSONB change detection issue)
      const recentInteractions = [ ...(pfsm.recentInteractions || []) ];
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

