const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Homework, HomeworkSubmission, HomeworkComment, User, Alert } = require('../database/models');
const { auth, roleAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

// Helper to format file attachment URLs for frontend download/preview
const formatFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  const index = normalized.indexOf('/uploads/');
  if (index !== -1) {
    return normalized.substring(index);
  }
  if (normalized.startsWith('uploads/')) {
    return '/' + normalized;
  }
  if (!normalized.startsWith('/')) {
    return '/' + normalized;
  }
  return normalized;
};

// Configure Multer for homework attachments & submissions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/homework');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
  }
});
const upload = multer({ storage });

const ClaudeService = require('../services/ClaudeService');

// AI Devoir & Quiz Generator (Teacher only)
router.post('/ai-generate', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { subject, topic, gradeLevel, difficulty, maxScore, type } = req.body;
    if (!topic || topic.trim() === '') {
      return res.status(400).json({ error: 'Veuillez spécifier le chapitre ou sujet du cours.' });
    }

    const aiResult = await ClaudeService.generateAIHomework({
      subject: subject || 'math',
      topic,
      gradeLevel: gradeLevel || '1ère Bac',
      difficulty: difficulty || 'Bac',
      maxScore: parseInt(maxScore, 10) || 20,
      type: type || 'assignment'
    });

    res.json({
      success: true,
      data: aiResult
    });
  } catch (error) {
    console.error('AI Homework generation error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération IA du devoir.' });
  }
});

// 1. Create a new Homework assignment (Teacher only)
router.post('/', auth, roleAuth('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    const { subject, gradeLevel, title, description, dueDate, maxScore } = req.body;

    if (!subject || !title || !description || !dueDate) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (matière, titre, description, date limite)' });
    }

    let attachmentPath = null;
    if (req.file) {
      attachmentPath = req.file.path;
    }

    const homework = await Homework.create({
      teacherId: req.user.id,
      subject,
      gradeLevel: gradeLevel || 'Tous les niveaux',
      title,
      description,
      dueDate: new Date(dueDate),
      maxScore: parseInt(maxScore) || 20,
      attachmentPath
    });

    // Notify all students in this gradeLevel/subject via Alerts
    try {
      const students = await User.findAll({ where: { role: 'student' } });
      const targetGrade = (gradeLevel || '').toLowerCase();

      for (const student of students) {
        const studentGrade = (student.grade || student.gradeLevel || '').toLowerCase();
        const matchesGrade = !gradeLevel || targetGrade === 'tous les niveaux' || studentGrade.includes(targetGrade) || targetGrade.includes(studentGrade);
        
        if (matchesGrade) {
          await Alert.create({
            studentId: student.id,
            type: 'warning',
            severity: 'warning',
            title: 'Nouveau Devoir',
            message: ` Nouveau devoir publié : "${title}" (${subject.toUpperCase()}). Date limite : ${new Date(dueDate).toLocaleDateString('fr-FR')}`,
            source: 'homework_system'
          }).catch(err => console.error('Alert creation error:', err));
        }
      }
    } catch (notifyErr) {
      console.error('Error notifying students for homework:', notifyErr);
    }

    res.status(201).json({
      message: 'Devoir créé et publié avec succès !',
      homework
    });
  } catch (err) {
    console.error('Error creating homework:', err);
    res.status(500).json({ error: 'Erreur lors de la création du devoir' });
  }
});

// 2. Get all Homework created by Teacher (or all for teacher role)
router.get('/teacher', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const homeworks = await Homework.findAll({
      include: [
        {
          model: HomeworkSubmission,
          as: 'submissions',
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'grade']
            }
          ]
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ homeworks });
  } catch (err) {
    console.error('Error fetching teacher homeworks:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des devoirs' });
  }
});

// 3. Get all Submissions for a specific Homework assignment (Teacher)
router.get('/:homeworkId/submissions', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const homework = await Homework.findByPk(homeworkId);

    if (!homework) {
      return res.status(404).json({ error: 'Devoir non trouvé' });
    }

    const submissions = await HomeworkSubmission.findAll({
      where: { homeworkId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'grade']
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    res.json({ homework, submissions });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des soumissions' });
  }
});

// 4. Download/Stream Student Submission File (Teacher or Student owner)
router.get('/submissions/:submissionId/file', auth, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await HomeworkSubmission.findByPk(submissionId);

    if (!submission || !submission.filePath || !fs.existsSync(submission.filePath)) {
      return res.status(404).send('Fichier de copie non trouvé');
    }

    const ext = path.extname(submission.filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    return res.sendFile(path.resolve(submission.filePath));
  } catch (err) {
    console.error('Error serving submission file:', err);
    res.status(500).send('Erreur serveur');
  }
});

