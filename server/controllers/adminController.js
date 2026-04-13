const { User, Classroom, StudentClassroom } = require('../database/models');
const { Op } = require('sequelize');

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'subjects', 'createdAt'],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    res.json({ teachers });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};

exports.updateTeacherSubjects = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { subjects } = req.body;

    const teacher = await User.findOne({
      where: { id: teacherId, role: 'teacher' }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Validate subjects
    const validSubjects = ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
    const invalidSubjects = subjects.filter(s => !validSubjects.includes(s));
    
    if (invalidSubjects.length > 0) {
      return res.status(400).json({ error: 'Invalid subjects provided' });
    }

    await teacher.update({ subjects });

    res.json({
      message: 'Teacher subjects updated successfully',
      teacher: {
        id: teacher.id,
        email: teacher.email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        subjects: teacher.subjects
      }
    });
  } catch (error) {
    console.error('Update teacher subjects error:', error);
    res.status(500).json({ error: 'Failed to update teacher subjects' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'grade', 'subjects', 'createdAt'],
      order: [['role', 'ASC'], ['lastName', 'ASC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Classroom Management
exports.createClassroom = async (req, res) => {
  try {
    const { name, grade, teacherId, academicYear, description } = req.body;

    // Get teacher to inherit subjects
    const teacher = await User.findOne({
      where: { id: teacherId, role: 'teacher' }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const classroom = await Classroom.create({
      name,
      grade,
      teacherId,
      subjects: teacher.subjects || [],
      academicYear,
      description
    });

    res.status(201).json({
      message: 'Classroom created successfully',
      classroom
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ error: 'Failed to create classroom' });
  }
};

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

exports.addStudentToClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { studentId } = req.body;

    // Verify student exists
    const student = await User.findOne({
      where: { id: studentId, role: 'student' }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify classroom exists
    const classroom = await Classroom.findByPk(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    // Check if already enrolled
    const existing = await StudentClassroom.findOne({
      where: { studentId, classroomId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Student already in this classroom' });
    }

    await StudentClassroom.create({ studentId, classroomId });

    res.json({ message: 'Student added to classroom successfully' });
  } catch (error) {
    console.error('Add student to classroom error:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
};

exports.removeStudentFromClassroom = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;

    await StudentClassroom.destroy({
      where: { studentId, classroomId }
    });

    res.json({ message: 'Student removed from classroom' });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Failed to remove student' });
  }
};

exports.getStudentsNotInClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;

    // Get all students in this classroom
    const classroom = await Classroom.findByPk(classroomId, {
      include: [{
        model: User,
        as: 'students',
        through: { attributes: [] },
        attributes: ['id']
      }]
    });

    const enrolledIds = classroom?.students?.map(s => s.id) || [];

    // Get students not in this classroom
    const availableStudents = await User.findAll({
      where: {
        role: 'student',
        id: { [Op.notIn]: enrolledIds.length > 0 ? enrolledIds : ['00000000-0000-0000-0000-000000000000'] }
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'grade'],
      order: [['lastName', 'ASC']]
    });

    res.json({ students: availableStudents });
  } catch (error) {
    console.error('Get available students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

