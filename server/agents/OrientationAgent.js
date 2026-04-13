const ClaudeService = require('../services/ClaudeService');
const { PFSM, TutoringSession, Attendance, Alert, User } = require('../database/models');
const { Op } = require('sequelize');

class OrientationAgent {
  constructor() {
    this.analysisInterval = 7 * 24 * 60 * 60 * 1000; // Weekly analysis
  }

  async analyzeStudent(studentId) {
    try {
      // Gather comprehensive student data
      const student = await User.findByPk(studentId);
      const pfsm = await PFSM.findOne({ where: { studentId } });
      
      // Get recent sessions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentSessions = await TutoringSession.findAll({
        where: {
          studentId,
          createdAt: { [Op.gte]: thirtyDaysAgo }
        },
        order: [['createdAt', 'DESC']]
      });

      // Get attendance records (last 30 days)
      const recentAttendance = await Attendance.findAll({
        where: {
          studentId,
          date: { [Op.gte]: thirtyDaysAgo }
        },
        order: [['date', 'DESC']]
      });

      // Analyze patterns
      const analysis = this.performAnalysis(student, pfsm, recentSessions, recentAttendance);

      // Generate recommendations using Claude
      const recommendations = await this.generateRecommendations(analysis);

      // Update PFSM with orientation flags
      await this.updatePFSMFlags(studentId, recommendations);

      // Create alerts if needed
      await this.createAlerts(studentId, recommendations);

