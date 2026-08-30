const express = require('express');
const router = express.Router();
const { Quiz, QuizSubmission, User, Alert } = require('../database/models');
const { auth, roleAuth } = require('../middleware/auth');

// 1. Create a new QCM Quiz (Teacher)
router.post('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { subject, gradeLevel, title, description, questions, dueDate, maxScore } = req.body;

    if (!subject || !title || !questions || !Array.isArray(questions) || questions.length === 0 || !dueDate) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (matière, titre, questions, date limite)' });
    }

    const quiz = await Quiz.create({
      teacherId: req.user.id,
      subject,
      gradeLevel: gradeLevel || 'Tous les niveaux',
      title,
      description: description || '',
      questions,
      dueDate: new Date(dueDate),
      maxScore: parseInt(maxScore) || 20
    });

    // Notify enrolled students via Alert
    try {
      const students = await User.findAll({ where: { role: 'student' } });
      for (const student of students) {
        await Alert.create({
          studentId: student.id,
          type: 'warning',
          severity: 'warning',
          title: 'Nouveau Quiz QCM',
          message: `🎯 Nouveau Quiz QCM publié : "${title}" (${subject.toUpperCase()}). Complétez-le avant le ${new Date(dueDate).toLocaleDateString('fr-FR')}`,
          source: 'quiz_system'
        }).catch(() => {});
      }
    } catch (e) {}

    res.status(201).json({ message: 'Quiz QCM créé avec succès !', quiz });
  } catch (err) {
    console.error('Error creating quiz:', err);
    res.status(500).json({ error: 'Erreur lors de la création du quiz' });
  }
});

// 2. Get Quizzes for Teacher
router.get('/teacher', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({
      include: [
        {
          model: QuizSubmission,
          as: 'submissions',
          include: [
            { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email', 'grade'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ quizzes });
  } catch (err) {
    console.error('Error fetching teacher quizzes:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des quiz' });
  }
});

// 3. Get assigned Quizzes for Student
router.get('/student', auth, roleAuth('student'), async (req, res) => {
  try {
    const student = req.user;
    const allQuizzes = await Quiz.findAll({
      include: [
        {
          model: QuizSubmission,
          as: 'submissions',
          where: { studentId: student.id },
          required: false
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    const normalizeGrade = (str) =>
      (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    const studentGradeNorm = normalizeGrade(student.grade || student.gradeLevel);

    const assignedQuizzes = allQuizzes.filter(q => {
      if (!q.gradeLevel || q.gradeLevel === 'Tous les niveaux' || q.gradeLevel === 'All Grade Levels') return true;
      if (!studentGradeNorm) return true;

      const quizGradeNorm = normalizeGrade(q.gradeLevel);
      if (studentGradeNorm === quizGradeNorm) return true;
      if (studentGradeNorm.includes('1') && quizGradeNorm.includes('1')) return true;
      if (studentGradeNorm.includes('2') && quizGradeNorm.includes('2')) return true;
      if (studentGradeNorm.includes('tronc') && quizGradeNorm.includes('tronc')) return true;
      return false;
    }).map(q => {
      const mySubmission = q.submissions && q.submissions.length > 0 ? q.submissions[0] : null;
      const isPastDue = new Date() > new Date(q.dueDate);

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        subject: q.subject,
        gradeLevel: q.gradeLevel,
        questions: q.questions,
        dueDate: q.dueDate,
        maxScore: q.maxScore,
        mySubmission,
        isCompleted: Boolean(mySubmission),
        isPastDue
      };
    });

    res.json({ quizzes: assignedQuizzes });
  } catch (err) {
    console.error('Error fetching student quizzes:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des quiz' });
  }
});

// 4. Submit MCQ Quiz (Student) - Auto Grading
router.post('/:quizId/submit', auth, roleAuth('student'), async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // { q1: 'optionA', q2: 'optionB' }

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz non trouvé' });
    }

    // Auto Grade MCQ Questions
    let earnedPoints = 0;
    let totalPossible = 0;

    (quiz.questions || []).forEach(q => {
      const questionPoints = q.points || 1;
      totalPossible += questionPoints;

      const studentChoice = answers ? answers[q.id] : null;
      if (studentChoice && studentChoice === q.correctOption) {
        earnedPoints += questionPoints;
      }
    });

    const scaledScore = totalPossible > 0 ? parseFloat(((earnedPoints / totalPossible) * quiz.maxScore).toFixed(1)) : 0;

    let submission = await QuizSubmission.findOne({ where: { quizId, studentId: req.user.id } });
    if (submission) {
      submission.answers = answers || {};
      submission.score = scaledScore;
      submission.submittedAt = new Date();
      await submission.save();
    } else {
      submission = await QuizSubmission.create({
        quizId,
        studentId: req.user.id,
        answers: answers || {},
        score: scaledScore,
        submittedAt: new Date()
      });
    }

    // Create Alert notification
    await Alert.create({
      studentId: req.user.id,
      type: 'engagement',
      severity: 'info',
      title: 'Quiz QCM Terminé',
      message: `🎯 Quiz QCM "${quiz.title}" complété ! Votre résultat : ${scaledScore}/${quiz.maxScore}`,
      source: 'quiz_system'
    }).catch(() => {});

    res.json({
      message: 'Quiz soumis et corrigé automatiquement !',
      score: scaledScore,
      maxScore: quiz.maxScore,
      submission
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    res.status(500).json({ error: 'Erreur lors de la soumission du quiz' });
  }
});

module.exports = router;
