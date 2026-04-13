import React, { useState, useEffect } from 'react';
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
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
} from '@mui/material';
import {
  School,
  Logout,
  Send,
  CheckCircle,
  Schedule,
  TrendingUp,
  Lightbulb,
  Login as LoginIcon,
  LogoutOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const config = getConfig();
  const [tabValue, setTabValue] = useState(0);
  
  // Tutor state
  const [subject, setSubject] = useState('math');
  const [question, setQuestion] = useState('');
  
  // All available subjects
  const subjects = [
    { id: 'math', label: 'Maths', icon: '📐' },
    { id: 'physics', label: 'Physics', icon: '⚛️' },
    { id: 'arabic', label: 'Arabic', icon: '🇲🇦' },
    { id: 'english', label: 'English', icon: '🇬🇧' },
    { id: 'french', label: 'French', icon: '🇫🇷' },
    { id: 'informatique', label: 'IT', icon: '💻' },
  ];
  const [sessionId, setSessionId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [outcome, setOutcome] = useState('solved');

  // Progress state
  const [progress, setProgress] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [orientation, setOrientation] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [progressRes, sessionsRes, attendanceRes, alertsRes] = await Promise.all([
        api.get('/student/progress'),
        api.get('/tutor/sessions?limit=10'),
        api.get('/student/attendance?days=7'),
        api.get('/student/alerts'),
      ]);
      
      setProgress(progressRes.data);
      setSessions(sessionsRes.data.sessions);
      setAttendance(attendanceRes.data.attendance);
      setAlerts(alertsRes.data.alerts);
      setAvailableSubjects(progressRes.data.availableSubjects || subjects.map(s => s.id));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Filter subjects based on classroom availability
  const filteredSubjects = subjects.filter(s => availableSubjects.includes(s.id));

  const loadOrientation = async () => {
    try {
      const res = await api.get('/student/orientation');
      setOrientation(res.data);
    } catch (error) {
      console.error('Failed to load orientation:', error);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/tutor/ask', {
        subject,
        question,
        sessionId,
      });

      setSessionId(res.data.sessionId);
      setConversation([
        ...conversation,
        { role: 'user', content: question },
        {
          role: 'assistant',
          content: res.data.answer,
          mode: res.data.mode,
          sources: res.data.sources,
        },
      ]);
      setQuestion('');
    } catch (error) {
      console.error('Failed to ask question:', error);
    }
    setLoading(false);
  };

  const handleSubmitFeedback = async () => {
    try {
      await api.post('/tutor/feedback', {
        sessionId,
        rating,
        outcome,
      });
      setFeedbackDialog(false);
      setSessionId(null);
      setConversation([]);
      loadData();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await api.post('/student/checkin', {});
      loadData();
      alert('Checked in successfully!');
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/student/checkout', {});
      loadData();
      alert('Checked out successfully!');
    } catch (error) {
      console.error('Check-out failed:', error);
      alert(error.response?.data?.error || 'Check-out failed');
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
                key={`student-logo-${config.logoImage}`}
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
              <Tab label="AI Tutor" />
              <Tab label="My Progress" />
              <Tab label="Orientation" />
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
        {/* Attendance Section */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Attendance
              </Typography>
              {attendance && (
                <Typography variant="body2" color="text.secondary">
                  This Week: {attendance.presentDays} present, {attendance.lateDays} late, {attendance.absentDays} absent
                  <br />
                  Attendance Rate: {(attendance.attendanceRate * 100).toFixed(0)}%
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={handleCheckIn}
                sx={{ mr: 1 }}
              >
                Check In
              </Button>
              <Button
                variant="outlined"
                startIcon={<LogoutOutlined />}
                onClick={handleCheckOut}
              >
                Check Out
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {alerts.slice(0, 3).map((alert) => (
              <Alert
                key={alert.id}
                severity={alert.severity}
                sx={{ mb: 1 }}
              >
                <strong>{alert.title}</strong>: {alert.message}
              </Alert>
            ))}
          </Box>
        )}

        {/* Tab 0: AI Tutor */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, minHeight: 500 }}>
                <Typography variant="h6" gutterBottom>AI Tutor Q&A</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select a subject and ask your question
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
                  {filteredSubjects.length === 0 && (
                    <Alert severity="warning" sx={{ width: '100%' }}>
                      No subjects available. Please contact your teacher or admin to be assigned to a classroom.
                    </Alert>
                  )}
                  {filteredSubjects.map((subj) => (
                    <Chip
                      key={subj.id}
                      label={`${subj.icon} ${subj.label}`}
                      color={subject === subj.id ? 'primary' : 'default'}
                      onClick={() => {
                        setSubject(subj.id);
                        setSessionId(null);
                        setConversation([]);
                      }}
                      sx={{ fontSize: '0.9rem', py: 2.5 }}
                    />
                  ))}
                </Box>
                
                <Box sx={{ maxHeight: 350, overflowY: 'auto', mb: 2 }}>
                  {conversation.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      {filteredSubjects.length > 0 
                        ? `Ask a question to get started with ${subjects.find(s => s.id === subject)?.label} tutoring!`
                        : 'Please contact your teacher to be assigned to a classroom.'}
                    </Typography>
                  ) : (
                    conversation.map((msg, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          mb: 2,
                          p: 2,
                          bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                          borderRadius: 2,
                          color: msg.role === 'user' ? 'white' : 'text.primary',
                        }}
                      >
                        <Typography variant="body2">
                          <strong>{msg.role === 'user' ? 'You' : 'AI Tutor'}:</strong>
                          {msg.mode && <Chip label={msg.mode} size="small" sx={{ ml: 1 }} />}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </Typography>
                        {msg.sources && msg.sources.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              Sources: {msg.sources.map(s => s.title).join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ))
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Ask your question here..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAskQuestion}
                    disabled={loading || !question.trim()}
                    sx={{ minWidth: 100 }}
                  >
                    {loading ? <CircularProgress size={24} /> : <Send />}
                  </Button>
                </Box>

                {sessionId && (
                  <Button
                    variant="outlined"
                    onClick={() => setFeedbackDialog(true)}
                    sx={{ mt: 2 }}
                  >
                    End Session & Give Feedback
                  </Button>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Sessions
                </Typography>
                <List dense>
                  {sessions.slice(0, 5).map((session) => (
                    <ListItem key={session.id}>
                      <ListItemText
                        primary={session.subject.toUpperCase()}
                        secondary={`${session.outcome} - ${new Date(session.createdAt).toLocaleDateString()}`}
                      />
                      {session.studentRating && (
                        <Chip label={`★ ${session.studentRating}`} size="small" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Paper>

              {progress && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Mastery Levels
                  </Typography>
                  {Object.entries(progress.masteryLevels).map(([subject, level]) => (
                    <Box key={subject} sx={{ mb: 2 }}>
                      <Typography variant="body2">{subject.toUpperCase()}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={level * 100}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="caption">{(level * 100).toFixed(0)}%</Typography>
                    </Box>
                  ))}
                </Paper>
              )}
            </Grid>
          </Grid>
        )}

        {/* Tab 1: My Progress */}
        {tabValue === 1 && progress && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Strengths
                  </Typography>
                  <List>
                    {progress.strengths.length > 0 ? (
                      progress.strengths.map((strength, idx) => (
                        <ListItem key={idx}>
                          <CheckCircle color="success" sx={{ mr: 1 }} />
                          <ListItemText primary={strength} />
                        </ListItem>
                      ))
                    ) : (
                      <Typography color="text.secondary">Keep working - strengths will be identified!</Typography>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Areas to Improve
                  </Typography>
                  <List>
                    {progress.weaknesses.length > 0 ? (
                      progress.weaknesses.map((weakness, idx) => (
                        <ListItem key={idx}>
                          <ListItemText primary={weakness} />
                        </ListItem>
                      ))
                    ) : (
                      <Typography color="text.secondary">No weaknesses identified yet!</Typography>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Learning Style: {progress.learningStyle || 'Being determined...'}
                  </Typography>
                  {progress.recommendedFocus && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <strong>Recommended Focus:</strong> {progress.recommendedFocus}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 2: Orientation */}
        {tabValue === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
              Personalized Guidance
            </Typography>
            
            {orientation ? (
              <>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                  {orientation.recommendations}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Your Analysis Summary
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Engagement"
                      secondary={`${orientation.analysis.engagement.avgSessionsPerWeek.toFixed(1)} sessions per week`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Success Rate"
                      secondary={`${(orientation.analysis.performance.successRate * 100).toFixed(0)}%`}
                    />
                  </ListItem>
                </List>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Button variant="contained" onClick={loadOrientation}>
                  Generate Personalized Recommendations
                </Button>
              </Box>
            )}
          </Paper>
        )}
      </Container>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onClose={() => setFeedbackDialog(false)}>
        <DialogTitle>Session Feedback</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>How helpful was this session?</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <Chip
                key={r}
                label={`★ ${r}`}
                color={rating === r ? 'primary' : 'default'}
                onClick={() => setRating(r)}
              />
            ))}
          </Box>
          <Typography gutterBottom>Outcome:</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Solved"
              color={outcome === 'solved' ? 'success' : 'default'}
              onClick={() => setOutcome('solved')}
            />
            <Chip
              label="Needs Review"
              color={outcome === 'needs_review' ? 'warning' : 'default'}
              onClick={() => setOutcome('needs_review')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitFeedback}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

