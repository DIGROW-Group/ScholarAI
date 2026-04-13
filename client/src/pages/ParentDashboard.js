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
  Alert,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  School,
  Logout,
  PersonAdd,
  TrendingUp,
  CalendarToday,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const COLORS = ['#FF6B35', '#424242', '#757575', '#FF8C5A'];

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const config = getConfig();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childOverview, setChildOverview] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [linkDialog, setLinkDialog] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildData(selectedChild.id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      const res = await api.get('/parent/children');
      setChildren(res.data.children);
      if (res.data.children.length > 0 && !selectedChild) {
        setSelectedChild(res.data.children[0]);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
    }
  };

  const loadChildData = async (childId) => {
    try {
      const [overviewRes, attendanceRes, alertsRes] = await Promise.all([
        api.get(`/parent/child/${childId}/overview`),
        api.get(`/parent/child/${childId}/attendance?days=30`),
        api.get(`/parent/child/${childId}/alerts`),
      ]);
      
      setChildOverview(overviewRes.data);
      setAttendance(attendanceRes.data.attendance);
      setAlerts(alertsRes.data.alerts);
    } catch (error) {
      console.error('Failed to load child data:', error);
    }
  };

  const handleLinkChild = async () => {
    try {
      await api.post('/parent/children/link', { studentEmail });
      setLinkDialog(false);
      setStudentEmail('');
      loadChildren();
      alert('Child linked successfully!');
    } catch (error) {
      console.error('Failed to link child:', error);
      alert(error.response?.data?.error || 'Failed to link child');
    }
  };

  const getAttendanceChartData = () => {
    if (!attendance.length) return [];
    
    return attendance.slice(0, 7).reverse().map((a) => ({
      date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: a.status === 'present' ? 1 : a.status === 'late' ? 0.5 : 0,
    }));
  };

  const getAttendancePieData = () => {
    if (!childOverview?.attendance) return [];
    
    const { presentDays, lateDays, absentDays } = childOverview.attendance;
    return [
      { name: 'Present', value: presentDays },
      { name: 'Late', value: lateDays },
      { name: 'Absent', value: absentDays },
    ].filter(item => item.value > 0);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" sx={{ bgcolor: '#757575' }}>
        <Toolbar>
          <Box sx={{ p: 1 }}>
            <Box
              component="img"
              src={config.logoImage}
              alt={`${config.name} Logo`}
              key={`parent-logo-${config.logoImage}`}
              sx={{
                height: 72,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
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
        {/* Child Selector */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Select Child
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {children.map((child) => (
                  <Chip
                    key={child.id}
                    label={`${child.firstName} ${child.lastName}`}
                    color={selectedChild?.id === child.id ? 'primary' : 'default'}
                    onClick={() => setSelectedChild(child)}
                  />
                ))}
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={() => setLinkDialog(true)}
            >
              Link Child
            </Button>
          </Box>
        </Paper>

        {selectedChild && childOverview ? (
          <>
            {/* Alerts Section */}
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').slice(0, 3).length > 0 && (
              <Box sx={{ mb: 3 }}>
                {alerts
                  .filter(a => a.severity === 'critical' || a.severity === 'warning')
                  .slice(0, 3)
                  .map((alert) => (
                    <Alert
                      key={alert.id}
                      severity={alert.severity}
                      icon={<Warning />}
                      sx={{ mb: 1 }}
                    >
                      <strong>{alert.title}</strong>: {alert.message}
                    </Alert>
                  ))}
              </Box>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Attendance Rate
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h3">
                        {(childOverview.attendance.attendanceRate * 100).toFixed(0)}%
                      </Typography>
                      {childOverview.attendance.attendanceRate >= 0.9 ? (
                        <CheckCircle color="success" sx={{ ml: 1 }} />
                      ) : (
                        <Warning color="warning" sx={{ ml: 1 }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Last 30 days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Weekly Sessions
                    </Typography>
                    <Typography variant="h3">{childOverview.engagement.sessionsThisWeek}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total time: {childOverview.engagement.totalTimeThisWeek} min
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tutor Satisfaction
                    </Typography>
                    <Typography variant="h3">
                      {childOverview.engagement.tutorSatisfaction}
                      {childOverview.engagement.tutorSatisfaction !== 'N/A' && '%'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Based on student feedback
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Grade
                    </Typography>
                    <Typography variant="h3">{childOverview.student.grade || 'N/A'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current grade level
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Performance Overview */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Subject Mastery
                  </Typography>
                  {Object.entries(childOverview.performance.masteryLevels).map(([subject, level]) => (
                    <Box key={subject} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body1">{subject.toUpperCase()}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {(level * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={level * 100}
                        sx={{ height: 10, borderRadius: 1 }}
                      />
                    </Box>
                  ))}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" gutterBottom>
                    Strengths
                  </Typography>
                  <List dense>
                    {childOverview.performance.strengths.length > 0 ? (
                      childOverview.performance.strengths.map((strength, idx) => (
                        <ListItem key={idx}>
                          <CheckCircle color="success" sx={{ mr: 1, fontSize: 20 }} />
                          <ListItemText primary={strength} />
                        </ListItem>
                      ))
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Strengths will be identified as your child progresses
                      </Typography>
                    )}
                  </List>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Areas to Improve
                  </Typography>
                  <List dense>
                    {childOverview.performance.weaknesses.length > 0 ? (
                      childOverview.performance.weaknesses.map((weakness, idx) => (
                        <ListItem key={idx}>
                          <ListItemText primary={weakness} />
                        </ListItem>
                      ))
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        No specific weaknesses identified
                      </Typography>
                    )}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Attendance Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={getAttendancePieData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => entry.name}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getAttendancePieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                    <Grid item xs={6}>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Present Days"
                            secondary={childOverview.attendance.presentDays}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Late Arrivals"
                            secondary={childOverview.attendance.lateDays}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Absences"
                            secondary={childOverview.attendance.absentDays}
                          />
                        </ListItem>
                      </List>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Orientation Recommendations */}
                {childOverview.orientationFlags.length > 0 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Personalized Recommendations
                    </Typography>
                    {childOverview.orientationFlags.slice(0, 3).map((flag, idx) => (
                      <Alert key={idx} severity="info" sx={{ mb: 1 }}>
                        <Typography variant="body2">{flag.recommendations}</Typography>
                      </Alert>
                    ))}
                  </Paper>
                )}
              </Grid>

              {/* Recent Attendance Detail */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Attendance (Last 30 Days)
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Check-In Time</TableCell>
                          <TableCell>Check-Out Time</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Anomalies</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendance.slice(0, 10).map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                            <TableCell>{record.checkInTime || 'N/A'}</TableCell>
                            <TableCell>{record.checkOutTime || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip
                                label={record.status}
                                size="small"
                                color={
                                  record.status === 'present'
                                    ? 'success'
                                    : record.status === 'late'
                                    ? 'warning'
                                    : 'error'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {record.anomalies && record.anomalies.length > 0
                                ? record.anomalies.map((a) => a.description).join('; ')
                                : 'None'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* All Alerts */}
              {alerts.length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      All Alerts & Notifications
                    </Typography>
                    <List>
                      {alerts.map((alert) => (
                        <ListItem key={alert.id} divider>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label={alert.type} size="small" />
                                <Chip label={alert.severity} size="small" color={alert.severity === 'critical' ? 'error' : 'warning'} />
                                <Typography variant="body1">{alert.title}</Typography>
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="body2">{alert.message}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(alert.createdAt).toLocaleString()}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {children.length === 0
                ? 'No children linked. Click "Link Child" to get started.'
                : 'Select a child to view their dashboard'}
            </Typography>
          </Paper>
        )}
      </Container>

      {/* Link Child Dialog */}
      <Dialog open={linkDialog} onClose={() => setLinkDialog(false)}>
        <DialogTitle>Link Child to Your Account</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your child's registered email address to link their account.
          </Typography>
          <TextField
            fullWidth
            label="Child's Email"
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLinkChild}
            disabled={!studentEmail}
          >
            Link Child
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

