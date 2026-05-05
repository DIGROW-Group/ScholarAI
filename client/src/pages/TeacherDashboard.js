import React, { useEffect, useRef, useState } from 'react';
import { getConfig } from '../config/appConfig';
import {
  Box,
  Container,
  Grid,
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
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  School,
  Logout,
  Upload,
  People,
  Analytics,
  Assignment,
  Star,
  Visibility,
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import TourEngine from '../components/OnboardingTour/TourEngine';
import { tourConfigs } from '../components/OnboardingTour/tourConfigs';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const config = getConfig();
  const [tabValue, setTabValue] = useState(0);
  const [startTour, setStartTour] = useState(false);

  const tourRefs = {
    studentsTable: useRef(null),
    aiTutorsTab: useRef(null),
    contentLibrary: useRef(null),
    uploadButton: useRef(null),
    analyticsTab: useRef(null),
  };
  
  // State
  const [students, setStudents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSessions, setStudentSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  
  // Dialogs
  const [uploadDialog, setUploadDialog] = useState(false);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [evaluationDialog, setEvaluationDialog] = useState(false);
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    subject: 'math',
    title: '',
    description: '',
    chapter: '',
    guidelines: '',
    file: null,
  });
  
  // Filter state
  const [subjectFilter, setSubjectFilter] = useState('all');
  
  // All available subjects
  const allSubjects = [
    { id: 'math', label: 'Maths', icon: '📐', color: '#ea9b20' },
    { id: 'physics', label: 'Physics', icon: '⚛️', color: '#424242' },
    { id: 'arabic', label: 'Arabic', icon: '🇲🇦', color: '#757575' },
    { id: 'english', label: 'English', icon: '🇬🇧', color: '#FF8C5A' },
    { id: 'french', label: 'French', icon: '🇫🇷', color: '#616161' },
    { id: 'informatique', label: 'IT', icon: '💻', color: '#FF6B35' },
  ];

  // Filter subjects based on what teacher teaches
  const teacherSubjects = user?.subjects || [];
  const subjects = allSubjects.filter(s => teacherSubjects.includes(s.id));

  // Evaluation form
  const [evaluation, setEvaluation] = useState({
    rating: 5,
    feedback: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!user || user.onboardingCompleted) return;
    const timer = setTimeout(() => setStartTour(true), 800);
    return () => clearTimeout(timer);
  }, [user?.id, user?.onboardingCompleted]);

  useEffect(() => {
    const handler = (e) => {
      const refKey = e?.detail?.refKey;
      if (!refKey) return;

      if (refKey === 'studentsTable') setTabValue(0);
      if (refKey === 'aiTutorsTab') setTabValue(1);
      if (refKey === 'contentLibrary' || refKey === 'uploadButton') setTabValue(2);
      if (refKey === 'analyticsTab') setTabValue(3);
    };

    window.addEventListener('scholarai:onboarding-tour-step', handler);
    return () => window.removeEventListener('scholarai:onboarding-tour-step', handler);
  }, []);

  const loadData = async () => {
    try {
      const [studentsRes, documentsRes, analyticsRes] = await Promise.all([
        api.get('/teacher/students'),
        api.get('/teacher/documents'),
        api.get('/teacher/analytics?timeframe=30'),
      ]);
      
      setStudents(studentsRes.data.students);
      setDocuments(documentsRes.data.documents);
      setAnalytics(analyticsRes.data.analytics);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleUploadDocument = async () => {
    try {
      const formData = new FormData();
      formData.append('subject', uploadForm.subject);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('chapter', uploadForm.chapter);
      formData.append('guidelines', uploadForm.guidelines);
      formData.append('document', uploadForm.file);

      await api.post('/teacher/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadDialog(false);
      setUploadForm({ subject: 'math', title: '', description: '', chapter: '', guidelines: '', file: null });
      
      loadData();
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document');
    }
  };

  const viewStudentSessions = async (student) => {
    setSelectedStudent(student);
    try {
      const subject = subjectFilter !== 'all' ? `&subject=${subjectFilter}` : '';
      const res = await api.get(`/teacher/students/${student.id}/sessions?limit=50${subject}`);
      setStudentSessions(res.data.sessions);
      setSessionDialog(true);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const viewAllSessionsBySubject = async (subject) => {
    try {
      const res = await api.get(`/teacher/sessions/subject/${subject}?limit=50`);
      setStudentSessions(res.data.sessions);
      setSelectedStudent({ firstName: `All ${subject.toUpperCase()}`, lastName: 'Students' });
      setSessionDialog(true);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const viewSessionDetails = (session) => {
    setSelectedSession(session);
  };

  const handleEvaluateSession = async () => {
    try {
      await api.post(`/teacher/sessions/${selectedSession.id}/evaluate`, evaluation);
      setEvaluationDialog(false);
      setEvaluation({ rating: 5, feedback: '' });
      alert('Evaluation submitted successfully!');
      if (selectedStudent) {
        viewStudentSessions(selectedStudent);
      }
    } catch (error) {
      console.error('Evaluation failed:', error);
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
                key={`teacher-logo-${config.logoImage}`}
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
              <Tab label="Students" icon={<People />} iconPosition="start" />
              <Tab ref={tourRefs.aiTutorsTab} label="My AI Tutors" icon={<Star />} iconPosition="start" />
              <Tab ref={tourRefs.contentLibrary} label="Content Library" icon={<Assignment />} iconPosition="start" />
              <Tab ref={tourRefs.analyticsTab} label="Analytics" icon={<Analytics />} iconPosition="start" />
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
        {/* Tab 0: Students */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper ref={tourRefs.studentsTable} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Student Overview
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>Recent Sessions</TableCell>
                      {subjects.map((subject) => (
                        <TableCell key={subject.id}>
                          {subject.icon} {subject.label} Mastery
                        </TableCell>
                      ))}
                        <TableCell>Flags</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            {student.firstName} {student.lastName}
                          </TableCell>
                          <TableCell>{student.grade || 'N/A'}</TableCell>
                          <TableCell>{student.recentSessions}</TableCell>
                          {subjects.map((subject) => (
                            <TableCell key={subject.id}>
                              {student.pfsmState?.masteryLevels?.[subject.id] ? (
                                <Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={student.pfsmState.masteryLevels[subject.id] * 100}
                                    sx={{ width: 100, mb: 0.5 }}
                                  />
                                  <Typography variant="caption">
                                    {(student.pfsmState.masteryLevels[subject.id] * 100).toFixed(0)}%
                                  </Typography>
                                </Box>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            {student.pfsmState?.orientationFlags?.length > 0 ? (
                              <Chip
                                label={student.pfsmState.orientationFlags[0].type}
                                size="small"
                                color="warning"
                              />
                            ) : (
                              <Chip label="None" size="small" color="success" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => viewStudentSessions(student)}
                            >
                              View Sessions
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Tab 1: My AI Tutors */}
        {tabValue === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Inspect AI Tutor Conversations
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Review conversations for your subjects: {subjects.map(s => s.label).join(', ')}
                </Typography>
                
                {subjects.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No subjects assigned. Please contact admin to assign subjects to your account.
                  </Alert>
                )}
                
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {subjects.map((subject) => (
                    <Grid item xs={12} sm={6} md={4} key={subject.id}>
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={() => viewAllSessionsBySubject(subject.id)}
                        sx={{ 
                          py: 3,
                          bgcolor: subject.color,
                          '&:hover': { bgcolor: subject.color, filter: 'brightness(0.9)' }
                        }}
                      >
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4">{subject.icon}</Typography>
                          <Typography variant="h6">{subject.label}</Typography>
                          <Typography variant="caption">View conversations</Typography>
                        </Box>
                      </Button>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Subject Filter (for student sessions)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      label="All Subjects"
                      color={subjectFilter === 'all' ? 'primary' : 'default'}
                      onClick={() => setSubjectFilter('all')}
                    />
                    {subjects.map((subject) => (
                      <Chip
                        key={subject.id}
                        label={`${subject.icon} ${subject.label}`}
                        color={subjectFilter === subject.id ? 'primary' : 'default'}
                        onClick={() => setSubjectFilter(subject.id)}
                      />
                    ))}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Tab 2: Content Library */}
        {tabValue === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Course Documents</Typography>
                <Button
                  ref={tourRefs.uploadButton}
                  variant="contained"
                  startIcon={<Upload />}
                  onClick={() => setUploadDialog(true)}
                >
                  Upload Document
                </Button>
              </Box>
            </Grid>

            {documents.map((doc) => (
              <Grid item xs={12} md={6} lg={4} key={doc.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {doc.title}
                    </Typography>
                    <Chip
                      label={doc.subject.toUpperCase()}
                      color="primary"
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    {doc.chapter && (
                      <Typography variant="body2" color="text.secondary">
                        Chapter: {doc.chapter}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {doc.description}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={doc.isProcessed ? 'Processed' : 'Processing...'}
                        color={doc.isProcessed ? 'success' : 'warning'}
                        size="small"
                      />
                      {doc.chunkCount > 0 && (
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {doc.chunkCount} chunks
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tab 3: Analytics */}
        {tabValue === 3 && analytics && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Sessions
                  </Typography>
                  <Typography variant="h3">{analytics.totalSessions}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analytics.timeframe}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Avg Student Rating
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h3">{analytics.avgStudentRating}</Typography>
                    <Star sx={{ ml: 1, color: 'warning.main' }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Out of 5.0
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h3">
                    {analytics.totalSessions > 0
                      ? ((analytics.outcomes.solved / analytics.totalSessions) * 100).toFixed(0)
                      : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Problems solved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Sessions by Subject
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { subject: 'Math', sessions: analytics.sessionsBySubject.math },
                      { subject: 'Physics', sessions: analytics.sessionsBySubject.physics },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#ea9b20" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Outcomes Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { outcome: 'Solved', count: analytics.outcomes.solved },
                      { outcome: 'Needs Review', count: analytics.outcomes.needs_review },
                      { outcome: 'Abandoned', count: analytics.outcomes.abandoned },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="outcome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ea9b20" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Course Document</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Subject"
            value={uploadForm.subject}
            onChange={(e) => setUploadForm({ ...uploadForm, subject: e.target.value })}
            margin="normal"
          >
            {subjects.map((subject) => (
              <MenuItem key={subject.id} value={subject.id}>
                {subject.icon} {subject.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Title"
            value={uploadForm.title}
            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={uploadForm.description}
            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Chapter"
            value={uploadForm.chapter}
            onChange={(e) => setUploadForm({ ...uploadForm, chapter: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Teaching Guidelines"
            value={uploadForm.guidelines}
            onChange={(e) => setUploadForm({ ...uploadForm, guidelines: e.target.value })}
            margin="normal"
            multiline
            rows={4}
            placeholder="Enter specific instructions for the AI tutor: teaching approach, key concepts to emphasize, common student mistakes to address, scaffolding preferences, etc."
            helperText="These guidelines will help the AI tutor understand your teaching philosophy and adapt its responses accordingly."
          />
          <Button variant="outlined" component="label" fullWidth sx={{ mt: 2 }}>
            Select File (PDF, TXT, DOC)
            <input
              type="file"
              hidden
              accept=".pdf,.txt,.doc,.docx"
              onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
            />
          </Button>
          {uploadForm.file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: {uploadForm.file.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUploadDocument}
            disabled={!uploadForm.title || !uploadForm.file}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Sessions Dialog */}
      <Dialog
        open={sessionDialog}
        onClose={() => setSessionDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Sessions for {selectedStudent?.firstName} {selectedStudent?.lastName}
        </DialogTitle>
        <DialogContent>
          {selectedSession ? (
            <Box>
              <Button onClick={() => setSelectedSession(null)} sx={{ mb: 2 }}>
                ← Back to List
              </Button>
              <Typography variant="h6" gutterBottom>
                Session Details
              </Typography>
              <Typography><strong>Subject:</strong> {selectedSession.subject.toUpperCase()}</Typography>
              <Typography><strong>Question:</strong> {selectedSession.question}</Typography>
              <Typography><strong>Outcome:</strong> {selectedSession.outcome}</Typography>
              <Typography><strong>Mode:</strong> {selectedSession.mode}</Typography>
              <Typography><strong>Hints Given:</strong> {selectedSession.hintsGiven}</Typography>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Conversation
              </Typography>
              {selectedSession.conversation?.map((msg, idx) => (
                <Paper 
                  key={idx} 
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    bgcolor: msg.role === 'user' ? 'grey.100' : 'primary.light',
                    borderLeft: msg.role === 'assistant' ? '4px solid #ea9b20' : 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">
                      <strong>{msg.role === 'user' ? '👨‍🎓 Student' : '🤖 AI Tutor'}</strong>
                      {msg.mode && <Chip label={msg.mode.toUpperCase()} size="small" sx={{ ml: 1 }} />}
                    </Typography>
                    {msg.timestamp && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                  {msg.sources && msg.sources.length > 0 && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        📚 Sources: {msg.sources.map(s => s.title).join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}

              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  💡 Reward the AI Agent
                </Typography>
                <Typography variant="body2" paragraph>
                  Your evaluation helps the AI tutor learn and improve. Rate the pedagogical quality of this session.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Star />}
                  onClick={() => setEvaluationDialog(true)}
                  sx={{ mt: 1 }}
                >
                  {selectedSession.teacherRating ? 'Update Evaluation' : 'Evaluate & Reward'}
                </Button>
                {selectedSession.teacherRating && (
                  <Chip 
                    label={`Current Rating: ${selectedSession.teacherRating}/5 ⭐`} 
                    color="success" 
                    sx={{ ml: 2 }}
                  />
                )}
              </Box>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell>Outcome</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Hints</TableCell>
                    <TableCell>Student Rating</TableCell>
                    <TableCell>Teacher Rating</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.subject.toUpperCase()}</TableCell>
                      <TableCell>
                        <Chip label={session.outcome} size="small" />
                      </TableCell>
                      <TableCell>{session.mode || 'N/A'}</TableCell>
                      <TableCell>{session.hintsGiven}</TableCell>
                      <TableCell>
                        {session.studentRating ? `★ ${session.studentRating}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {session.teacherRating ? `★ ${session.teacherRating}` : 'Not rated'}
                      </TableCell>
                      <TableCell>{new Date(session.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => viewSessionDetails(session)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={evaluationDialog} onClose={() => setEvaluationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star sx={{ color: 'warning.main' }} />
            Evaluate AI Tutor Performance
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Your evaluation directly influences the AI's reward signal and helps it learn better teaching strategies.
          </Typography>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Pedagogical Quality Rating:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <Button
                key={r}
                variant={evaluation.rating === r ? 'contained' : 'outlined'}
                onClick={() => setEvaluation({ ...evaluation, rating: r })}
                sx={{ minWidth: 60, height: 60, flexDirection: 'column' }}
              >
                <Star sx={{ fontSize: 24, color: evaluation.rating === r ? 'white' : 'warning.main' }} />
                <Typography variant="caption">{r}</Typography>
              </Button>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Consider: Did the AI provide appropriate scaffolding? Were hints well-paced? Did it encourage student thinking?
          </Typography>

          <TextField
            fullWidth
            label="Detailed Feedback (Optional)"
            multiline
            rows={5}
            value={evaluation.feedback}
            onChange={(e) => setEvaluation({ ...evaluation, feedback: e.target.value })}
            placeholder="What did the AI do well? What could be improved? Were there any pedagogical concerns?"
            helperText="Your detailed feedback helps developers improve the AI tutor"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEvaluationDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleEvaluateSession}
            startIcon={<Star />}
            size="large"
          >
            Submit Evaluation & Reward
          </Button>
        </DialogActions>
      </Dialog>

      {startTour && <TourEngine steps={tourConfigs.teacher} refs={tourRefs} />}
    </Box>
  );
}

