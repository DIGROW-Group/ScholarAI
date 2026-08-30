const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { User, PFSM, ParentStudent, CourseDocument, Attendance, Classroom, StudentClassroom, TeacherClassroom } = require('../models');

const sequelize = require('../../config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Syncing database and seeding sample data...\n');
    await sequelize.sync({ alter: true });

    // Check if admin exists, create if not
    let admin = await User.findOne({ where: { email: 'admin@school.ma' } });
    if (!admin) {
      admin = await User.create({
        email: 'admin@school.ma',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'Admin',
        role: 'admin',
      });
      console.log('✓ Created admin:', admin.email);
    } else {
      console.log('✓ Admin already exists:', admin.email);
    }

    // Check if old teacher exists and migrate/delete it
    const oldTeacher = await User.findOne({ where: { email: 'teacher@school.ma' } });
    if (oldTeacher) {
      console.log('⚠ Found old teacher record (teacher@school.ma), removing it...');
      await oldTeacher.destroy();
      console.log('✓ Removed old teacher record');
    }

    // Check if teacher1 (Math teacher) exists, create if not
    let teacher1 = await User.findOne({ where: { email: 'teacher1@school.ma' } });
    if (!teacher1) {
      teacher1 = await User.create({
        email: 'teacher1@school.ma',
        password: 'password123',
        firstName: 'Mohammed',
        lastName: 'Benali',
        role: 'teacher',
        subjects: ['math'],
      });
      console.log('✓ Created teacher1:', teacher1.email, '- Subject: Math');
    } else {
      console.log('✓ Teacher1 already exists:', teacher1.email);
    }

    // Check if teacher2 (Physics teacher) exists, create if not
    let teacher2 = await User.findOne({ where: { email: 'teacher2@school.ma' } });
    if (!teacher2) {
      teacher2 = await User.create({
        email: 'teacher2@school.ma',
        password: 'password123',
        firstName: 'Aicha',
        lastName: 'Alaoui',
        role: 'teacher',
        subjects: ['physics'],
      });
      console.log('✓ Created teacher2:', teacher2.email, '- Subject: Physics');
    } else {
      console.log('✓ Teacher2 already exists:', teacher2.email);
    }

    // Check if students exist, create if not
    let student1 = await User.findOne({ where: { email: 'student1@school.ma' } });
    if (!student1) {
      student1 = await User.create({
        email: 'student1@school.ma',
        password: 'password123',
        firstName: 'Fatima',
        lastName: 'Zahra',
        role: 'student',
        grade: '1ere Bac',
      });
      console.log('✓ Created student:', student1.email);
    } else {
      console.log('✓ Student 1 already exists:', student1.email);
    }

    let student2 = await User.findOne({ where: { email: 'student2@school.ma' } });
    if (!student2) {
      student2 = await User.create({
        email: 'student2@school.ma',
      password: 'password123',
      firstName: 'Youssef',
      lastName: 'Amrani',
        role: 'student',
        grade: '2eme Bac',
      });
      console.log('✓ Created student:', student2.email);
    } else {
      console.log('✓ Student 2 already exists:', student2.email);
    }

    // Check if parent exists, create if not
    let parent = await User.findOne({ where: { email: 'parent@school.ma' } });
    if (!parent) {
      parent = await User.create({
        email: 'parent@school.ma',
      password: 'password123',
      firstName: 'Amina',
      lastName: 'Zahra',
        role: 'parent',
      });
      console.log('✓ Created parent:', parent.email);
    } else {
      console.log('✓ Parent already exists:', parent.email);
    }

    // Check if counselor exists, create if not
    let counselor = await User.findOne({ where: { email: 'counselor@school.ma' } });
    if (!counselor) {
      counselor = await User.create({
        email: 'counselor@school.ma',
        password: 'password123',
        firstName: 'Hassan',
        lastName: 'Tazi',
        role: 'counselor',
      });
      console.log('✓ Created counselor:', counselor.email);
    } else {
      console.log('✓ Counselor already exists:', counselor.email);
    }

    // Create classrooms (check if they exist first)
    let classroom1 = null;
    let classroom2 = null;
    
    if (teacher1) {
      // Classroom 1: 1ere Bac (assigned to teacher1 - Math teacher)
      classroom1 = await Classroom.findOne({ where: { grade: '1ere Bac' } });
      if (!classroom1) {
        classroom1 = await Classroom.create({
          name: '1ère Bac Sciences - Classe A',
          grade: '1ere Bac',
          teacherId: teacher1.id,
          subjects: ['math', 'physics'], // Both subjects taught in this classroom
          academicYear: '2024-2025',
          description: 'Première année du baccalauréat sciences',
          isActive: true
        });
        console.log('✓ Created classroom 1: 1ere Bac (assigned to teacher1)');
      } else {
        console.log('✓ Classroom 1 (1ere Bac) already exists');
        // Get the existing classroom
        classroom1 = await Classroom.findOne({ where: { grade: '1ere Bac' } });
      }
      
      // Link teacher1 to classroom1 through TeacherClassroom
      if (classroom1) {
        const existingTeacherClassroom1 = await TeacherClassroom.findOne({
          where: { teacherId: teacher1.id, classroomId: classroom1.id }
        });
        if (!existingTeacherClassroom1) {
          await TeacherClassroom.create({
            teacherId: teacher1.id,
            classroomId: classroom1.id
          });
          console.log('✓ Linked teacher1 to classroom 1');
        } else {
          console.log('✓ Teacher1 already linked to classroom 1');
        }
      }
    }

    if (teacher2) {
      // Classroom 2: 2eme Bac (assigned to teacher2 - Physics teacher)
      classroom2 = await Classroom.findOne({ where: { grade: '2eme Bac' } });
      if (!classroom2) {
        classroom2 = await Classroom.create({
          name: '2ème Bac Sciences - Classe A',
          grade: '2eme Bac',
          teacherId: teacher2.id,
          subjects: ['math', 'physics'], // Both subjects taught in this classroom
          academicYear: '2024-2025',
          description: 'Deuxième année du baccalauréat sciences',
          isActive: true
        });
        console.log('✓ Created classroom 2: 2eme Bac (assigned to teacher2)');
      } else {
        console.log('✓ Classroom 2 (2eme Bac) already exists');
        // Get the existing classroom
        classroom2 = await Classroom.findOne({ where: { grade: '2eme Bac' } });
      }
      
      // Link teacher2 to classroom2 through TeacherClassroom
      if (classroom2) {
        const existingTeacherClassroom2 = await TeacherClassroom.findOne({
          where: { teacherId: teacher2.id, classroomId: classroom2.id }
        });
        if (!existingTeacherClassroom2) {
          await TeacherClassroom.create({
            teacherId: teacher2.id,
            classroomId: classroom2.id
          });
          console.log('✓ Linked teacher2 to classroom 2');
        } else {
          console.log('✓ Teacher2 already linked to classroom 2');
        }
      }
    }

    // Assign students to classrooms
    if (student1 && classroom1) {
      const existingEnrollment1 = await StudentClassroom.findOne({
        where: { studentId: student1.id, classroomId: classroom1.id }
      });
      if (!existingEnrollment1) {
        await StudentClassroom.create({
          studentId: student1.id,
          classroomId: classroom1.id
        });
        console.log('✓ Assigned student1 to classroom 1 (1ere Bac)');
      } else {
        console.log('✓ Student1 already enrolled in classroom 1');
      }
    }

    if (student2 && classroom2) {
      const existingEnrollment2 = await StudentClassroom.findOne({
        where: { studentId: student2.id, classroomId: classroom2.id }
      });
      if (!existingEnrollment2) {
        await StudentClassroom.create({
          studentId: student2.id,
          classroomId: classroom2.id
        });
        console.log('✓ Assigned student2 to classroom 2 (2eme Bac)');
      } else {
        console.log('✓ Student2 already enrolled in classroom 2');
      }
    }

    // Link parent to student1 (check if link exists first)
    if (student1 && parent) {
      const existingLink = await ParentStudent.findOne({
        where: { parentId: parent.id, studentId: student1.id }
      });
      if (!existingLink) {
        await ParentStudent.create({
          parentId: parent.id,
          studentId: student1.id,
          relationship: 'mother',
        });
        console.log('✓ Linked parent to student');
      } else {
        console.log('✓ Parent-student link already exists');
      }
    }

    // Initialize PFSM for students (empty - they start fresh) - check if exists first
    if (student1) {
      const existingPFSM1 = await PFSM.findOne({ where: { studentId: student1.id } });
      if (!existingPFSM1) {
        await PFSM.create({
          studentId: student1.id,
          masteryLevels: {},
          strengths: [],
          weaknesses: [],
          performanceMetrics: {},
          engagementMetrics: {
            totalSessions: 0
          },
        });
        console.log('✓ Initialized PFSM for student 1 (fresh start)');
      } else {
        console.log('✓ PFSM for student 1 already exists');
      }
    }

    if (student2) {
      const existingPFSM2 = await PFSM.findOne({ where: { studentId: student2.id } });
      if (!existingPFSM2) {
        await PFSM.create({
          studentId: student2.id,
          masteryLevels: {},
          strengths: [],
          weaknesses: [],
          performanceMetrics: {},
          engagementMetrics: {
            totalSessions: 0
          },
        });
        console.log('✓ Initialized PFSM for student 2 (fresh start)');
      } else {
        console.log('✓ PFSM for student 2 already exists');
      }
    }

    // Create sample attendance records (last 5 days) - only if students exist and records don't exist
    if (student1 && student2) {
      const today = new Date();
      let createdCount = 0;
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Check if attendance record exists for student1 on this date
        const existing1 = await Attendance.findOne({
          where: { studentId: student1.id, date: dateStr }
        });
        if (!existing1) {
          await Attendance.create({
            studentId: student1.id,
            date: dateStr,
            checkInTime: '08:05:00',
            checkOutTime: '15:30:00',
            status: i === 2 ? 'late' : 'present',
            anomalies: i === 2 ? [{ type: 'late_arrival', description: 'Arrived 15 minutes late', flaggedAt: new Date() }] : [],
          });
          createdCount++;
        }

        // Check if attendance record exists for student2 on this date
        const existing2 = await Attendance.findOne({
          where: { studentId: student2.id, date: dateStr }
        });
        if (!existing2) {
          await Attendance.create({
            studentId: student2.id,
            date: dateStr,
            checkInTime: '07:55:00',
            checkOutTime: '15:25:00',
            status: 'present',
          });
          createdCount++;
        }
      }
      if (createdCount > 0) {
        console.log(`✓ Created ${createdCount} sample attendance records`);
      } else {
        console.log('✓ Sample attendance records already exist');
      }
    }

    // Create sample course documents (metadata only - no actual file) - check if exists first
    if (teacher1) {
      const existingDoc1 = await CourseDocument.findOne({
        where: { teacherId: teacher1.id, title: 'Algebra Fundamentals' }
      });
      if (!existingDoc1) {
        await CourseDocument.create({
          teacherId: teacher1.id,
          subject: 'math',
          title: 'Algebra Fundamentals',
          description: 'Introduction to algebraic concepts and problem-solving',
          chapter: 'Chapter 1',
          gradeLevel: '2ème Bac',
          tags: ['algebra', 'fundamentals', 'equations'],
          filePath: '/uploads/sample-algebra.pdf',
          fileType: 'application/pdf',
          isProcessed: true,
          chunkCount: 15,
        });
        console.log('✓ Created sample math course document (teacher1)');
      } else {
        console.log('✓ Sample math course document already exists');
      }
    }

    if (teacher2) {
      const existingDoc2 = await CourseDocument.findOne({
        where: { teacherId: teacher2.id, title: 'Mechanics Fundamentals' }
      });
      if (!existingDoc2) {
        await CourseDocument.create({
          teacherId: teacher2.id,
          subject: 'physics',
          title: 'Mechanics Fundamentals',
          description: 'Introduction to classical mechanics and motion',
          chapter: 'Chapter 1',
          tags: ['mechanics', 'motion', 'forces'],
          filePath: '/uploads/sample-mechanics.pdf',
          fileType: 'application/pdf',
          isProcessed: true,
          chunkCount: 15,
        });
        console.log('✓ Created sample physics course document (teacher2)');
      } else {
        console.log('✓ Sample physics course document already exists');
      }
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Sample credentials:');
    console.log('Admin: admin@school.ma / admin123');
    console.log('Teacher1 (Math): teacher1@school.ma / password123');
    console.log('Teacher2 (Physics): teacher2@school.ma / password123');
    console.log('Student 1: student1@school.ma / password123');
    console.log('Student 2: student2@school.ma / password123');
    console.log('Parent: parent@school.ma / password123');
    console.log('Counselor: counselor@school.ma / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

