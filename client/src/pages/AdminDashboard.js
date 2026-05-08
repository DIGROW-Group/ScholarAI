import React, { useEffect, useRef, useState } from 'react';
import { getConfig } from '../config/appConfig';
import {
  Box,
  Container,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Alert,
  TextField,
  MenuItem,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  School,
  Logout,
  Edit,
  AdminPanelSettings,
  Class,
  Add,
  Delete,
  Dashboard,
  Psychology,
  People,
  TrendingUp,
  CheckCircle,
  Cancel,
  AttachMoney,
  AccountBalance,
  Calculate,
  Science,
  Language,
  Computer,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import api from '../services/api';
import TourEngine from '../components/OnboardingTour/TourEngine';
import { tourConfigs } from '../components/OnboardingTour/tourConfigs';
import StatCardSkeleton from '../components/skeletons/StatCardSkeleton';
import DocumentCardSkeleton from '../components/skeletons/DocumentCardSkeleton';
import StudentTableSkeleton from '../components/skeletons/StudentTableSkeleton';
import EmptyState from '../components/EmptyState';
import useForm from '../hooks/useForm';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { show } = useSnackbar();
  const config = getConfig();
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [startTour, setStartTour] = useState(false);

  const tourRefs = {
    kpiCards: useRef(null),
    classroomsGrid: useRef(null),
    teachersPanel: useRef(null),
    counselorList: useRef(null),
    parentsPaymentsTable: useRef(null),
  };
  
  // Classroom state
  const [classrooms, setClassrooms] = useState([]);
  const [createClassroomDialog, setCreateClassroomDialog] = useState(false);
  const [manageStudentsDialog, setManageStudentsDialog] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const validateClassroomForm = (values) => {
    const errors = {};
    if (!values.name?.trim()) errors.name = 'Classroom name is required';
    if (!values.grade) errors.grade = 'Grade is required';
    if (!values.teacherId) errors.teacherId = 'Teacher is required';
    if (values.academicYear && !/^\d{4}-\d{4}$/.test(values.academicYear)) {
      errors.academicYear = 'Use format YYYY-YYYY';
    }
    return errors;
  };

  const {
    values: classroomForm,
    errors: classroomErrors,
    touched: classroomTouched,
    handleChange: handleClassroomChange,
    handleBlur: handleClassroomBlur,
    submit: submitClassroom,
    setValues: setClassroomForm,
  } = useForm(
    {
      name: '',
      grade: '1ere Bac',
      teacherId: '',
      academicYear: '2024-2025',
      description: '',
    },
    validateClassroomForm
  );
  const [tabValue, setTabValue] = useState(0);
  
  // Dashboard state
  const [students, setStudents] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState(null);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [classroomsError, setClassroomsError] = useState(null);
  const onboardingCompleted = user?.onboardingCompleted;
  const userId = user?.id;

  const availableSubjects = [
    { id: 'math', label: 'Maths', icon: Calculate },
    { id: 'physics', label: 'Physics', icon: Science },
    { id: 'arabic', label: 'Arabic', icon: Language },
    { id: 'english', label: 'English', icon: Language },
    { id: 'french', label: 'French', icon: Language },
    { id: 'informatique', label: 'IT', icon: Computer },
  ];

  useEffect(() => {
    loadDashboardData();
    loadTeachers();
    loadClassrooms();
  }, []);

  useEffect(() => {
    if (!userId || onboardingCompleted) return;
    const timer = setTimeout(() => setStartTour(true), 800);
    return () => clearTimeout(timer);
  }, [userId, onboardingCompleted]);

  useEffect(() => {
    const handler = (e) => {
      const refKey = e?.detail?.refKey;
      if (!refKey) return;

      if (refKey === 'kpiCards' || refKey === 'counselorList' || refKey === 'parentsPaymentsTable') {
        setTabValue(0);
      }
      if (refKey === 'classroomsGrid') setTabValue(1);
      if (refKey === 'teachersPanel') setTabValue(2);
    };

    window.addEventListener('scholarai:onboarding-tour-step', handler);
    return () => window.removeEventListener('scholarai:onboarding-tour-step', handler);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setDashboardError(null);
      const res = await api.get('/admin/users');
      const users = res.data.users || [];
      setStudents(users.filter(u => u.role === 'student'));
      setCounselors(users.filter(u => u.role === 'counselor'));
      setParents(users.filter(u => u.role === 'parent'));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDashboardError(error);
      show('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      setTeachersLoading(true);
      setTeachersError(null);
      const res = await api.get('/admin/teachers');
      setTeachers(res.data.teachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      setTeachersError(error);
      show('Failed to load teachers', 'error');
    } finally {
      setTeachersLoading(false);
    }
  };

  const loadClassrooms = async () => {
    try {
      setClassroomsLoading(true);
      setClassroomsError(null);
      const res = await api.get('/admin/classrooms');
      setClassrooms(res.data.classrooms);
    } catch (error) {
      console.error('Failed to load classrooms:', error);
      setClassroomsError(error);
      show('Failed to load classrooms', 'error');
    } finally {
      setClassroomsLoading(false);
    }
  };

  const handleCreateClassroom = async () => {
    await submitClassroom(async (values) => {
      try {
        await api.post('/admin/classrooms', values);
        show('Classroom created successfully!', 'success');
        setCreateClassroomDialog(false);
        setClassroomForm({ name: '', grade: '1ere Bac', teacherId: '', academicYear: '2024-2025', description: '' });

        loadClassrooms();
      } catch (error) {
        console.error('Failed to create classroom:', error);
        show(error.response?.data?.error || 'Failed to create classroom', 'error');
      }
    });
  };

  const handleManageStudents = async (classroom) => {
    setSelectedClassroom(classroom);
    try {
      const res = await api.get(`/admin/classrooms/${classroom.id}/available-students`);
      setAvailableStudents(res.data.students);
      setManageStudentsDialog(true);
    } catch (error) {
      console.error('Failed to load available students:', error);
      show('Failed to load available students', 'error');
    }
  };

  const handleAddStudent = async (studentId) => {
    try {
      await api.post(`/admin/classrooms/${selectedClassroom.id}/students`, { studentId });
      show('Student added to classroom!', 'success');
      loadClassrooms();
      handleManageStudents(selectedClassroom); // Refresh
    } catch (error) {
      console.error('Failed to add student:', error);
      show(error.response?.data?.error || 'Failed to add student', 'error');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await api.delete(`/admin/classrooms/${selectedClassroom.id}/students/${studentId}`);
      show('Student removed from classroom!', 'success');
      loadClassrooms();
      const updated = classrooms.find(c => c.id === selectedClassroom.id);
      setSelectedClassroom(updated);
    } catch (error) {
      console.error('Failed to remove student:', error);
      show(error.response?.data?.error || 'Failed to remove student', 'error');
    }
  };

  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setSelectedSubjects(teacher.subjects || []);
    setEditDialog(true);
  };

  const handleSaveSubjects = async () => {
    try {
      await api.patch(`/admin/teachers/${selectedTeacher.id}/subjects`, {
        subjects: selectedSubjects
      });
      
      show(`Successfully updated subjects for ${selectedTeacher.firstName} ${selectedTeacher.lastName}`, 'success');
      setEditDialog(false);
      loadTeachers();
    } catch (error) {
      console.error('Failed to update subjects:', error);
      show(error.response?.data?.error || 'Failed to update subjects', 'error');
    }
  };

  const toggleSubject = (subjectId) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" sx={{ bgcolor: '#757575' }}>
        <Toolbar>
          <Box sx={{ p: 1, mr: 3 }}>
            <Box
              component="img"
              src={config.logoImage}
              alt={`${config.name} Logo`}
              key={`admin-logo-${config.logoImage}`}
              sx={{
                height: 72,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, v) => setTabValue(v)} 
              sx={{ 
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-selected': {
                    color: 'white',
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'white',
                }
              }}
            >
              <Tab label="Dashboard" icon={<Dashboard />} iconPosition="start" />
              <Tab label="Classrooms" icon={<Class />} iconPosition="start" />
              <Tab label="Teachers" icon={<School />} iconPosition="start" />
            </Tabs>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton color="inherit" onClick={logout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Tab 0: Dashboard */}
        {tabValue === 0 && (
          <Box>
            {/* Welcome Section */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#757575', color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Welcome back, {user?.firstName}! 👋
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Here's an overview of your RMATSS platform
                  </Typography>
                </Box>
                <AdminPanelSettings sx={{ fontSize: 80, opacity: 0.3 }} />
              </Box>
            </Paper>

            {/* Statistics Cards */}
            <Grid ref={tourRefs.kpiCards} container spacing={3} sx={{ mb: 3 }}>
              {loading ? (
                <Grid item xs={12}>
                  <StatCardSkeleton count={4} />
                </Grid>
              ) : dashboardError ? (
                <Grid item xs={12}>
                  <EmptyState
                    variant="error"
                    icon="📈"
                    title="Couldn't load data"
                    description="Please try again in a moment."
                    actionLabel="Retry"
                    onAction={loadDashboardData}
                  />
                </Grid>
              ) : null}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #ea9b20 0%, #FFB84D 100%)', color: 'white', height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h3" fontWeight="bold">{classrooms.length}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>Classrooms</Typography>
                      </Box>
                      <Class sx={{ fontSize: 40, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #ea9b20 0%, #FFB84D 100%)', color: 'white', height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h3" fontWeight="bold">{teachers.length}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>Teachers</Typography>
                      </Box>
                      <School sx={{ fontSize: 40, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #ea9b20 0%, #FFB84D 100%)', color: 'white', height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h3" fontWeight="bold">{students.length}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>Students</Typography>
                      </Box>
                      <People sx={{ fontSize: 40, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #ea9b20 0%, #FFB84D 100%)', color: 'white', height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h3" fontWeight="bold">{parents.length}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>Parents</Typography>
                      </Box>
                      <People sx={{ fontSize: 40, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Counselors Section */}
                <Grid item xs={12} md={6}>
                  <Paper ref={tourRefs.counselorList} sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Psychology sx={{ fontSize: 32, color: 'primary.main', mr: 1.5 }} />
                    <Typography variant="h5" fontWeight="bold">Counselors</Typography>
                  </Box>
                  {loading ? (
                    <StudentTableSkeleton rows={3} cols={2} />
                  ) : dashboardError ? (
                    <EmptyState
                      variant="error"
                      icon="👨‍🏫"
                      title="Couldn't load counselors"
                      description="Please try again in a moment."
                      actionLabel="Retry"
                      onAction={loadDashboardData}
                    />
                  ) : counselors.length === 0 ? (
                    <EmptyState icon="👨‍🏫" title="No counselors yet" description="Counselors will appear here once they are added." />
                  ) : (
                    <List>
                      {counselors.map((counselor) => (
                        <React.Fragment key={counselor.id}>
                          <ListItem>
                            <ListItemText
                              primary={`${counselor.firstName} ${counselor.lastName}`}
                              secondary={counselor.email}
                            />
                            <Chip 
                              label="Active" 
                              color="success" 
                              size="small"
                              icon={<CheckCircle />}
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>

              {/* AI Tutors Overview */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ fontSize: 32, color: 'primary.main', mr: 1.5 }} />
                    <Typography variant="h5" fontWeight="bold">AI Tutors</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {availableSubjects.length === 0 ? (
                      <DocumentCardSkeleton count={3} />
                    ) : availableSubjects.map((subject) => {
                      const subjectTeachers = teachers.filter(t => t.subjects?.includes(subject.id));
                      const SubjectIcon = subject.icon;
                      return (
                        <Grid item xs={6} key={subject.id}>
                          <Card sx={{ 
                            background: 'linear-gradient(135deg, #ea9b2015 0%, #FFB84D15 100%)',
                            border: '1px solid #ea9b2030',
                            transition: 'all 0.2s',
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateY(-2px)'
                            }
                          }}>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                              <SubjectIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                              <Typography variant="body2" fontWeight="bold" gutterBottom>
                                {subject.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {subjectTeachers.length} {subjectTeachers.length === 1 ? 'teacher' : 'teachers'}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              </Grid>

              {/* Parents with Payment Status */}
              <Grid item xs={12}>
                <Paper ref={tourRefs.parentsPaymentsTable} sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <AccountBalance sx={{ fontSize: 32, color: 'primary.main', mr: 1.5 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h5" fontWeight="bold">Parents & Payments</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payment status overview for parent accounts
                      </Typography>
                    </Box>
                    <Chip 
                      label={`${parents.filter(p => Math.random() > 0.3).length}/${parents.length} Paid`}
                      color="success"
                      icon={<AttachMoney />}
                    />
                  </Box>
                  
                  {loading ? (
                    <StudentTableSkeleton rows={3} cols={4} />
                  ) : dashboardError ? (
                    <EmptyState
                      variant="error"
                      icon="📋"
                      title="Couldn't load parent data"
                      description="Please try again in a moment."
                      actionLabel="Retry"
                      onAction={loadDashboardData}
                    />
                  ) : parents.length === 0 ? (
                    <EmptyState icon="📋" title="No parents yet" description="Parents will appear here once they are added." />
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>Email</strong></TableCell>
                            <TableCell><strong>Children</strong></TableCell>
                            <TableCell><strong>Payment Status</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {parents.map((parent, index) => {
                            // Mock payment status (consistent based on index - 70% paid rate)
                            const hasPaid = index % 10 < 7;
                            
                            return (
                              <TableRow key={parent.id} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <People sx={{ mr: 1, color: 'text.secondary' }} />
                                    {parent.firstName} {parent.lastName}
                                  </Box>
                                </TableCell>
                                <TableCell>{parent.email}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label="1-2" 
                                    size="small" 
                                    color="info"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={hasPaid ? 'Paid' : 'Pending'}
                                    color={hasPaid ? 'success' : 'warning'}
                                    icon={hasPaid ? <CheckCircle /> : <Cancel />}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button size="small" variant="outlined" startIcon={<Edit />}>
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 1: Classroom Management */}
        {tabValue === 1 && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4">
                <Class sx={{ mr: 1, verticalAlign: 'middle' }} />
                Classroom Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateClassroomDialog(true)}
              >
                Create Classroom
              </Button>
            </Box>

            <Typography variant="body1" color="text.secondary" paragraph>
              Create classrooms, assign teachers and students. Students automatically get access to their classroom teacher's AI tutors.
            </Typography>

            <Box ref={tourRefs.classroomsGrid}>
              {classroomsLoading ? (
                <DocumentCardSkeleton count={3} />
              ) : classroomsError ? (
                <EmptyState
                  variant="error"
                  icon="🏫"
                  title="Couldn't load classrooms"
                  description="Please try again in a moment."
                  actionLabel="Retry"
                  onAction={loadClassrooms}
                />
              ) : classrooms.length === 0 ? (
                <EmptyState
                  icon="🏫"
                  title="No classrooms yet"
                  description="Create your first classroom to get started."
                  actionLabel="Create classroom"
                  onAction={() => setCreateClassroomDialog(true)}
                />
              ) : (
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {classrooms.map((classroom) => {
                  // Determine card color based on grade (orange/yellow variants)
                  const getCardColor = (grade) => {
                    if (grade.includes('1ere')) return '#C77A0A'; // Dark orange
                    if (grade.includes('2eme')) return '#ea9b20'; // Medium orange
                    if (grade.includes('3eme')) return '#FFB84D'; // Light orange
                    return '#FFB84D'; // Lighter orange default
                  };

                  const cardColor = getCardColor(classroom.grade);

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={classroom.id}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 2,
                          boxShadow: 3,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 6
                          }
                        }}
                      >
                        <CardActionArea
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                            background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}dd 100%)`,
                            color: 'white',
                            p: 3,
                            minHeight: 200
                          }}
                          onClick={() => handleManageStudents(classroom)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, width: '100%' }}>
                            <Class sx={{ fontSize: 40, mr: 1.5 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {classroom.name}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {classroom.grade}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ mt: 'auto', width: '100%' }}>
                            {classroom.teachers && classroom.teachers.length > 0 && (
                              <Typography variant="body2" sx={{ mb: 1, opacity: 0.95 }}>
                                <strong>Teachers:</strong> {classroom.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}
                              </Typography>
                            )}
                            
                            {classroom.subjects && classroom.subjects.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                                {classroom.subjects.slice(0, 2).map((subjectId) => {
                                  const subject = availableSubjects.find(s => s.id === subjectId);
                                  return subject ? (
                                    <Chip 
                                      key={subjectId} 
                                      label={subject.label} 
                                      size="small" 
                                      sx={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                        color: 'white',
                                        fontWeight: 'bold'
                                      }}
                                    />
                                  ) : null;
                                })}
                                {classroom.subjects.length > 2 && (
                                  <Chip 
                                    label={`+${classroom.subjects.length - 2} more`}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                      color: 'white'
                                    }}
                                  />
                                )}
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                <strong>{classroom.students?.length || 0}</strong> {classroom.students?.length === 1 ? 'student' : 'students'}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9, fontStyle: 'italic' }}>
                                Manage Students →
                              </Typography>
                            </Box>
                          </Box>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                  })}
                </Grid>
              )}
            </Box>
          </Paper>
        )}

        {/* Tab 2: Teacher Management */}
        {tabValue === 2 && (
          <Paper ref={tourRefs.teachersPanel} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  <School sx={{ mr: 1, verticalAlign: 'middle', fontSize: 32, color: 'primary.main' }} />
                  Teacher Management
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Assign AI tutors (subjects) to teachers. Teachers can only access data for their assigned subjects.
                </Typography>
              </Box>
            </Box>

            {teachersLoading ? (
              <StudentTableSkeleton rows={5} cols={3} />
            ) : teachersError ? (
              <EmptyState
                variant="error"
                icon="👨‍🏫"
                title="Couldn't load teachers"
                description="Please try again in a moment."
                actionLabel="Retry"
                onAction={loadTeachers}
              />
            ) : teachers.length === 0 ? (
              <EmptyState
                icon="👨‍🏫"
                title="No teachers yet"
                description="Add teachers to assign them to classrooms."
              />
            ) : (
              <Grid container spacing={3}>
                {teachers.map((teacher) => (
                  <Grid item xs={12} sm={6} md={4} key={teacher.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #ea9b20 0%, #FFB84D 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 2,
                              color: 'white',
                              fontSize: 20,
                              fontWeight: 'bold'
                            }}
                          >
                            {teacher.firstName[0]}{teacher.lastName[0]}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {teacher.firstName} {teacher.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {teacher.email}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Assigned Subjects:
                        </Typography>
                        {teacher.subjects && teacher.subjects.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                            {teacher.subjects.map((subjectId) => {
                              const subject = availableSubjects.find(s => s.id === subjectId);
                              return subject ? (
                                <Chip
                                  key={subjectId}
                                  label={subject.label}
                                  size="small"
                                  sx={{
                                    background: 'linear-gradient(135deg, #ea9b2015 0%, #FFB84D15 100%)',
                                    border: '1px solid #ea9b2030',
                                    fontWeight: 'bold'
                                  }}
                                />
                              ) : null;
                            })}
                          </Box>
                        ) : (
                          <Chip 
                            label="No subjects assigned" 
                            size="small" 
                            color="warning" 
                            sx={{ mb: 2 }}
                          />
                        )}

                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<Edit />}
                          onClick={() => handleEditTeacher(teacher)}
                          sx={{
                            background: 'linear-gradient(135deg, #ea9b20 0%, #FFB84D 100%)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #C77A0A 0%, #ea9b20 100%)',
                            }
                          }}
                        >
                          Edit Subjects
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        )}
      </Container>

      {/* Create Classroom Dialog */}
      <Dialog open={createClassroomDialog} onClose={() => setCreateClassroomDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Classroom</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Classroom Name"
            name="name"
            value={classroomForm.name}
            onChange={handleClassroomChange}
            onBlur={handleClassroomBlur}
            margin="normal"
            placeholder="e.g., 1ère Bac Sciences - Classe A"
            error={Boolean(classroomTouched.name && classroomErrors.name)}
            helperText={classroomTouched.name ? classroomErrors.name : ''}
            required
          />
          <TextField
            fullWidth
            select
            label="Grade"
            name="grade"
            value={classroomForm.grade}
            onChange={handleClassroomChange}
            onBlur={handleClassroomBlur}
            margin="normal"
            error={Boolean(classroomTouched.grade && classroomErrors.grade)}
            helperText={classroomTouched.grade ? classroomErrors.grade : ''}
            required
          >
            <MenuItem value="1ere College">1ère Collège</MenuItem>
            <MenuItem value="2eme College">2ème Collège</MenuItem>
            <MenuItem value="3eme College">3ème Collège</MenuItem>
            <MenuItem value="Tronc Commun">Tronc Commun</MenuItem>
            <MenuItem value="1ere Bac">1ère Bac</MenuItem>
            <MenuItem value="2eme Bac">2ème Bac</MenuItem>
          </TextField>
          <TextField
            fullWidth
            select
            label="Teacher"
            name="teacherId"
            value={classroomForm.teacherId}
            onChange={handleClassroomChange}
            onBlur={handleClassroomBlur}
            margin="normal"
            required
            helperText={classroomTouched.teacherId && classroomErrors.teacherId ? classroomErrors.teacherId : "Students will automatically access this teacher's AI tutors"}
            error={Boolean(classroomTouched.teacherId && classroomErrors.teacherId)}
          >
            {teachers.map((teacher) => (
              <MenuItem key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName} ({teacher.subjects?.join(', ') || 'No subjects'})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Academic Year"
            name="academicYear"
            value={classroomForm.academicYear}
            onChange={handleClassroomChange}
            onBlur={handleClassroomBlur}
            margin="normal"
            placeholder="2024-2025"
            error={Boolean(classroomTouched.academicYear && classroomErrors.academicYear)}
            helperText={classroomTouched.academicYear ? classroomErrors.academicYear : ''}
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={classroomForm.description}
            onChange={handleClassroomChange}
            onBlur={handleClassroomBlur}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateClassroomDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateClassroom}
            disabled={!classroomForm.name || !classroomForm.teacherId}
          >
            Create Classroom
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Students Dialog */}
      <Dialog open={manageStudentsDialog} onClose={() => setManageStudentsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Students - {selectedClassroom?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Current Students */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Enrolled Students ({selectedClassroom?.students?.length || 0})
              </Typography>
              <List>
                {selectedClassroom?.students?.map((student) => (
                  <ListItem
                    key={student.id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleRemoveStudent(student.id)}>
                        <Delete />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={`${student.firstName} ${student.lastName}`}
                      secondary={student.email}
                    />
                  </ListItem>
                ))}
              </List>
              {(!selectedClassroom?.students || selectedClassroom.students.length === 0) && (
                <Typography color="text.secondary">No students enrolled yet</Typography>
              )}
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Available Students */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Available Students ({availableStudents.length})
              </Typography>
              <List>
                {availableStudents.map((student) => (
                  <ListItem
                    key={student.id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleAddStudent(student.id)} color="primary">
                        <Add />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={`${student.firstName} ${student.lastName}`}
                      secondary={`${student.email} - ${student.grade}`}
                    />
                  </ListItem>
                ))}
              </List>
              {availableStudents.length === 0 && (
                <Typography color="text.secondary">No available students</Typography>
              )}
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Auto-Assignment:</strong> Students in this classroom automatically get access to{' '}
            {selectedClassroom?.subjects.map(s => {
              const subject = availableSubjects.find(sub => sub.id === s);
              return subject?.label;
            }).filter(Boolean).join(', ')} AI tutors.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageStudentsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Subjects Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Subjects to {selectedTeacher?.firstName} {selectedTeacher?.lastName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Select which subjects this teacher can access. They will only see data for assigned subjects.
          </Typography>

          <FormLabel component="legend" sx={{ mt: 2, mb: 1 }}>
            Available Subjects:
          </FormLabel>
          <FormGroup>
            {availableSubjects.map((subject) => {
              const SubjectIcon = subject.icon;
              return (
                <FormControlLabel
                  key={subject.id}
                  control={
                    <Checkbox
                      checked={selectedSubjects.includes(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SubjectIcon sx={{ fontSize: 20 }} />
                      {subject.label}
                    </Box>
                  }
                />
              );
            })}
          </FormGroup>

          {selectedSubjects.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Teacher must have at least one subject assigned to access their dashboard.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSubjects}
            disabled={selectedSubjects.length === 0}
          >
            Save Subjects
          </Button>
        </DialogActions>
      </Dialog>

      {startTour && <TourEngine steps={tourConfigs.admin} refs={tourRefs} />}
    </Box>
  );
}