// 4b. Download/Stream Teacher's Attached Homework Document (PDF, Image, etc.)
router.get('/:homeworkId/file', auth, async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const homework = await Homework.findByPk(homeworkId);

    if (!homework || !homework.attachmentPath || !fs.existsSync(homework.attachmentPath)) {
      return res.status(404).send('Fichier joint non trouvé');
    }

    const ext = path.extname(homework.attachmentPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    return res.sendFile(path.resolve(homework.attachmentPath));
  } catch (err) {
    console.error('Error serving homework attachment file:', err);
    res.status(500).send('Erreur serveur');
  }
});

// 5. Grade a Student Submission (Teacher)
router.post('/submissions/:submissionId/grade', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    const submission = await HomeworkSubmission.findByPk(submissionId, {
      include: [
        { model: Homework, as: 'homework' },
        { model: User, as: 'student' }
      ]
    });

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvée' });
    }

    submission.score = parseFloat(score);
    submission.feedback = feedback || '';
    submission.status = 'graded';
    await submission.save();

    // Create Notification Alert for Student
    await Alert.create({
      studentId: submission.studentId,
      type: 'info',
      severity: 'info',
      title: 'Devoir Corrigé',
      message: ` VOTRE DEVOIR A ÉTÉ CORRIGÉ ! "${submission.homework.title}" : Note ${submission.score}/${submission.homework.maxScore}`,
      source: 'homework_system'
    }).catch(err => console.error('Alert creation error:', err));

    res.json({
      message: 'Note et correction enregistrées avec succès !',
      submission
    });
  } catch (err) {
    console.error('Error grading submission:', err);
    res.status(500).json({ error: 'Erreur lors de la notation de la copie' });
  }
});

// 6. Get all assigned Homework for Student
router.get('/student', auth, roleAuth('student'), async (req, res) => {
  try {
    const student = req.user;
    const allHomeworks = await Homework.findAll({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: HomeworkSubmission,
          as: 'submissions',
          where: { studentId: student.id },
          required: false
        },
        {
          model: HomeworkComment,
          as: 'comments',
          required: false,
          attributes: ['id']
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    const normalizeGrade = (str) =>
      (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    const studentGradeNorm = normalizeGrade(student.grade || student.gradeLevel);

    const assignedHomeworks = allHomeworks.filter(hw => {
      if (!hw.gradeLevel || hw.gradeLevel === 'Tous les niveaux' || hw.gradeLevel === 'All Grade Levels') return true;
      if (!studentGradeNorm) return true;

      const hwGradeNorm = normalizeGrade(hw.gradeLevel);
      if (studentGradeNorm === hwGradeNorm) return true;
      if (studentGradeNorm.includes('1') && hwGradeNorm.includes('1')) return true;
      if (studentGradeNorm.includes('2') && hwGradeNorm.includes('2')) return true;
      if (studentGradeNorm.includes('tronc') && hwGradeNorm.includes('tronc')) return true;
      return false;
    }).map(hw => {
      const rawSub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
      const isPastDue = new Date() > new Date(hw.dueDate);
      
      let status = 'to_do';
      if (rawSub) {
        status = rawSub.status; // 'submitted', 'late', 'graded'
      } else if (isPastDue) {
        status = 'past_due';
      }

      const mySubmission = rawSub ? {
        ...rawSub.toJSON(),
        fileUrl: formatFileUrl(rawSub.filePath)
      } : null;

      return {
        id: hw.id,
        title: hw.title,
        description: hw.description,
        subject: hw.subject,
        gradeLevel: hw.gradeLevel,
        dueDate: hw.dueDate,
        maxScore: hw.maxScore,
        attachmentPath: hw.attachmentPath,
        attachmentUrl: formatFileUrl(hw.attachmentPath),
        teacherName: hw.teacher ? `${hw.teacher.firstName} ${hw.teacher.lastName}` : 'Professeur',
        teacherAvatar: hw.teacher ? hw.teacher.avatar : null,
        commentsCount: hw.comments ? hw.comments.length : 0,
        mySubmission,
        status,
        isPastDue
      };
    });

    res.json({ homeworks: assignedHomeworks });
  } catch (err) {
    console.error('Error fetching student homeworks:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des devoirs' });
  }
});

// 7. Submit Homework (Student)
router.post('/:homeworkId/submit', auth, roleAuth('student'), upload.single('file'), async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { content } = req.body;

    const homework = await Homework.findByPk(homeworkId);
    if (!homework) {
      return res.status(404).json({ error: 'Devoir non trouvé' });
    }

    let filePath = null;
    if (req.file) {
      filePath = req.file.path;
    }

    if (!content && !filePath) {
      return res.status(400).json({ error: 'Veuillez saisir votre réponse texte ou joindre un fichier (PDF/Doc)' });
    }

    const isPastDue = new Date() > new Date(homework.dueDate);
    const submissionStatus = isPastDue ? 'late' : 'submitted';

    // Find existing submission or create new
    let submission = await HomeworkSubmission.findOne({
      where: { homeworkId, studentId: req.user.id }
    });

    if (submission) {
      submission.content = content || submission.content;
      if (filePath) submission.filePath = filePath;
      submission.submittedAt = new Date();
      submission.status = submissionStatus;
      await submission.save();
    } else {
      submission = await HomeworkSubmission.create({
        homeworkId,
        studentId: req.user.id,
        content: content || '',
        filePath,
        submittedAt: new Date(),
        status: submissionStatus
      });
    }

    // Create Alert notification for Student
    await Alert.create({
      studentId: req.user.id,
      type: 'engagement',
      severity: 'info',
      title: 'Devoir Remis',
      message: ` VOTRE COPIE A ÉTÉ REMISE AVEC SUCCÈS pour "${homework.title}" (${isPastDue ? 'Remis en retard' : 'Remis à temps'})`,
      source: 'homework_system'
    }).catch(err => console.error('Alert error:', err));

    const responseSub = {
      ...submission.toJSON(),
      fileUrl: formatFileUrl(submission.filePath)
    };

    res.json({
      message: isPastDue ? 'Devoir remis (en retard)' : 'Devoir remis avec succès !',
      submission: responseSub
    });
  } catch (err) {
    console.error('Error submitting homework:', err);
    res.status(500).json({ error: 'Erreur lors de la remise du devoir' });
  }
});

