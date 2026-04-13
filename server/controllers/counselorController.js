const { User, PFSM, TutoringSession, Attendance, Alert, Classroom } = require('../database/models');
const OrientationAgent = require('../agents/OrientationAgent');
const { Op } = require('sequelize');

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'grade', 'createdAt'],
      order: [['lastName', 'ASC']]
    });
    res.json({ students });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Get student details with PFSM data
exports.getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findByPk(studentId, {
      where: { role: 'student' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'grade', 'createdAt']
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get PFSM data
    const pfsm = await PFSM.findOne({ where: { studentId } });

    // Get recent sessions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSessions = await TutoringSession.findAll({
      where: {
        studentId,
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Get attendance records (last 30 days)
    const recentAttendance = await Attendance.findAll({
      where: {
        studentId,
        date: { [Op.gte]: thirtyDaysAgo }
      },
      order: [['date', 'DESC']]
    });

    // Get orientation-related alerts
    const orientationAlerts = await Alert.findAll({
      where: {
        studentId,
        [Op.or]: [
          { type: 'orientation' },
          { source: 'orientation_agent' }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Only return human-readable summary, not raw PFSM data
    const studentSummary = {
      student,
      // Only orientation-related data that's human-readable
      orientationFlags: pfsm?.orientationFlags || [],
      orientationAlerts,
      // Human-readable interpretations (already processed by agents)
      strengths: pfsm?.strengths || [],
      weaknesses: pfsm?.weaknesses || [],
      learningStyle: pfsm?.learningStyle || null,
      attendanceIssues: pfsm?.attendanceIssues || false,
      recommendedFocus: pfsm?.recommendedFocus || null,
      // Session and attendance counts (not raw PFSM metrics)
      sessionCount: recentSessions.length,
      attendanceRecords: recentAttendance.length,
      recentSessions: recentSessions.slice(0, 5), // Only show last 5 sessions
      recentAttendance: recentAttendance.slice(0, 10) // Only show last 10 attendance records
    };

    res.json(studentSummary);
  } catch (error) {
    console.error('Get student details error:', error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
};

// Get orientation agent data for a student
exports.getOrientationData = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get PFSM with orientation flags
    const pfsm = await PFSM.findOne({ where: { studentId } });

    // Get all orientation alerts
    const alerts = await Alert.findAll({
      where: {
        studentId,
        [Op.or]: [
          { type: 'orientation' },
          { source: 'orientation_agent' }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    // Only return orientation agent outputs, not raw PFSM data
    res.json({
      orientationFlags: pfsm?.orientationFlags || [],
      alerts,
      // Only human-readable interpretations from orientation agent
      studentSummary: pfsm ? {
        strengths: pfsm.strengths || [],
        weaknesses: pfsm.weaknesses || [],
        learningStyle: pfsm.learningStyle || null,
        attendanceIssues: pfsm.attendanceIssues || false,
        recommendedFocus: pfsm.recommendedFocus || null
      } : null
    });
  } catch (error) {
    console.error('Get orientation data error:', error);
    res.status(500).json({ error: 'Failed to fetch orientation data' });
  }
};

// Trigger orientation agent analysis for a student
exports.triggerOrientationAnalysis = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Run orientation agent analysis
    const recommendations = await OrientationAgent.analyzeStudent(studentId);

    res.json({
      message: 'Orientation analysis completed',
      recommendations
    });
  } catch (error) {
    console.error('Trigger orientation analysis error:', error);
    res.status(500).json({ error: 'Failed to trigger orientation analysis' });
  }
};

// Get student sessions for a specific subject
exports.getStudentSessions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject } = req.query;

    const whereClause = { studentId };
    if (subject) {
      whereClause.subject = subject;
    }

    const sessions = await TutoringSession.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get student sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

// Get student attendance records
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    const whereClause = { studentId };
    if (startDate) {
      whereClause.date = { [Op.gte]: startDate };
    }
    if (endDate) {
      whereClause.date = {
        ...whereClause.date,
        [Op.lte]: endDate
      };
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });

    res.json({ attendance });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// Get all orientation alerts across all students
exports.getAllOrientationAlerts = async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      where: {
        [Op.or]: [
          { type: 'orientation' },
          { source: 'orientation_agent' }
        ]
      },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'firstName', 'lastName', 'grade', 'email'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({ alerts });
  } catch (error) {
    console.error('Get all orientation alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

// Get all classrooms with their students
exports.getClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'teachers',
          through: { attributes: [] },
          attributes: ['id', 'firstName', 'lastName', 'email', 'subjects'],
          required: false
        },
        {
          model: User,
          as: 'students',
          through: { attributes: [] },
          attributes: ['id', 'firstName', 'lastName', 'email', 'grade'],
          required: false
        }
      ],
      order: [['grade', 'ASC'], ['name', 'ASC']]
    });

    res.json({ classrooms });
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
};

// Run orientation analysis for all students
exports.runAnalysisForAllStudents = async (req, res) => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'email', 'firstName', 'lastName']
    });

    if (students.length === 0) {
      return res.json({
        message: 'No students found',
        processed: 0,
        failed: 0
      });
    }

    let processed = 0;
    let failed = 0;
    const errors = [];

    // Process students in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (student) => {
          try {
            await OrientationAgent.analyzeStudent(student.id);
            processed++;
            console.log(`✓ Analysis completed for ${student.firstName} ${student.lastName}`);
          } catch (error) {
            failed++;
            errors.push({
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              error: error.message
            });
            console.error(`✗ Analysis failed for ${student.firstName} ${student.lastName}:`, error.message);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < students.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({
      message: 'Bulk analysis completed',
      total: students.length,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Run analysis for all students error:', error);
    res.status(500).json({ error: 'Failed to run bulk analysis' });
  }
};