      return recommendations;
    } catch (error) {
      console.error('Orientation agent error:', error);
      throw error;
    }
  }

  performAnalysis(student, pfsm, sessions, attendance) {
    const analysis = {
      student: {
        name: `${student.firstName} ${student.lastName}`,
        grade: student.grade
      },
      engagement: {},
      performance: {},
      attendance: {},
      flags: []
    };

    // Engagement analysis
    analysis.engagement.totalSessions = sessions.length;
    analysis.engagement.avgSessionsPerWeek = sessions.length / 4; // Assuming 4 weeks
    
    const subjectDistribution = {};
    sessions.forEach(s => {
      subjectDistribution[s.subject] = (subjectDistribution[s.subject] || 0) + 1;
    });
    analysis.engagement.subjectDistribution = subjectDistribution;

    // Performance analysis
    if (pfsm) {
      analysis.performance.masteryLevels = pfsm.masteryLevels || {};
      analysis.performance.strengths = pfsm.strengths || [];
      analysis.performance.weaknesses = pfsm.weaknesses || [];
      analysis.performance.misconceptions = pfsm.misconceptions || [];
      analysis.performance.learningStyle = pfsm.learningStyle;
    }

    // Calculate success rate
    const solvedSessions = sessions.filter(s => s.outcome === 'solved').length;
    analysis.performance.successRate = sessions.length > 0 ? solvedSessions / sessions.length : 0;

    // Attendance analysis
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;

    analysis.attendance.presentDays = presentDays;
    analysis.attendance.lateDays = lateDays;
    analysis.attendance.absentDays = absentDays;
    analysis.attendance.attendanceRate = attendance.length > 0 ? presentDays / attendance.length : 1.0;

    // Identify flags
    if (analysis.engagement.avgSessionsPerWeek < 1) {
      analysis.flags.push({ type: 'low_engagement', severity: 'warning' });
    }
    if (analysis.performance.successRate < 0.5 && sessions.length > 5) {
      analysis.flags.push({ type: 'low_performance', severity: 'warning' });
    }
    if (analysis.attendance.attendanceRate < 0.8) {
      analysis.flags.push({ type: 'attendance_issues', severity: 'critical' });
    }
    if (lateDays > 3) {
      analysis.flags.push({ type: 'frequent_tardiness', severity: 'info' });
    }

    // Check for stagnation (no improvement in mastery over time)
    if (pfsm?.recentInteractions?.length > 10) {
      const recent = pfsm.recentInteractions.slice(0, 5);
      const older = pfsm.recentInteractions.slice(-5);
      
      const recentAvg = recent.reduce((sum, i) => sum + (i.outcome === 'solved' ? 1 : 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, i) => sum + (i.outcome === 'solved' ? 1 : 0), 0) / older.length;
      
      if (Math.abs(recentAvg - olderAvg) < 0.1) {
        analysis.flags.push({ type: 'stagnation', severity: 'info' });
      }
    }

    return analysis;
  }

  async generateRecommendations(analysis) {
    const systemPrompt = `You are an educational counselor AI providing personalized guidance to students. Based on comprehensive student data, generate actionable recommendations for:
1. Study strategies and learning approaches
2. Resource suggestions (clubs, activities, extra practice)
3. Areas of focus for improvement
4. Encouragement and motivation

Be supportive, specific, and constructive. Keep recommendations brief (2-3 sentences each).`;

    const userPrompt = `
Student Profile:
- Name: ${analysis.student.name}
- Grade: ${analysis.student.grade}

Engagement:
- Sessions per week: ${analysis.engagement.avgSessionsPerWeek.toFixed(1)}
- Subject distribution: ${JSON.stringify(analysis.engagement.subjectDistribution)}

Performance:
- Success rate: ${(analysis.performance.successRate * 100).toFixed(0)}%
- Strengths: ${analysis.performance.strengths.join(', ') || 'To be determined'}
- Weaknesses: ${analysis.performance.weaknesses.join(', ') || 'None identified'}
- Learning style: ${analysis.performance.learningStyle || 'Unknown'}

Attendance:
- Attendance rate: ${(analysis.attendance.attendanceRate * 100).toFixed(0)}%
- Late days: ${analysis.attendance.lateDays}
- Absent days: ${analysis.attendance.absentDays}

Flags: ${analysis.flags.map(f => f.type).join(', ') || 'None'}

Generate 3-5 personalized recommendations for this student.`;

    try {
      const response = await ClaudeService.generateResponse(systemPrompt, [
        { role: 'user', content: userPrompt }
      ]);

      return {
        analysis,
        recommendations: response.content,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Recommendation generation error:', error);
      
      // Fallback to rule-based recommendations
      return {
        analysis,
        recommendations: this.getFallbackRecommendations(analysis),
        generatedAt: new Date()
      };
    }
  }

  getFallbackRecommendations(analysis) {
    const recommendations = [];

    if (analysis.flags.some(f => f.type === 'low_engagement')) {
      recommendations.push('Try to engage with the AI tutor at least 2-3 times per week to stay on track with your learning.');
    }

    if (analysis.flags.some(f => f.type === 'low_performance')) {
      recommendations.push('Consider reviewing fundamental concepts and don\'t hesitate to ask for more scaffolding from your tutor.');
    }

    if (analysis.flags.some(f => f.type === 'attendance_issues')) {
      recommendations.push('Regular attendance is crucial for academic success. Please speak with your teacher if you\'re facing challenges.');
    }

    if (analysis.performance.learningStyle === 'visual') {
      recommendations.push('As a visual learner, try drawing diagrams and using visual aids when studying.');
    }

    if (analysis.performance.successRate > 0.8) {
      recommendations.push('You\'re doing great! Consider challenging yourself with more advanced problems to continue growing.');
    }

    return recommendations.join('\n\n');
  }

  async updatePFSMFlags(studentId, recommendations) {
    try {
      const pfsm = await PFSM.findOne({ where: { studentId } });
      if (!pfsm) return;

      const orientationFlags = recommendations.analysis.flags.map(flag => ({
        type: flag.type,
        severity: flag.severity,
        detectedAt: new Date(),
        recommendations: recommendations.recommendations
      }));

      await pfsm.update({
        orientationFlags,
        attendanceIssues: recommendations.analysis.flags.some(f => 
          f.type === 'attendance_issues' || f.type === 'frequent_tardiness'
        ),
        lastUpdatedBy: 'orientation_agent',
        version: pfsm.version + 1
      });
    } catch (error) {
      console.error('PFSM flags update error:', error);
    }
  }

  async createAlerts(studentId, recommendations) {
    try {
      const criticalFlags = recommendations.analysis.flags.filter(f => f.severity === 'critical');
      const warningFlags = recommendations.analysis.flags.filter(f => f.severity === 'warning');

      for (const flag of criticalFlags) {
        await Alert.create({
          studentId,
          type: 'orientation',
          severity: 'critical',
          title: this.getFlagTitle(flag.type),
          message: this.getFlagMessage(flag.type, recommendations.analysis),
          source: 'orientation_agent'
        });
      }

      for (const flag of warningFlags) {
        await Alert.create({
          studentId,
          type: 'orientation',
          severity: 'warning',
          title: this.getFlagTitle(flag.type),
          message: this.getFlagMessage(flag.type, recommendations.analysis),
          source: 'orientation_agent'
        });
      }
    } catch (error) {
      console.error('Alert creation error:', error);
    }
  }

  getFlagTitle(flagType) {
    const titles = {
      low_engagement: 'Low Engagement Detected',
      low_performance: 'Academic Performance Needs Attention',
      attendance_issues: 'Attendance Concerns',
      frequent_tardiness: 'Frequent Late Arrivals',
      stagnation: 'Learning Progress Plateau'
    };
    return titles[flagType] || 'Orientation Update';
  }

  getFlagMessage(flagType, analysis) {
    const messages = {
      low_engagement: `You've had only ${analysis.engagement.avgSessionsPerWeek.toFixed(1)} sessions per week. Regular engagement helps maintain progress.`,
      low_performance: `Your success rate is ${(analysis.performance.successRate * 100).toFixed(0)}%. Consider reviewing fundamentals and asking for help.`,
      attendance_issues: `Your attendance rate is ${(analysis.attendance.attendanceRate * 100).toFixed(0)}%. Regular attendance is essential for success.`,
      frequent_tardiness: `You've been late ${analysis.attendance.lateDays} times recently. Punctuality helps you stay on track.`,
      stagnation: 'Your learning progress has plateaued. Try different study strategies or speak with your teacher.'
    };
    return messages[flagType] || 'Please review your learning approach.';
  }
}

module.exports = new OrientationAgent();

