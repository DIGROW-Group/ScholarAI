import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Logout,
  PersonAdd,
  TrendingUp,
  CalendarToday,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import SessionListSkeleton from '../components/skeletons/SessionListSkeleton';
import AttendanceTableSkeleton from '../components/skeletons/AttendanceTableSkeleton';
import StatCardSkeleton from '../components/skeletons/StatCardSkeleton';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import TourEngine from '../components/OnboardingTour/TourEngine';
import { tourConfigs } from '../components/OnboardingTour/tourConfigs';
import useForm from '../hooks/useForm';

const COLORS = ['#FF6B35', '#424242', '#757575', '#FF8C5A'];

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const { show } = useSnackbar();
  const config = getConfig();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childOverview, setChildOverview] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenError, setChildrenError] = useState(null);
  const [childLoading, setChildLoading] = useState(false);
  const [childDataError, setChildDataError] = useState(null);
  const [linkDialog, setLinkDialog] = useState(false);
  const [startTour, setStartTour] = useState(false);
  const [resolvedTourSteps, setResolvedTourSteps] = useState([]);
  const onboardingCompleted = user?.onboardingCompleted;
  const userId = user?.id;

  const validateLinkChild = (values) => {
    const errors = {};
    if (!values.studentEmail?.trim()) {
      errors.studentEmail = 'Child email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(values.studentEmail.trim())) {
      errors.studentEmail = 'Enter a valid email address';
    }
    return errors;
  };

  const {
    values: linkForm,
    errors: linkErrors,
    touched: linkTouched,
    handleChange: handleLinkChange,
    handleBlur: handleLinkBlur,
    submit: submitLink,
    setValues: setLinkForm,
  } = useForm({ studentEmail: '' }, validateLinkChild);

  const tourRefs = {
    childSelector: useRef(null),
    linkChildButton: useRef(null),
    summaryCards: useRef(null),
    masteryBars: useRef(null),
    attendancePie: useRef(null),
    alertsPanel: useRef(null),
  };

  useEffect(() => {
    if (selectedChild) {
      loadChildData(selectedChild.id);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (!userId || onboardingCompleted) return;
    const timer = setTimeout(() => setStartTour(true), 800);
    return () => clearTimeout(timer);
  }, [userId, onboardingCompleted]);

  useEffect(() => {
    if (!startTour) return;

    if (children.length === 0) {
      setResolvedTourSteps(
        tourConfigs.parent.filter((step) => ['childSelector', 'linkChildButton'].includes(step.refKey))
      );
      return;
    }

    setResolvedTourSteps(tourConfigs.parent);
  }, [startTour, children.length]);

  const loadChildren = useCallback(async () => {
    try {
      setChildrenLoading(true);
      setChildrenError(null);
      const res = await api.get('/parent/children');
      setChildren(res.data.children);
      if (res.data.children.length > 0) {
        setSelectedChild((currentSelected) => currentSelected || res.data.children[0]);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
      setChildrenError(error);
      show('Failed to load children', 'error');
    } finally {
      setChildrenLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const loadChildData = async (childId) => {
    try {
      setChildLoading(true);
      setChildDataError(null);
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
      setChildDataError(error);
      show('Failed to load child data', 'error');
    } finally {
      setChildLoading(false);
    }
  };

  const handleLinkChild = async () => {
    await submitLink(async (values) => {
      try {
        await api.post('/parent/children/link', { studentEmail: values.studentEmail.trim() });
        setLinkDialog(false);
        setLinkForm({ studentEmail: '' });

        loadChildren();
        show('Child linked successfully!', 'success');
      } catch (error) {
        console.error('Failed to link child:', error);
        show(error.response?.data?.error || 'Failed to link child', 'error');
      }
    });
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
        <Paper ref={tourRefs.childSelector} sx={{ p: 2, mb: 3 }}>
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
              ref={tourRefs.linkChildButton}
            >
              Link Child
            </Button>
          </Box>
        </Paper>

        {selectedChild && childOverview ? (
          <>
            {/* Alerts Section */}
            <Box ref={tourRefs.alertsPanel} sx={{ mb: 3 }}>
              {childLoading ? (
                <SessionListSkeleton rows={2} />
              ) : alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').slice(0, 3).length > 0 ? (
                alerts
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
                  ))
              ) : (
                <EmptyState icon="✅" title="No alerts" description="You're all caught up." />
              )}
            </Box>

            {/* Summary Cards */}
            <Grid ref={tourRefs.summaryCards} container spacing={3} sx={{ mb: 3 }}>
              {childLoading ? (
                <Grid item xs={12}>
                  <StatCardSkeleton />
                </Grid>
              ) : !childOverview ? (
                <Grid item xs={12}>
                  <EmptyState icon="📋" title="No data available" description="Link a child account to see their stats." />
                </Grid>
              ) : null}
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
                <Paper ref={tourRefs.masteryBars} sx={{ p: 3 }}>
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
                <Paper ref={tourRefs.attendancePie} sx={{ p: 3, mb: 3 }}>
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
                      {childLoading ? (
                        <AttendanceTableSkeleton rows={5} />
                      ) : attendance.length === 0 ? (
                        <EmptyState icon="📅" title="No attendance records" description="Attendance will appear here once your child starts checking in." />
                      ) : (
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
                      )}
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
        ) : childrenLoading ? (
          <SessionListSkeleton rows={2} />
        ) : childrenError ? (
          <EmptyState
            variant="error"
            icon="📋"
            title="Couldn't load linked children"
            description="Please try again in a moment."
            actionLabel="Retry"
            onAction={loadChildren}
          />
        ) : childDataError ? (
          <EmptyState
            variant="error"
            icon="📋"
            title="Couldn't load child dashboard"
            description="Please select a child again or retry."
            actionLabel="Retry"
            onAction={() => selectedChild && loadChildData(selectedChild.id)}
          />
        ) : (
          <EmptyState
            icon="📋"
            title={children.length === 0 ? 'No children linked' : 'No child selected'}
            description={
              children.length === 0
                ? 'Link a child account to see their stats.'
                : 'Select a child to view their dashboard.'
            }
            actionLabel="Link child"
            onAction={() => setLinkDialog(true)}
          />
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
            name="studentEmail"
            type="email"
            value={linkForm.studentEmail}
            onChange={handleLinkChange}
            onBlur={handleLinkBlur}
            margin="normal"
            error={Boolean(linkTouched.studentEmail && linkErrors.studentEmail)}
            helperText={linkTouched.studentEmail ? linkErrors.studentEmail : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLinkChild}
            disabled={!linkForm.studentEmail}
          >
            Link Child
          </Button>
        </DialogActions>
      </Dialog>

      {startTour && <TourEngine steps={resolvedTourSteps} refs={tourRefs} />}
    </Box>
  );
}

