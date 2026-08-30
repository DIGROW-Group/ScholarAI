const { Attendance, Alert, PFSM } = require('../database/models');
const { Op } = require('sequelize');
require('dotenv').config();

class GeofencingAgent {
  constructor() {
    this.schoolStartTime = process.env.SCHOOL_START_TIME || '08:00';
    this.schoolEndTime = process.env.SCHOOL_END_TIME || '15:30';
    this.lateThresholdMinutes = parseInt(process.env.LATE_THRESHOLD_MINUTES) || 10;
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatMinutes(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}min` : `${hrs}h`;
  }

  async checkIn(studentId, time = null, location = 'School') {
    try {
      const checkInTime = time || new Date().toTimeString().split(' ')[0].substring(0, 5);
      const today = new Date().toISOString().split('T')[0];

      // Find or create attendance record for today
      let attendance = await Attendance.findOne({
        where: { studentId, date: today }
      });

      if (!attendance) {
        attendance = await Attendance.create({
          studentId,
          date: today,
          checkInTime,
          location,
          status: 'present'
        });
      } else {
        await attendance.update({ checkInTime, location });
      }

      // Check for late arrival (only for realistic school arrival window <= 3 hours late)
      const checkInMinutes = this.parseTime(checkInTime);
      const schoolStartMinutes = this.parseTime(this.schoolStartTime);
      const lateBy = checkInMinutes - schoolStartMinutes;

      const anomalies = [];

      if (lateBy > this.lateThresholdMinutes && lateBy <= 180) {
        const formattedDelay = this.formatMinutes(lateBy);
        attendance.status = 'late';
        anomalies.push({
          type: 'late_arrival',
          description: `Arrivé(e) avec ${formattedDelay} de retard sur l'horaire de cours`,
          flaggedAt: new Date()
        });

        // Create alert for late arrival
        await this.createAttendanceAlert(studentId, 'warning', 'Retard Signalé', 
          `Élève enregistré(e) avec ${formattedDelay} de retard à ${checkInTime}`);
      }

      if (anomalies.length > 0) {
        await attendance.update({ 
          anomalies: [...(attendance.anomalies || []), ...anomalies],
          status: attendance.status
        });
      }

      // Check for pattern of tardiness
      await this.checkTardinessPattern(studentId);

      return attendance;
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  }

  async checkOut(studentId, time = null) {
    try {
      const checkOutTime = time || new Date().toTimeString().split(' ')[0].substring(0, 5);
      const today = new Date().toISOString().split('T')[0];

      const attendance = await Attendance.findOne({
        where: { studentId, date: today }
      });

      if (!attendance) {
        throw new Error('No check-in found for today. Please check in first.');
      }

      await attendance.update({ checkOutTime });

      // Check for early departure (only for realistic early departure window <= 3 hours early)
      const checkOutMinutes = this.parseTime(checkOutTime);
      const schoolEndMinutes = this.parseTime(this.schoolEndTime);
      const earlyBy = schoolEndMinutes - checkOutMinutes;

      if (earlyBy > 30 && earlyBy <= 180) { // Between 30m and 3h early
        const formattedEarly = this.formatMinutes(earlyBy);
        const anomalies = attendance.anomalies || [];
        anomalies.push({
          type: 'early_departure',
          description: `Départ anticipé de ${formattedEarly} avant la fin des cours`,
          flaggedAt: new Date()
        });

        await attendance.update({ 
          anomalies,
          status: 'early_departure'
        });

        await this.createAttendanceAlert(studentId, 'info', 'Départ Anticipé',
          `Élève sorti(e) ${formattedEarly} avant l'horaire habituel (${checkOutTime})`);
      }

      return attendance;
    } catch (error) {
      console.error('Check-out error:', error);
      throw error;
    }
  }

  async checkTardinessPattern(studentId) {
    try {
      // Check last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentAttendance = await Attendance.findAll({
        where: {
          studentId,
          date: { [Op.gte]: sevenDaysAgo }
        }
      });

      const lateDays = recentAttendance.filter(a => a.status === 'late').length;
      const absentDays = recentAttendance.filter(a => a.status === 'absent').length;

      // Alert if late more than 3 times in a week
      if (lateDays >= 3) {
        await this.createAttendanceAlert(studentId, 'warning', 'Frequent Tardiness',
          `Student has been late ${lateDays} times in the past week`);
        
        // Update PFSM
        await this.updatePFSMAttendance(studentId, true);
      }

      // Critical alert if absent more than 2 days
      if (absentDays >= 2) {
        await this.createAttendanceAlert(studentId, 'critical', 'Multiple Absences',
          `Student has been absent ${absentDays} times in the past week`);
        
        await this.updatePFSMAttendance(studentId, true);
      }
    } catch (error) {
      console.error('Tardiness pattern check error:', error);
    }
  }

  async monitorDailyAbsences() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cutoffTime = new Date();
      cutoffTime.setHours(9, 0, 0, 0); // 9:00 AM cutoff

      if (new Date() < cutoffTime) {
        return; // Too early to check
      }

      // Find all students who haven't checked in today
      const { User } = require('../database/models');
      const allStudents = await User.findAll({
        where: { role: 'student' }
      });

      for (const student of allStudents) {
        const attendance = await Attendance.findOne({
          where: { studentId: student.id, date: today }
        });

        if (!attendance || !attendance.checkInTime) {
          // Mark as absent
          await Attendance.create({
            studentId: student.id,
            date: today,
            status: 'absent'
          });

          await this.createAttendanceAlert(student.id, 'warning', 'Absence Detected',
            `No check-in recorded for ${today}`);
        }
      }
    } catch (error) {
      console.error('Daily absence monitoring error:', error);
    }
  }

  async createAttendanceAlert(studentId, severity, title, message) {
    try {
      await Alert.create({
        studentId,
        type: 'attendance',
        severity,
        title,
        message,
        source: 'geofencing_agent'
      });
    } catch (error) {
      console.error('Alert creation error:', error);
    }
  }

  async updatePFSMAttendance(studentId, hasIssues) {
    try {
      const pfsm = await PFSM.findOne({ where: { studentId } });
      if (pfsm) {
        await pfsm.update({
          attendanceIssues: hasIssues,
          lastUpdatedBy: 'geofencing_agent',
          version: pfsm.version + 1
        });
      }
    } catch (error) {
      console.error('PFSM attendance update error:', error);
    }
  }

  async getAttendanceStats(studentId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const attendance = await Attendance.findAll({
        where: {
          studentId,
          date: { [Op.gte]: startDate }
        },
        order: [['date', 'DESC']]
      });

      const stats = {
        totalDays: attendance.length,
        presentDays: attendance.filter(a => a.status === 'present').length,
        lateDays: attendance.filter(a => a.status === 'late').length,
        absentDays: attendance.filter(a => a.status === 'absent').length,
        earlyDepartures: attendance.filter(a => a.status === 'early_departure').length,
        attendanceRate: 0,
        anomalies: []
      };

      if (stats.totalDays > 0) {
        stats.attendanceRate = (stats.presentDays + stats.lateDays) / stats.totalDays;
      }

      // Collect all anomalies
      attendance.forEach(a => {
        if (a.anomalies && a.anomalies.length > 0) {
          stats.anomalies.push(...a.anomalies.map(an => ({
            ...an,
            date: a.date
          })));
        }
      });

      return stats;
    } catch (error) {
      console.error('Attendance stats error:', error);
      throw error;
    }
  }
}

module.exports = new GeofencingAgent();

