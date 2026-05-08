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
  Card,
  CardContent,
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
  Alert,
  Tab,
  Tabs,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Logout,
  People,
  Psychology,
  Warning,
  Info,
  ExpandMore,
  Refresh,
  Class,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import api from '../services/api';
import TourEngine from '../components/OnboardingTour/TourEngine';
import { tourConfigs } from '../components/OnboardingTour/tourConfigs';
import EmptyState from '../components/EmptyState';
import StudentTableSkeleton from '../components/skeletons/StudentTableSkeleton';
import DocumentCardSkeleton from '../components/skeletons/DocumentCardSkeleton';

export default function CounselorDashboard() {
  const { user, logout } = useAuth();
  const { show } = useSnackbar();
  const config = getConfig();
  const [tabValue, setTabValue] = useState(0);
  const [startTour, setStartTour] = useState(false);

  const tourRefs = {
    allStudentsTable: useRef(null),
    studentDetailsAction: useRef(null),
    orientationAction: useRef(null),
    classroomsTab: useRef(null),
  };
  
  // State
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [orientationData, setOrientationData] = useState(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [classroomsError, setClassroomsError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const onboardingCompleted = user?.onboardingCompleted;
  const userId = user?.id;
  
  // Dialogs
  const [studentDialog, setStudentDialog] = useState(false);
  const [orientationDialog, setOrientationDialog] = useState(false);
  
  useEffect(() => {
    loadStudents();
    loadClassrooms();
  }, []);

  useEffect(() => {
    if (!userId || onboardingCompleted) return;
    if (students.length === 0) return;
    const timer = setTimeout(() => setStartTour(true), 800);
    return () => clearTimeout(timer);
  }, [userId, onboardingCompleted, students.length]);

  useEffect(() => {
    const handler = (e) => {
      const refKey = e?.detail?.refKey;
      if (!refKey) return;

      if (refKey === 'classroomsTab') setTabValue(1);
      if (refKey === 'allStudentsTable' || refKey === 'studentDetailsAction' || refKey === 'orientationAction') {
        setTabValue(0);
      }
    };

    window.addEventListener('scholarai:onboarding-tour-step', handler);
    return () => window.removeEventListener('scholarai:onboarding-tour-step', handler);
  }, []);

  const loadStudents = async () => {
    try {
      setStudentsLoading(true);
      setStudentsError(null);
      const res = await api.get('/counselor/students');
      setStudents(res.data.students);
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudentsError(error);
      show('Failed to load students', 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadClassrooms = async () => {
    try {
      setClassroomsLoading(true);
      setClassroomsError(null);
      const res = await api.get('/counselor/classrooms');
      setClassrooms(res.data.classrooms);
    } catch (error) {
      console.error('Failed to load classrooms:', error);
      setClassroomsError(error);
      show('Failed to load classrooms', 'error');
    } finally {
      setClassroomsLoading(false);
    }
  };

  const loadStudentDetails = async (studentId) => {
    try {
      setStudentsLoading(true);
      const res = await api.get(`/counselor/students/${studentId}`);
      setStudentDetails(res.data);
      setStudentDialog(true);
    } catch (error) {
      console.error('Failed to load student details:', error);
      show('Failed to load student details', 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadOrientationData = async (studentId) => {
    try {
      setStudentsLoading(true);
      const res = await api.get(`/counselor/students/${studentId}/orientation`);
      setOrientationData(res.data);
      setSelectedStudent(studentId);
      setOrientationDialog(true);
    } catch (error) {
      console.error('Failed to load orientation data:', error);
      show('Failed to load orientation data', 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    if (!selectedStudent) return;
    
    try {
      setAnalyzing(true);
      await api.post(`/counselor/students/${selectedStudent}/orientation/analyze`);
      show('Orientation analysis completed successfully!', 'success');
      // Reload orientation data
      await loadOrientationData(selectedStudent);
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
      show('Failed to trigger orientation analysis', 'error');
    } finally {
      setAnalyzing(false);
    }
  };


  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <Warning />;
      case 'warning':
        return <Warning />;
      default:
        return <Info />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#757575' }}>
        <Toolbar>
            <Box sx={{ p: 1, mr: 3 }}>
              <Box
                component="img"
                src={config.logoImage}
                alt={`${config.name} Logo`}
                key={`counselor-logo-${config.logoImage}`}
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
              onChange={(e, newValue) => setTabValue(newValue)} 
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
              <Tab label="All Students" icon={<People />} />
              <Tab ref={tourRefs.classroomsTab} label="Classrooms" icon={<Class />} />
            </Tabs>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ mr: 2 }}>
              Welcome, {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton color="inherit" onClick={logout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Container maxWidth="xl">
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              Student Overview & Orientation Agent Insights
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Access student data, PFSM information, and orientation agent recommendations
            </Typography>
          </Paper>

          {tabValue === 0 && (
            <Paper ref={tourRefs.allStudentsTable} elevation={3} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5">All Students</Typography>
                <Button variant="outlined" startIcon={<Refresh />} onClick={loadStudents}>
                  Refresh
                </Button>
              </Box>
              
              {studentsLoading ? (
                <StudentTableSkeleton rows={5} cols={5} />
              ) : studentsError ? (
                <EmptyState
                  variant="error"
                  icon="👥"
                  title="Couldn't load students"
                  description="Please try refreshing in a moment."
                  actionLabel="Refresh"
                  onAction={loadStudents}
                />
              ) : students.length === 0 ? (
                <EmptyState
                  icon="👥"
                  title="No students assigned"
                  description="Students assigned to you will appear here."
                />
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>Classroom</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((student, index) => {
                        const studentClassrooms = classrooms
                          .filter(c => c.students?.some(s => s.id === student.id))
                          .map(c => c.name)
                          .join(', ') || 'Not assigned';

                        return (
                          <TableRow key={student.id}>
                            <TableCell>{student.firstName} {student.lastName}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>{student.grade || 'N/A'}</TableCell>
                            <TableCell>{studentClassrooms}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => loadStudentDetails(student.id)}
                                sx={{ mr: 1 }}
                                ref={index === 0 ? tourRefs.studentDetailsAction : null}
                              >
                                View Details
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<Psychology />}
                                onClick={() => loadOrientationData(student.id)}
                                ref={index === 0 ? tourRefs.orientationAction : null}
                              >
                                Orientation
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
          )}

          {tabValue === 1 && (
            <Paper elevation={3} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5">Classrooms & Students</Typography>
                <Button variant="outlined" startIcon={<Refresh />} onClick={() => { loadClassrooms(); loadStudents(); }}>
                  Refresh
                </Button>
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  All Students
                </Typography>

                {studentsLoading ? (
                  <StudentTableSkeleton rows={5} cols={5} />
                ) : studentsError ? (
                  <EmptyState
                    variant="error"
                    icon="👥"
                    title="Couldn't load students"
                    description="Please try refreshing in a moment."
                    actionLabel="Refresh"
                    onAction={loadStudents}
                  />
                ) : students.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    title="No students assigned"
                    description="Students assigned to you will appear here."
                  />
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Grade</TableCell>
                          <TableCell>Classroom</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map((student) => {
                          const studentClassrooms = classrooms
                            .filter(c => c.students?.some(s => s.id === student.id))
                            .map(c => c.name)
                            .join(', ') || 'Not assigned';

                          const studentClassroomIds = classrooms
                            .filter(c => c.students?.some(s => s.id === student.id))
                            .map(c => c.id);

                          return (
                            <TableRow 
                              key={student.id}
                              data-classroom-id={studentClassroomIds[0] || ''}
                            >
                              <TableCell>{student.firstName} {student.lastName}</TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>{student.grade || 'N/A'}</TableCell>
                              <TableCell>{studentClassrooms}</TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => loadStudentDetails(student.id)}
                                  sx={{ mr: 1 }}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<Psychology />}
                                  onClick={() => loadOrientationData(student.id)}
                                >
                                  Orientation
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Classrooms Overview
                  </Typography>

                  {classroomsLoading ? (
                    <DocumentCardSkeleton count={2} />
                  ) : classroomsError ? (
                    <EmptyState
                      variant="error"
                      icon="🏫"
                      title="Couldn't load classrooms"
                      description="Please try refreshing in a moment."
                      actionLabel="Refresh"
                      onAction={loadClassrooms}
                    />
                  ) : classrooms.length === 0 ? (
                    <EmptyState
                      icon="🏫"
                      title="No classrooms"
                      description="No classroom data is available."
                    />
                  ) : (
                    <Grid container spacing={3}>
                      {classrooms.map((classroom) => (
                        <Grid item xs={12} md={6} lg={4} key={classroom.id}>
                          <Card 
                            sx={{ 
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6
                              }
                            }}
                            onClick={() => {
                              const studentRows = document.querySelectorAll(`[data-classroom-id="${classroom.id}"]`);
                              if (studentRows.length > 0) {
                                studentRows[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                studentRows.forEach(row => {
                                  row.style.backgroundColor = '#e3f2fd';
                                  setTimeout(() => {
                                    row.style.backgroundColor = '';
                                  }, 2000);
                                });
                              }
                            }}
                          >
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {classroom.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Grade: {classroom.grade}
                              </Typography>
                              {classroom.teachers && classroom.teachers.length > 0 ? (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Teachers: {classroom.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Teachers: Not assigned
                                </Typography>
                              )}
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Students: {classroom.students?.length || 0}
                              </Typography>
                              {classroom.subjects && classroom.subjects.length > 0 && (
                                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {classroom.subjects.map((subject, idx) => (
                                    <Chip key={idx} label={subject} size="small" />
                                  ))}
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </Box>
            </Paper>
          )}
        </Container>
      </Box>

      {/* Student Details Dialog */}
      <Dialog
        open={studentDialog}
        onClose={() => setStudentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Student Details: {studentDetails?.student?.firstName} {studentDetails?.student?.lastName}
        </DialogTitle>
        <DialogContent>
          {studentDetails && (
            <Box>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Basic Info</Typography>
                      <Typography><strong>Email:</strong> {studentDetails.student.email}</Typography>
                      <Typography><strong>Grade:</strong> {studentDetails.student.grade || 'N/A'}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Activity Summary</Typography>
                      <Typography><strong>Recent Sessions:</strong> {studentDetails.sessionCount || 0}</Typography>
                      <Typography><strong>Attendance Records:</strong> {studentDetails.attendanceRecords || 0}</Typography>
                      {studentDetails.orientationFlags?.length > 0 && (
                        <Typography><strong>Orientation Flags:</strong> {studentDetails.orientationFlags.length}</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                {(studentDetails.strengths || studentDetails.weaknesses || studentDetails.learningStyle) && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Student Profile Summary</Typography>
                        <Typography><strong>Strengths:</strong> {studentDetails.strengths?.join(', ') || 'None identified'}</Typography>
                        <Typography><strong>Weaknesses:</strong> {studentDetails.weaknesses?.join(', ') || 'None identified'}</Typography>
                        <Typography><strong>Learning Style:</strong> {studentDetails.learningStyle || 'Unknown'}</Typography>
                        {studentDetails.attendanceIssues && (
                          <Typography color="warning.main"><strong>⚠ Attendance Issues Detected</strong></Typography>
                        )}
                        {studentDetails.recommendedFocus && (
                          <Typography><strong>Recommended Focus:</strong> {studentDetails.recommendedFocus}</Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentDialog(false)}>Close</Button>
          {studentDetails?.student?.id && (
            <Button
              variant="contained"
              onClick={() => {
                setStudentDialog(false);
                loadOrientationData(studentDetails.student.id);
              }}
            >
              View Orientation Data
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Orientation Data Dialog */}
      <Dialog
        open={orientationDialog}
        onClose={() => setOrientationDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Orientation Agent Data</Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={triggerAnalysis}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {orientationData && (
            <Box sx={{ mt: 2 }}>
              {/* Orientation Flags */}
              {orientationData.orientationFlags && orientationData.orientationFlags.length > 0 && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Orientation Flags & Recommendations</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {orientationData.orientationFlags.map((flag, index) => (
                      <Alert
                        key={index}
                        severity={getSeverityColor(flag.severity)}
                        icon={getSeverityIcon(flag.severity)}
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="subtitle2">{flag.type}</Typography>
                        <Typography variant="body2">{flag.recommendations || 'No specific recommendations'}</Typography>
                      </Alert>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Student Profile Summary (from Orientation Agent) */}
              {orientationData.studentSummary && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Student Profile Summary</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography><strong>Strengths:</strong></Typography>
                        <List dense>
                          {orientationData.studentSummary.strengths?.length > 0 ? (
                            orientationData.studentSummary.strengths.map((strength, idx) => (
                              <ListItem key={idx}>
                                <ListItemText primary={strength} />
                              </ListItem>
                            ))
                          ) : (
                            <ListItem><ListItemText primary="None identified yet" /></ListItem>
                          )}
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography><strong>Weaknesses:</strong></Typography>
                        <List dense>
                          {orientationData.studentSummary.weaknesses?.length > 0 ? (
                            orientationData.studentSummary.weaknesses.map((weakness, idx) => (
                              <ListItem key={idx}>
                                <ListItemText primary={weakness} />
                              </ListItem>
                            ))
                          ) : (
                            <ListItem><ListItemText primary="None identified yet" /></ListItem>
                          )}
                        </List>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography><strong>Learning Style:</strong> {orientationData.studentSummary.learningStyle || 'Unknown'}</Typography>
                        {orientationData.studentSummary.recommendedFocus && (
                          <Typography><strong>Recommended Focus:</strong> {orientationData.studentSummary.recommendedFocus}</Typography>
                        )}
                        {orientationData.studentSummary.attendanceIssues && (
                          <Typography color="error"><strong>⚠ Attendance Issues Detected</strong></Typography>
                        )}
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Orientation Alerts */}
              {orientationData.alerts && orientationData.alerts.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">
                      Orientation Alerts ({orientationData.alerts.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {orientationData.alerts.map((alert) => (
                        <React.Fragment key={alert.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getSeverityIcon(alert.severity)}
                                  {alert.title}
                                </Box>
                              }
                              secondary={alert.message}
                            />
                            <Chip
                              label={alert.severity}
                              color={getSeverityColor(alert.severity)}
                              size="small"
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {(!orientationData.orientationFlags || orientationData.orientationFlags.length === 0) &&
               (!orientationData.alerts || orientationData.alerts.length === 0) && (
                <Alert severity="info">
                  No orientation data available. Click "Run Analysis" to generate orientation insights for this student.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrientationDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {startTour && <TourEngine steps={tourConfigs.counselor} refs={tourRefs} />}
    </Box>
  );
}

