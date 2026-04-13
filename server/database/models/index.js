const sequelize = require('../../config/database');

// Import models
const User = require('./User');
const TutoringSession = require('./TutoringSession');
const PFSM = require('./PFSM');
const Attendance = require('./Attendance');
const CourseDocument = require('./CourseDocument');
const RLReward = require('./RLReward');
const ParentStudent = require('./ParentStudent');
const Alert = require('./Alert');
const Classroom = require('./Classroom');
const StudentClassroom = require('./StudentClassroom');
const TeacherClassroom = require('./TeacherClassroom');

// Define associations
User.hasMany(TutoringSession, { foreignKey: 'studentId', as: 'sessions' });
TutoringSession.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasOne(PFSM, { foreignKey: 'studentId', as: 'pfsmState' });
PFSM.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendance' });
Attendance.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(CourseDocument, { foreignKey: 'teacherId', as: 'documents' });
CourseDocument.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

TutoringSession.hasOne(RLReward, { foreignKey: 'sessionId', as: 'reward' });
RLReward.belongsTo(TutoringSession, { foreignKey: 'sessionId', as: 'session' });

User.hasMany(RLReward, { foreignKey: 'studentId', as: 'rewards' });
RLReward.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(Alert, { foreignKey: 'studentId', as: 'alerts' });
Alert.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Parent-Student relationships (many-to-many)
User.belongsToMany(User, {
  through: ParentStudent,
  as: 'children',
  foreignKey: 'parentId',
  otherKey: 'studentId'
});

User.belongsToMany(User, {
  through: ParentStudent,
  as: 'parents',
  foreignKey: 'studentId',
  otherKey: 'parentId'
});

// Classroom associations - keep teacherId for backward compatibility (primary teacher)
Classroom.belongsTo(User, { foreignKey: 'teacherId', as: 'primaryTeacher' });
User.hasMany(Classroom, { foreignKey: 'teacherId', as: 'primaryClassrooms' });

// Teacher-Classroom associations (many-to-many) - supports multiple teachers per classroom
User.belongsToMany(Classroom, {
  through: TeacherClassroom,
  as: 'classrooms',
  foreignKey: 'teacherId'
});

Classroom.belongsToMany(User, {
  through: TeacherClassroom,
  as: 'teachers',
  foreignKey: 'classroomId'
});

// Student-Classroom associations (many-to-many)
User.belongsToMany(Classroom, {
  through: StudentClassroom,
  as: 'enrolledClassrooms',
  foreignKey: 'studentId'
});

Classroom.belongsToMany(User, {
  through: StudentClassroom,
  as: 'students',
  foreignKey: 'classroomId'
});

module.exports = {
  sequelize,
  User,
  TutoringSession,
  PFSM,
  Attendance,
  CourseDocument,
  RLReward,
  ParentStudent,
  Alert,
  Classroom,
  StudentClassroom,
  TeacherClassroom
};

