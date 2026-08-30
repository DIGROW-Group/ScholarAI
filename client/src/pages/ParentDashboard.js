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
  Avatar,
  Tooltip as MuiTooltip,
  MenuItem
} from '@mui/material';
import {
  Logout,
  PersonAdd,
  TrendingUp,
  CalendarToday,
  Warning,
  CheckCircle,
  School,
  Brightness4,
  Brightness7,
  HelpOutline,
  FilterList,
  Notifications,
  ArrowForward,
  Star,
  Info
} from '@mui/icons-material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { useColorMode } from '../context/ColorModeContext';
import SessionListSkeleton from '../components/skeletons/SessionListSkeleton';
import AttendanceTableSkeleton from '../components/skeletons/AttendanceTableSkeleton';
import StatCardSkeleton from '../components/skeletons/StatCardSkeleton';
import EmptyState from '../components/EmptyState';
import api from '../services/api';
import TourEngine from '../components/OnboardingTour/TourEngine';
import { tourConfigs } from '../components/OnboardingTour/tourConfigs';
import useForm from '../hooks/useForm';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const subjectLabels = {
  math: '📐 Mathématiques',
  physics: '⚡ Physique-Chimie',
  french: '📖 Français',
  english: '🇬🇧 Anglais',
  arabic: '🌙 Arabe',
  informatique: '💻 Informatique'
};

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const { show } = useSnackbar();
  const colorMode = useColorMode();
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
  
  // Filters
  const [alertCategoryFilter, setAlertCategoryFilter] = useState('all');
  const [attendancePeriodDays, setAttendancePeriodDays] = useState(30);

  const onboardingCompleted = user?.onboardingCompleted;
  const userId = user?.id;

  const validateLinkChild = (values) => {
    const errors = {};
    if (!values.studentEmail?.trim()) {
      errors.studentEmail = 'L\'adresse email de l\'enfant est requise';
    } else if (!/^\S+@\S+\.\S+$/.test(values.studentEmail.trim())) {
      errors.studentEmail = 'Veuillez saisir une adresse email valide';
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
      loadChildData(selectedChild.id, attendancePeriodDays);
    }
  }, [selectedChild, attendancePeriodDays]);

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
      setChildren(res.data.children || []);
      if (res.data.children && res.data.children.length > 0) {
        setSelectedChild((currentSelected) => currentSelected || res.data.children[0]);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
      setChildrenError(error);
      show('Échec du chargement de la liste des enfants', 'error');
    } finally {
      setChildrenLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const loadChildData = async (childId, days = 30) => {
    try {
      setChildLoading(true);
      setChildDataError(null);
      const [overviewRes, attendanceRes, alertsRes] = await Promise.all([
        api.get('/parent/child/' + childId + '/overview'),
        api.get('/parent/child/' + childId + '/attendance?days=' + days),
        api.get('/parent/child/' + childId + '/alerts'),
      ]);
      
      setChildOverview(overviewRes.data);
      setAttendance(attendanceRes.data.attendance || []);
      setAlerts(alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Failed to load child data:', error);
      setChildDataError(error);
      show('Erreur lors du chargement des données de l\'enfant', 'error');
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
        show('Enfant associé avec succès !', 'success');
      } catch (error) {
        console.error('Failed to link child:', error);
        show(error.response?.data?.error || 'Échec de l\'association de l\'enfant', 'error');
      }
    });
  };

  const getAttendancePieData = () => {
    if (!childOverview?.attendance) return [];
    
    const { presentDays, lateDays, absentDays } = childOverview.attendance;
    return [
      { name: 'Présent(e)', value: presentDays || 0 },
      { name: 'En Retard', value: lateDays || 0 },
      { name: 'Absent(e)', value: absentDays || 0 },
    ].filter(item => item.value > 0);
  };

  const filteredAlerts = alerts.filter(a => {
    if (alertCategoryFilter === 'all') return true;
    if (alertCategoryFilter === 'attendance') return a.type === 'attendance' || (a.title && a.title.toLowerCase().includes('retard')) || (a.title && a.title.toLowerCase().includes('absenc'));
    if (alertCategoryFilter === 'academic') return a.type === 'homework' || a.type === 'quiz' || a.type === 'academic';
    if (alertCategoryFilter === 'orientation') return a.type === 'orientation';
    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* NAVBAR: EXACT 100% IDENTICAL STRUCTURE & STYLES AS STUDENT & TEACHER DASHBOARDS */}
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
          borderBottom: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0')
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left: Brand Logo & Role Badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: 2,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}>
              <School sx={{ fontSize: 22, color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                ScholarAI
              </Typography>
              <Chip
                label="Espace Parent"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                  color: '#6366F1'
                }}
              />
            </Box>
          </Box>

          {/* Center Title */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={800} color="text.secondary">
              👨‍👩‍👧 Suivi Pédagogique & Assiduité des Enfants
            </Typography>
          </Box>

          {/* Right Controls: Dark/Light Mode, User Profile, Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={colorMode.toggleColorMode}
              title={colorMode.mode === 'dark' ? "Mode Sombre Activé (Cliquer pour Mode Clair)" : "Mode Clair Activé (Cliquer pour Mode Sombre)"}
              sx={{
                bgcolor: colorMode.mode === 'dark' ? '#334155' : '#EEF2FF',
                p: 1,
                '&:hover': { bgcolor: colorMode.mode === 'dark' ? '#475569' : '#E0E7FF' }
              }}
            >
              {colorMode.mode === 'dark' ? <Brightness7 sx={{ color: '#FCD34D' }} /> : <Brightness4 sx={{ color: '#6366F1' }} />}
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#6366F1', color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                {user?.firstName?.charAt(0) || 'P'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  Parent d'élève
                </Typography>
              </Box>
            </Box>

            <IconButton onClick={logout} title="Se déconnecter" sx={{ color: 'text.secondary', ml: 0.5 }}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Child Selector Toolbar */}
        <Paper
          ref={tourRefs.childSelector}
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3.5,
            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
            boxShadow: colorMode.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 12px rgba(99, 102, 241, 0.05)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', width: 44, height: 44, borderRadius: 2.5 }}>
                👨‍👩‍👧
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                  Sélectionner un Enfant à Suivre
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  {children.map((child) => (
                    <Chip
                      key={child.id}
                      avatar={<Avatar sx={{ bgcolor: '#4F46E5', color: '#fff' }}>{child.firstName ? child.firstName[0] : 'E'}</Avatar>}
                      label={child.firstName + ' ' + child.lastName + ' (' + (child.grade || '1ère Bac') + ')'}
                      variant={selectedChild?.id === child.id ? 'filled' : 'outlined'}
                      color={selectedChild?.id === child.id ? 'primary' : 'default'}
                      onClick={() => setSelectedChild(child)}
                      sx={{ fontWeight: 800, cursor: 'pointer', py: 2, px: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setLinkDialog(true)}
              ref={tourRefs.linkChildButton}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 3px 12px rgba(79, 70, 229, 0.3)',
                px: 2.2
              }}
            >
              + Associer un Enfant
            </Button>
          </Box>
        </Paper>

        {selectedChild && childOverview ? (
          <>
            {/* Urgent Alerts Section with Timestamps */}
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
                      severity={alert.severity === 'critical' ? 'error' : 'warning'}
                      icon={<Warning />}
                      sx={{ mb: 1.2, borderRadius: 2.5, fontWeight: 600 }}
                    >
                      <strong>[{new Date(alert.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}] {alert.title}</strong> — {alert.message}
                    </Alert>
                  ))
              ) : (
                <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                  Aucune alerte critique. L'assiduité et le travail de {selectedChild.firstName} sont satisfaisants.
                </Alert>
              )}
            </Box>

            {/* 4 KPI Summary Cards */}
            <Grid ref={tourRefs.summaryCards} container spacing={3} sx={{ mb: 3 }}>
              {childLoading ? (
                <Grid item xs={12}>
                  <StatCardSkeleton />
                </Grid>
              ) : !childOverview ? (
                <Grid item xs={12}>
                  <EmptyState icon="📋" title="Aucune donnée disponible" description="Associez un compte enfant pour afficher ses statistiques." />
                </Grid>
              ) : null}

              {/* Card 1: Attendance Rate */}
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderRadius: 3.5, p: 2, height: '100%', bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Taux de Présence Global
                      </Typography>
                      <MuiTooltip title="Taux de présence calculé sur les 30 derniers jours de cours">
                        <IconButton size="small" sx={{ p: 0.2 }}>
                          <HelpOutline sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </IconButton>
                      </MuiTooltip>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
                      <Typography variant="h3" fontWeight={900} color={childOverview.attendance.attendanceRate >= 0.9 ? '#10B981' : '#F59E0B'}>
                        {(childOverview.attendance.attendanceRate * 100).toFixed(0)}%
                      </Typography>
                      {childOverview.attendance.attendanceRate >= 0.9 ? (
                        <CheckCircle color="success" sx={{ ml: 1, fontSize: 28 }} />
                      ) : (
                        <Warning color="warning" sx={{ ml: 1, fontSize: 28 }} />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {childOverview.attendance.presentDays || 0} jours de présence sur 30j
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 2: Weekly Sessions */}
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderRadius: 3.5, p: 2, height: '100%', bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Sessions Hebdomadaires
                      </Typography>
                      <Chip label="IA Tutorat" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', bgcolor: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' }} />
                    </Box>

                    <Typography variant="h3" fontWeight={900} color="#6366F1" sx={{ my: 0.5 }}>
                      {childOverview.engagement.sessionsThisWeek}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Temps d'apprentissage : {childOverview.engagement.totalTimeThisWeek} min
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 3: Tutor Satisfaction */}
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderRadius: 3.5, p: 2, height: '100%', bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Satisfaction Tuteur IA
                      </Typography>
                      <Star sx={{ color: '#F59E0B', fontSize: 20 }} />
                    </Box>

                    <Typography variant="h3" fontWeight={900} color="#F59E0B" sx={{ my: 0.5 }}>
                      {childOverview.engagement.tutorSatisfaction}
                      {childOverview.engagement.tutorSatisfaction !== 'N/A' && '%'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Basé sur l'évaluation de l'élève
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 4: Grade / School Level */}
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderRadius: 3.5, p: 2, height: '100%', bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Niveau Scolaire
                      </Typography>
                      <School sx={{ color: '#A855F7', fontSize: 20 }} />
                    </Box>

                    <Typography variant="h4" fontWeight={900} color="#A855F7" sx={{ my: 0.8 }}>
                      {childOverview.student.grade || '1ère Bac'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Filière Sciences Mathématiques
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Performance Overview (Mastery Bars, Strengths & Weaknesses) */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" ref={tourRefs.masteryBars} sx={{ p: 3, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <Typography variant="h6" fontWeight={900} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp sx={{ color: '#6366F1' }} />
                    Maîtrise des Matières du Programme
                  </Typography>

                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                    {Object.entries(childOverview.performance.masteryLevels || {}).map(([subjKey, rawLevel]) => {
                      const pct = Math.min(100, Math.max(0, Math.round(rawLevel > 1 ? rawLevel : rawLevel * 100)));
                      const displayLabel = subjectLabels[subjKey] || subjKey.toUpperCase();

                      return (
                        <Box key={subjKey}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={800} color="text.primary">
                              {displayLabel}
                            </Typography>
                            <Typography variant="body2" fontWeight={900} color="#6366F1">
                              {pct}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 10,
                              borderRadius: 2,
                              bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#EEF2FF',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                                background: pct >= 80 ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)' : 'linear-gradient(90deg, #6366F1 0%, #4F46E5 100%)'
                              }
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Strengths */}
                  <Typography variant="subtitle1" fontWeight={900} color="text.primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>💪</span> Points Forts Identifiés
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {childOverview.performance.strengths && childOverview.performance.strengths.length > 0 ? (
                      childOverview.performance.strengths.map((strength, idx) => (
                        <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                          <CheckCircle color="success" sx={{ mr: 1.2, fontSize: 18 }} />
                          <ListItemText primary={<Typography variant="body2" fontWeight={700} color="text.primary">{strength}</Typography>} />
                        </ListItem>
                      ))
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Les points forts seront automatiquement identifiés au fil des exercices.
                      </Typography>
                    )}
                  </List>

                  {/* Areas to Improve */}
                  <Typography variant="subtitle1" fontWeight={900} color="text.primary" gutterBottom sx={{ mt: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>🎯</span> Axes d'Amélioration Prioritaires
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {childOverview.performance.weaknesses && childOverview.performance.weaknesses.length > 0 ? (
                      childOverview.performance.weaknesses.map((weakness, idx) => (
                        <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                          <ArrowForward sx={{ mr: 1.2, fontSize: 18, color: '#F59E0B' }} />
                          <ListItemText primary={<Typography variant="body2" fontWeight={700} color="text.primary">{weakness}</Typography>} />
                        </ListItem>
                      ))
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Aucune faiblesse majeure détectée.
                      </Typography>
                    )}
                  </List>
                </Paper>
              </Grid>

              {/* Attendance Breakdown & Recommendations */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" ref={tourRefs.attendancePie} sx={{ p: 3, mb: 3, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <Typography variant="h6" fontWeight={900} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday sx={{ color: '#10B981' }} />
                    Bilan d'Assiduité (30 Derniers Jours)
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={getAttendancePieData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => entry.name}
                            outerRadius={65}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getAttendancePieData().map((entry, index) => (
                              <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <List dense disablePadding>
                        <ListItem sx={{ py: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10B981', mr: 1.5 }} />
                          <ListItemText
                            primary={<Typography variant="caption" fontWeight={800} color="text.secondary">Jours Présents</Typography>}
                            secondary={<Typography variant="body2" fontWeight={900} color="text.primary">{childOverview.attendance.presentDays || 0} jours</Typography>}
                          />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F59E0B', mr: 1.5 }} />
                          <ListItemText
                            primary={<Typography variant="caption" fontWeight={800} color="text.secondary">Retards Signalés</Typography>}
                            secondary={<Typography variant="body2" fontWeight={900} color="text.primary">{childOverview.attendance.lateDays || 0} fois</Typography>}
                          />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444', mr: 1.5 }} />
                          <ListItemText
                            primary={<Typography variant="caption" fontWeight={800} color="text.secondary">Absences</Typography>}
                            secondary={<Typography variant="body2" fontWeight={900} color="text.primary">{childOverview.attendance.absentDays || 0} jours</Typography>}
                          />
                        </ListItem>
                      </List>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Personalized Recommendations */}
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <Typography variant="h6" fontWeight={900} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>💡</span> Recommandations Pédagogiques
                  </Typography>
                  <Alert severity="info" icon={<Info />} sx={{ mb: 1.5, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF', color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5' }}>
                    <Typography variant="body2" fontWeight={700}>
                      Félicitations ! {selectedChild.firstName} fait preuve d'une excellente assiduité et d'un engagement constant en Mathématiques.
                    </Typography>
                  </Alert>
                  <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Encourager la pratique régulière sur la levée des formes indéterminées avant le prochain devoir surveillé.
                    </Typography>
                  </Alert>
                </Paper>
              </Grid>

              {/* Detailed Recent Attendance Table */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h6" fontWeight={900}>
                      📅 Historique Détaillé de Présence (30 Derniers Jours)
                    </Typography>

                    <TextField
                      select
                      size="small"
                      label="Période d'Assiduité"
                      value={attendancePeriodDays}
                      onChange={(e) => setAttendancePeriodDays(Number(e.target.value))}
                      sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    >
                      <MenuItem value={7}>7 derniers jours</MenuItem>
                      <MenuItem value={30}>30 derniers jours</MenuItem>
                      <MenuItem value={90}>90 derniers jours</MenuItem>
                    </TextField>
                  </Box>

                  {childLoading ? (
                    <AttendanceTableSkeleton rows={5} />
                  ) : attendance.length === 0 ? (
                    <EmptyState icon="📅" title="Aucun enregistrement d'assiduité" description="L'historique de présence s'affichera dès les premiers check-ins." />
                  ) : (
                    <TableContainer sx={{ borderRadius: 3, border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                      <Table>
                        <TableHead sx={{ bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 900 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 900 }}>Heure d'Arrivée</TableCell>
                            <TableCell sx={{ fontWeight: 900 }}>Heure de Sortie</TableCell>
                            <TableCell sx={{ fontWeight: 900 }}>Statut</TableCell>
                            <TableCell sx={{ fontWeight: 900 }}>Observations & Retards</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {attendance.slice(0, 15).map((record) => (
                            <TableRow key={record.id} hover>
                              <TableCell sx={{ fontWeight: 800 }}>
                                {new Date(record.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{record.checkInTime || '08:00'}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{record.checkOutTime || '15:30'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    record.status === 'present'
                                      ? 'Présent(e)'
                                      : record.status === 'late'
                                      ? 'En Retard'
                                      : record.status === 'early_departure'
                                      ? 'Départ Anticipé'
                                      : 'Absent(e)'
                                  }
                                  size="small"
                                  sx={{
                                    fontWeight: 800,
                                    bgcolor:
                                      record.status === 'present'
                                        ? 'rgba(16, 185, 129, 0.12)'
                                        : record.status === 'late'
                                        ? 'rgba(245, 158, 11, 0.12)'
                                        : 'rgba(239, 68, 68, 0.12)',
                                    color:
                                      record.status === 'present'
                                        ? '#10B981'
                                        : record.status === 'late'
                                        ? '#F59E0B'
                                        : '#EF4444'
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                {record.anomalies && record.anomalies.length > 0
                                  ? record.anomalies.map((a) => a.description).join('; ')
                                  : 'Aucune anomalie'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Grid>

              {/* All Alerts with Filter Category */}
              {alerts.length > 0 && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                      <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Notifications sx={{ color: '#F59E0B' }} />
                        Toutes les Alertes & Notifications ({filteredAlerts.length})
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="Toutes"
                          variant={alertCategoryFilter === 'all' ? 'filled' : 'outlined'}
                          color="primary"
                          onClick={() => setAlertCategoryFilter('all')}
                          sx={{ fontWeight: 800 }}
                        />
                        <Chip
                          label="⚠️ Assiduité"
                          variant={alertCategoryFilter === 'attendance' ? 'filled' : 'outlined'}
                          color="warning"
                          onClick={() => setAlertCategoryFilter('attendance')}
                          sx={{ fontWeight: 800 }}
                        />
                        <Chip
                          label="💡 Pédagogique"
                          variant={alertCategoryFilter === 'academic' ? 'filled' : 'outlined'}
                          color="info"
                          onClick={() => setAlertCategoryFilter('academic')}
                          sx={{ fontWeight: 800 }}
                        />
                      </Box>
                    </Box>

                    <List disablePadding>
                      {filteredAlerts.map((alert) => (
                        <ListItem key={alert.id} divider sx={{ py: 1.5, px: 0 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                                <Chip label={alert.type || 'Alerte'} size="small" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                <Chip
                                  label={alert.severity === 'critical' ? 'Critique' : 'Information'}
                                  size="small"
                                  color={alert.severity === 'critical' ? 'error' : 'warning'}
                                  sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                />
                                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                  {alert.title}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {alert.message}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, fontWeight: 700 }}>
                                  Signalé le {new Date(alert.createdAt).toLocaleString('fr-FR')}
                                </Typography>
                              </Box>
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
            title="Impossible de charger les enfants"
            description="Veuillez rééssayer dans un moment."
            actionLabel="Réessayer"
            onAction={loadChildren}
          />
        ) : childDataError ? (
          <EmptyState
            variant="error"
            icon="📋"
            title="Impossible de charger le tableau de bord"
            description="Veuillez sélectionner un enfant ou réessayer."
            actionLabel="Réessayer"
            onAction={() => selectedChild && loadChildData(selectedChild.id)}
          />
        ) : (
          <EmptyState
            icon="📋"
            title={children.length === 0 ? 'Aucun enfant associé' : 'Aucun enfant sélectionné'}
            description={
              children.length === 0
                ? 'Associez un compte enfant pour accéder à ses statistiques.'
                : 'Sélectionnez un enfant pour consulter son bilan.'
            }
            actionLabel="Associer un enfant"
            onAction={() => setLinkDialog(true)}
          />
        )}
      </Container>

      {/* Link Child Dialog */}
      <Dialog open={linkDialog} onClose={() => setLinkDialog(false)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle fontWeight={900}>Associer un Enfant à Votre Compte Parent</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Saisissez l'adresse email de votre enfant enregistrée sur la plateforme ScholarAI.
          </Typography>
          <TextField
            fullWidth
            label="Adresse email de l'enfant"
            name="studentEmail"
            type="email"
            placeholder="student1@school.ma"
            value={linkForm.studentEmail}
            onChange={handleLinkChange}
            onBlur={handleLinkBlur}
            margin="normal"
            error={Boolean(linkTouched.studentEmail && linkErrors.studentEmail)}
            helperText={linkTouched.studentEmail ? linkErrors.studentEmail : ''}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLinkDialog(false)} sx={{ textTransform: 'none', fontWeight: 800 }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleLinkChild}
            disabled={!linkForm.studentEmail}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 3px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            Associer l'Enfant
          </Button>
        </DialogActions>
      </Dialog>

      {startTour && <TourEngine steps={resolvedTourSteps} refs={tourRefs} />}
    </Box>
  );
}
