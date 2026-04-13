const { User, PFSM, TutoringSession, Attendance, Alert, ParentStudent } = require('../database/models');
const { Op } = require('sequelize');
const GeofencingAgent = require('../agents/GeofencingAgent');

exports.getChildren = async (req, res) => {
  try {
    const parentId = req.user.id;

    const children = await User.findAll({
      include: [
        {
          model: User,
          as: 'parents',
          where: { id: parentId },
          through: { attributes: [] }
        }
      ],
      attributes: ['id', 'firstName', 'lastName', 'email', 'grade']
    });

    res.json({ children });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
};

exports.getChildOverview = async (req, res) => {
  try {
    const { studentId } = req.params;
    const parentId = req.user.id;

    // Verify parent-child relationship
    const relationship = await ParentStudent.findOne({
      where: { parentId, studentId }
    });

    if (!relationship) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get student info
    const student = await User.findByPk(studentId, {
      attributes: ['id', 'firstName', 'lastName', 'grade']
    });

    // Get PFSM state
    const pfsm = await PFSM.findOne({
      where: { studentId },
      attributes: ['masteryLevels', 'performanceMetrics', 'strengths', 'weaknesses', 'orientationFlags']
    });

    // Get recent sessions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = await TutoringSession.findAll({
      where: {
        studentId,
        createdAt: { [Op.gte]: sevenDaysAgo }
      },
      attributes: ['subject', 'outcome', 'duration', 'studentRating', 'createdAt']
    });

    // Calculate engagement metrics
    const totalDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgRating = recentSessions.length > 0
      ? recentSessions.filter(s => s.studentRating).reduce((sum, s) => sum + s.studentRating, 0) / recentSessions.filter(s => s.studentRating).length
      : 0;

    // Get attendance stats
    const attendanceStats = await GeofencingAgent.getAttendanceStats(studentId, 30);

    res.json({
      student,
      performance: {
        masteryLevels: pfsm?.masteryLevels || {},
        metrics: pfsm?.performanceMetrics || {},
        strengths: pfsm?.strengths || [],
        weaknesses: pfsm?.weaknesses || []
      },
      engagement: {
        sessionsThisWeek: recentSessions.length,
        totalTimeThisWeek: Math.floor(totalDuration / 60), // minutes
        tutorSatisfaction: avgRating > 0 ? (avgRating / 5 * 100).toFixed(0) : 'N/A'
      },
      attendance: attendanceStats,
      orientationFlags: pfsm?.orientationFlags || []
    });
  } catch (error) {
    console.error('Get child overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
};

exports.getChildAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const parentId = req.user.id;
    const { days = 30 } = req.query;

    // Verify relationship
    const relationship = await ParentStudent.findOne({
      where: { parentId, studentId }
    });

    if (!relationship) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    
    const attendance = await Attendance.findAll({
      where: {
        studentId,
        date: { [Op.gte]: startDate }
      },
      order: [['date', 'DESC']]
    });

    const stats = await GeofencingAgent.getAttendanceStats(studentId, parseInt(days));

    res.json({
      attendance,
      stats
    });
  } catch (error) {
    console.error('Get child attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getChildAlerts = async (req, res) => {
  try {
    const { studentId } = req.params;
    const parentId = req.user.id;

    // Verify relationship
    const relationship = await ParentStudent.findOne({
      where: { parentId, studentId }
    });

    if (!relationship) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const alerts = await Alert.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Mark alerts as read by this parent
    const unreadAlerts = alerts.filter(a => !a.readBy.includes(parentId));
    for (const alert of unreadAlerts) {
      const readBy = [...alert.readBy, parentId];
      await alert.update({ readBy, isRead: true });
    }

    res.json({ alerts });
  } catch (error) {
    console.error('Get child alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

exports.linkChild = async (req, res) => {
  try {
    const { studentEmail } = req.body;
    const parentId = req.user.id;

    const student = await User.findOne({
      where: { email: studentEmail, role: 'student' }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if already linked
    const existing = await ParentStudent.findOne({
      where: { parentId, studentId: student.id }
    });

    if (existing) {
      return res.status(400).json({ error: 'Student already linked' });
    }

    await ParentStudent.create({
      parentId,
      studentId: student.id
    });

    res.json({
      message: 'Child linked successfully',
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade
      }
    });
  } catch (error) {
    console.error('Link child error:', error);
    res.status(500).json({ error: 'Failed to link child' });
  }
};