// 8. Get comments for a Homework assignment
router.get('/:homeworkId/comments', auth, async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const comments = await HomeworkComment.findAll({
      where: { homeworkId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'role']
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json({ comments });
  } catch (err) {
    console.error('Error fetching homework comments:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
  }
});

// 9. Post a new comment on a Homework assignment
router.post('/:homeworkId/comments', auth, async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
    }

    const homework = await Homework.findByPk(homeworkId);
    if (!homework) {
      return res.status(404).json({ error: 'Devoir non trouvé' });
    }

    const comment = await HomeworkComment.create({
      homeworkId,
      userId: req.user.id,
      content: content.trim()
    });

    const commentWithUser = await HomeworkComment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'role']
        }
      ]
    });

    res.status(201).json({ comment: commentWithUser });
  } catch (err) {
    console.error('Error creating homework comment:', err);
    res.status(500).json({ error: 'Erreur lors de la publication du commentaire' });
  }
});

// 8. Notifications API for Bell Popover (Teacher & Student)
router.get('/notifications', auth, async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      where: { studentId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 25
    });
    res.json({ notifications: alerts });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findOne({ where: { id, studentId: req.user.id } });
    if (alert) {
      alert.isRead = true;
      await alert.save();
    }
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

router.post('/notifications/read-all', auth, async (req, res) => {
  try {
    await Alert.update(
      { isRead: true },
      { where: { studentId: req.user.id, isRead: false } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all notifications read' });
  }
});

// 10. Update Homework assignment (Teacher)
router.put('/:id', auth, roleAuth('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, gradeLevel, title, description, dueDate, maxScore } = req.body;

    const homework = await Homework.findByPk(id);
    if (!homework) {
      return res.status(404).json({ error: 'Devoir non trouvé' });
    }

    if (subject) homework.subject = subject;
    if (gradeLevel) homework.gradeLevel = gradeLevel;
    if (title) homework.title = title;
    if (description) homework.description = description;
    if (dueDate) homework.dueDate = new Date(dueDate);
    if (maxScore) homework.maxScore = parseInt(maxScore);
    if (req.file) homework.attachmentPath = req.file.path;

    await homework.save();

    res.json({ message: 'Devoir mis à jour avec succès !', homework });
  } catch (err) {
    console.error('Error updating homework:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du devoir' });
  }
});

// 11. Delete Homework assignment (Teacher)
router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findByPk(id);
    if (!homework) {
      return res.status(404).json({ error: 'Devoir non trouvé' });
    }

    // Delete associated submissions and comments first
    await HomeworkSubmission.destroy({ where: { homeworkId: id } });
    await HomeworkComment.destroy({ where: { homeworkId: id } });
    await homework.destroy();

    res.json({ message: 'Devoir supprimé avec succès !' });
  } catch (err) {
    console.error('Error deleting homework:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du devoir' });
  }
});

// 12. Duplicate Homework assignment (Teacher)
router.post('/:id/duplicate', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const original = await Homework.findByPk(id);
    if (!original) {
      return res.status(404).json({ error: 'Devoir original non trouvé' });
    }

    // Create a copy with " (Copie)" appended to title
    const copy = await Homework.create({
      teacherId: req.user.id,
      subject: original.subject,
      gradeLevel: original.gradeLevel,
      title: `${original.title} (Copie)`,
      description: original.description,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days from now
      maxScore: original.maxScore,
      attachmentPath: original.attachmentPath
    });

    res.status(201).json({ message: 'Devoir duplicé avec succès !', homework: copy });
  } catch (err) {
    console.error('Error duplicating homework:', err);
    res.status(500).json({ error: 'Erreur lors de la duplication du devoir' });
  }
});

module.exports = router;

