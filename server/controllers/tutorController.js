const TutorAgent = require('../agents/TutorAgent');
const { TutoringSession, RLReward } = require('../database/models');

exports.askQuestion = async (req, res) => {
  try {
    const { subject, question, sessionId } = req.body;
    const studentId = req.user.id;

    const validSubjects = ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({ error: 'Invalid subject' });
    }

    // Check if student has access to this subject through classroom
    const studentController = require('./studentController');
    const availableSubjects = await studentController.getStudentAvailableSubjects(studentId);
    
    if (!availableSubjects.includes(subject)) {
      return res.status(403).json({ 
        error: 'You do not have access to this subject. Please contact your teacher or admin.' 
      });
    }

    // Get or create session
    let session;
    let conversation = [];

    if (sessionId) {
      session = await TutoringSession.findByPk(sessionId);
      if (!session || session.studentId !== studentId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      conversation = [ ...(session.conversation || []) ];
      // Purge any old English hallucination messages from session history
      conversation = conversation.filter(msg => {
        if (msg.role === 'assistant' && msg.content) {
          const isEnglish = /(Sure|Certainly|Here is|To derive|In this case|Step \d|Therefore|Hope this helps|equation|derivative rule)/i.test(msg.content);
          return !isEnglish;
        }
        return true;
      });
    } else {
      // Auto-finalize any stale ongoing sessions for this student & subject so they are clean and completed
      await TutoringSession.update(
        { outcome: 'solved', completedAt: new Date() },
        { where: { studentId, subject, outcome: 'ongoing' } }
      ).catch(() => {});

      session = await TutoringSession.create({
        studentId,
        subject,
        question,
        conversation: [],
        outcome: 'ongoing'
      });

      // Initialize RL reward tracking
      await RLReward.create({
        sessionId: session.id,
        studentId,
        state: {}, // Will be populated from PFSM
        actions: [],
        isFinalized: false
      }).catch(() => {});
    }

    // Get tutor response
    const tutor = new TutorAgent(subject);
    const response = await tutor.generateResponse(studentId, question, conversation);

    // Update conversation
    conversation.push(
      { role: 'user', content: question, timestamp: new Date() },
      { 
        role: 'assistant', 
        content: response.answer, 
        mode: response.mode,
        sources: response.sources,
        timestamp: new Date()
      }
    );

    // Update session
    await session.update({
      conversation,
      mode: response.mode,
      hintsGiven: session.hintsGiven + response.hintsGiven
    });

    res.json({
      sessionId: session.id,
      answer: response.answer,
      mode: response.mode,
      sources: response.sources,
      hintsGiven: response.hintsGiven
    });
  } catch (error) {
    console.error('Tutor question error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { sessionId, rating, feedback, outcome } = req.body;
    const studentId = req.user.id;

    const session = await TutoringSession.findByPk(sessionId);
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update session
    const duration = Math.floor((new Date() - new Date(session.startedAt)) / 1000);
    await session.update({
      studentRating: rating,
      studentFeedback: feedback,
      outcome: outcome || session.outcome,
      completedAt: new Date(),
      duration
    });

    // Update PFSM
    const tutor = new TutorAgent(session.subject);
    await tutor.updatePFSM(studentId, session, outcome || session.outcome);

    // Calculate and update RL reward
    await this.calculateReward(sessionId);

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subject, limit = 20 } = req.query;

    const where = { studentId };
    if (subject) {
      where.subject = subject;
    }

    const sessions = await TutoringSession.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      attributes: ['id', 'subject', 'question', 'conversation', 'outcome', 'mode', 'studentRating', 'hintsGiven', 'duration', 'createdAt']
    });

    const sessionsWithSummary = sessions.map((sess) => {
      const conv = sess.conversation || [];
      const question = sess.question || '';
      const fullText = question + ' ' + conv.map(m => m.content || '').join(' ');
      const cleanText = fullText.replace(/\\\(|\\\)|\\\[|\\\]|\\text\{[^}]+\}/g, '').replace(/[*_#`[\]]/g, ' ').toLowerCase();

      let summary = '';
      if (cleanText.includes('ln') || cleanText.includes('logarithme')) {
        summary = 'Dérivation & Propriétés de ln(x)';
      } else if (cleanText.includes('align') || (cleanText.includes('point') && cleanText.includes('complexe'))) {
        summary = 'Alignement de points complexes';
      } else if (cleanText.includes('module') && cleanText.includes('complexe')) {
        summary = 'Module d\'un nombre complexe';
      } else if (cleanText.includes('euler') || (cleanText.includes('cos') && cleanText.includes('sin'))) {
        summary = 'Formules d\'Euler & Trigonométrie';
      } else if (cleanText.includes('integral') || cleanText.includes('primitive')) {
        summary = 'Calcul d\'Intégrales & Aires';
      } else if (cleanText.includes('limite') || cleanText.includes('borne')) {
        summary = 'Calcul de Limites aux bornes';
      } else if (cleanText.includes('produit scalaire') || cleanText.includes('vecteur')) {
        summary = 'Produit Scalaire & Géométrie';
      } else if (cleanText.includes('derive') || cleanText.includes('dérivé')) {
        summary = 'Calcul Différentiel & Dérivées';
      } else {
        const clean = question.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/[*_#]/g, '').trim();
        summary = clean.length > 55 ? clean.slice(0, 52).trim() + '...' : clean;
        if (!summary) summary = 'Discussion Tutorat IA';
      }

      const json = sess.toJSON();
      delete json.conversation;
      return {
        ...json,
        summary
      };
    });

    res.json({ sessions: sessionsWithSummary });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    const session = await TutoringSession.findByPk(sessionId);
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

exports.calculateReward = async (sessionId) => {
  try {
    const session = await TutoringSession.findByPk(sessionId);
    const reward = await RLReward.findOne({ where: { sessionId } });

    if (!session || !reward) return;

    // Calculate Rs (Student-level reward)
    let Rs = 0;
    if (session.outcome === 'solved') Rs += 0.5;
    if (session.studentRating >= 4) Rs += 0.3;
    if (session.outcome === 'needs_review') Rs += 0.1;
    Rs = Math.min(1.0, Rs);

    // Calculate Rt (Tutor-level reward)
    let Rt = 0.5; // Base
    if (session.teacherRating) {
      Rt = session.teacherRating / 5.0;
    } else {
      // Heuristic based on hints
      if (session.hintsGiven > 0 && session.hintsGiven <= 3) Rt += 0.3;
      if (session.hintsGiven > 5) Rt -= 0.2;
      Rt = Math.max(0, Math.min(1.0, Rt));
    }

    // Calculate Rg (General reward)
    let Rg = 0.5; // Base
    if (session.duration && session.duration < 600) Rg += 0.2; // < 10 min is efficient
    if (session.duration && session.duration > 1800) Rg -= 0.2; // > 30 min might be struggling
    Rg = Math.max(0, Math.min(1.0, Rg));

    // Combined reward
    const lambda_s = parseFloat(process.env.REWARD_LAMBDA_STUDENT) || 0.5;
    const lambda_t = parseFloat(process.env.REWARD_LAMBDA_TUTOR) || 0.3;
    const lambda_g = parseFloat(process.env.REWARD_LAMBDA_GENERAL) || 0.2;

    const totalReward = lambda_s * Rs + lambda_t * Rt + lambda_g * Rg;

    await reward.update({
      Rs,
      Rt,
      Rg,
      totalReward,
      rewardBreakdown: {
        student_outcome: session.outcome,
        student_rating: session.studentRating,
        teacher_rating: session.teacherRating,
        hints_given: session.hintsGiven,
        duration: session.duration
      },
      isFinalized: true,
      computedAt: new Date()
    });
  } catch (error) {
    console.error('Reward calculation error:', error);
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    const session = await TutoringSession.findByPk(sessionId);
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    await RLReward.destroy({ where: { sessionId } }).catch(() => {});
    await session.destroy();

    res.json({ message: 'Discussion supprimée avec succès', sessionId });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Échec de la suppression de la discussion' });
  }
};
