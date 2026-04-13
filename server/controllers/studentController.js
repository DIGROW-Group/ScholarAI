const { PFSM, TutoringSession, Alert, Classroom, StudentClassroom, User } = require('../database/models');
const { Op } = require('sequelize');
const GeofencingAgent = require('../agents/GeofencingAgent');
const OrientationAgent = require('../agents/OrientationAgent');

exports.getProgress = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student's available subjects based on classroom
    const availableSubjects = await this.getStudentAvailableSubjects(studentId);

    const pfsm = await PFSM.findOne({ where: { studentId } });

    if (!pfsm) {
      return res.json({
        masteryLevels: {},
        strengths: [],
        weaknesses: [],
        performanceMetrics: {},
        orientationFlags: [],
        availableSubjects
      });
    }

    // Filter mastery levels to only show available subjects
    const filteredMastery = {};
    availableSubjects.forEach(subject => {
      if (pfsm.masteryLevels && pfsm.masteryLevels[subject]) {
        filteredMastery[subject] = pfsm.masteryLevels[subject];
      }
    });

    res.json({
      masteryLevels: filteredMastery,
      strengths: pfsm.strengths || [],
      weaknesses: pfsm.weaknesses || [],
      performanceMetrics: pfsm.performanceMetrics || {},
      learningStyle: pfsm.learningStyle,
      orientationFlags: pfsm.orientationFlags || [],
      recommendedFocus: pfsm.recommendedFocus,
      availableSubjects
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

exports.getStudentAvailableSubjects = async (studentId) => {
  try {
    // Get student's classrooms
    const student = await User.findByPk(studentId, {
      include: [{
        model: Classroom,
        as: 'enrolledClassrooms',
        through: { attributes: [] },
        attributes: ['subjects']
      }]
    });

    if (!student || !student.enrolledClassrooms || student.enrolledClassrooms.length === 0) {
      // No classroom assigned - return all subjects (backward compatibility)
      return ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
    }

    // Collect all subjects from all classrooms
    const allSubjects = new Set();
    student.enrolledClassrooms.forEach(classroom => {
      if (classroom.subjects) {
        classroom.subjects.forEach(subject => allSubjects.add(subject));
      }
    });

    return Array.from(allSubjects);
  } catch (error) {
    console.error('Error getting available subjects:', error);
    return ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
  }
};

exports.getOrientationSuggestions = async (req, res) => {
  try {
    const studentId = req.user.id;

    const recommendations = await OrientationAgent.analyzeStudent(studentId);

    res.json({
      recommendations: recommendations.recommendations,
      analysis: {
        engagement: recommendations.analysis.engagement,
        performance: {
          successRate: recommendations.analysis.performance.successRate,
          strengths: recommendations.analysis.performance.strengths,
          weaknesses: recommendations.analysis.performance.weaknesses
        },
        flags: recommendations.analysis.flags
      },
      generatedAt: recommendations.generatedAt
    });
  } catch (error) {
    console.error('Get orientation suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { time, location } = req.body;

    const attendance = await GeofencingAgent.checkIn(studentId, time, location);

    res.json({
      message: 'Checked in successfully',
      attendance: {
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        anomalies: attendance.anomalies
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { time } = req.body;

    const attendance = await GeofencingAgent.checkOut(studentId, time);

    res.json({
      message: 'Checked out successfully',
      attendance: {
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: error.message || 'Failed to check out' });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { days = 30 } = req.query;

    const stats = await GeofencingAgent.getAttendanceStats(studentId, parseInt(days));

    res.json({ attendance: stats });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const studentId = req.user.id;

    const alerts = await Alert.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

exports.markAlertRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const studentId = req.user.id;

    const alert = await Alert.findOne({
      where: { id: alertId, studentId }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update({ isRead: true });

    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
};

