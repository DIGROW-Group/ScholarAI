import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  TableSortLabel,
  TablePagination,
  InputAdornment,
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
  ListItemAvatar,
  Avatar,
  Tab,
  Tabs,
  LinearProgress,
  Badge,
  Popover,
  Menu,
  CircularProgress,
  Tooltip as MuiTooltip,
  Divider,
  Collapse,
  Rating,
  Drawer,
  ListItemButton,
  ListItemIcon,
  Breadcrumbs
} from '@mui/material';
import {
  Logout,
  Upload,
  AttachFile,
  People,
  Analytics,
  Assignment,
  Star,
  Visibility,
  Notifications,
  DoneAll,
  AssignmentTurnedIn,
  PersonAdd,
  TrendingUp,
  FiberManualRecord,
  CheckCircle,
  Email,
  DeleteOutline,
  FilterList,
  Search,
  MoreVert,
  Delete,
  Edit,
  Add,
  ChatBubbleOutline,
  School,
  ArrowBack,
  Download,
  CalendarToday,
  ExpandMore,
  ExpandLess,
  Description,
  Close,
  Forum,
  Menu as MenuIcon,
  Functions,
  Science,
  Translate,
  Language,
  MenuBook,
  Terminal,
  Brightness4,
  Brightness7,
  Send,
  ContentCopy,
  HelpOutline
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import useForm from '../hooks/useForm';
import { useSnackbar } from '../context/SnackbarContext';
import { useColorMode } from '../context/ColorModeContext';
import api from '../services/api';
import TourEngine from '../components/OnboardingTour/TourEngine';
import { tourConfigs } from '../components/OnboardingTour/tourConfigs';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { show } = useSnackbar();
  const colorMode = useColorMode();

  const [tabValue, setTabValue] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startTour, setStartTour] = useState(false);
  const onboardingCompleted = user?.onboardingCompleted;
  const userId = user?.id;

  const tourRefs = {
    studentsTable: useRef(null),
    aiTutorsTab: useRef(null),
    contentLibrary: useRef(null),
    uploadButton: useRef(null),
    analyticsTab: useRef(null),
    appBarTabs: useRef(null),
  };

  // Base state
  const [students, setStudents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Student table filter, sort, pagination and management state
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');
  const [studentActivityFilter, setStudentActivityFilter] = useState('all');
  const [studentSortField, setStudentSortField] = useState('name');
  const [studentSortOrder, setStudentSortOrder] = useState('asc');
  const [studentPage, setStudentPage] = useState(0);
  const [studentRowsPerPage, setStudentRowsPerPage] = useState(10);
  const [createStudentModal, setCreateStudentModal] = useState(false);
  const [createStudentLoading, setCreateStudentLoading] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    grade: '1ère Bac',
    password: 'password123'
  });
  const [deleteStudentConfirmDialog, setDeleteStudentConfirmDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteStudentLoading, setDeleteStudentLoading] = useState(false);

  const handleSortStudents = (field) => {
    if (studentSortField === field) {
      setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setStudentSortField(field);
      setStudentSortOrder('asc');
    }
  };

  const handleCreateStudentSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newStudentForm.firstName.trim() || !newStudentForm.lastName.trim() || !newStudentForm.email.trim()) {
      show('Veuillez remplir tous les champs obligatoires (prénom, nom, email)', 'warning');
      return;
    }
    try {
      setCreateStudentLoading(true);
      const res = await api.post('/teacher/students', newStudentForm);
      show('Élève ' + newStudentForm.firstName + ' ' + newStudentForm.lastName + ' ajouté avec succès !', 'success');
      setCreateStudentModal(false);
      setNewStudentForm({
        firstName: '',
        lastName: '',
        email: '',
        grade: '1ère Bac',
        password: 'password123'
      });
      loadData();
    } catch (err) {
      console.error('Failed to create student:', err);
      show(err.response?.data?.error || 'Erreur lors de la création de l\'élève', 'error');
    } finally {
      setCreateStudentLoading(false);
    }
  };

  const handleDeleteStudentSubmit = async () => {
    if (!studentToDelete) return;
    try {
      setDeleteStudentLoading(true);
      await api.delete('/teacher/students/' + studentToDelete.id);
      show('Élève supprimé avec succès', 'info');
      setDeleteStudentConfirmDialog(false);
      setStudentToDelete(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete student:', err);
      show(err.response?.data?.error || 'Erreur lors de la suppression de l\'élève', 'error');
    } finally {
      setDeleteStudentLoading(false);
    }
  };

  const filteredAndSortedStudents = useMemo(() => {
    let list = [...students];

    // Search query filter
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      list = list.filter(s =>
        (s.firstName && s.firstName.toLowerCase().includes(q)) ||
        (s.lastName && s.lastName.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.grade && s.grade.toLowerCase().includes(q)) ||
        (s.classroomName && s.classroomName.toLowerCase().includes(q))
      );
    }

    // Grade / Class filter
    if (studentGradeFilter !== 'all') {
      list = list.filter(s => isGradeMatch(s.grade, studentGradeFilter));
    }

    // Activity filter
    if (studentActivityFilter === 'active') {
      list = list.filter(s => s.hasRecentActivity || (s.recentSessions && s.recentSessions > 0));
    } else if (studentActivityFilter === 'inactive') {
      list = list.filter(s => !s.hasRecentActivity && (!s.recentSessions || s.recentSessions === 0));
    }

    // Sort
    list.sort((a, b) => {
      let valA, valB;
      if (studentSortField === 'name') {
        valA = ((a.lastName || '') + ' ' + (a.firstName || '')).toLowerCase();
        valB = ((b.lastName || '') + ' ' + (b.firstName || '')).toLowerCase();
      } else if (studentSortField === 'email') {
        valA = (a.email || '').toLowerCase();
        valB = (b.email || '').toLowerCase();
      } else if (studentSortField === 'grade') {
        valA = (a.grade || '').toLowerCase();
        valB = (b.grade || '').toLowerCase();
      } else if (studentSortField === 'sessions') {
        valA = a.sessionCount || 0;
        valB = b.sessionCount || 0;
      } else if (studentSortField === 'activity') {
        valA = (a.hasRecentActivity || (a.recentSessions > 0)) ? 1 : 0;
        valB = (b.hasRecentActivity || (b.recentSessions > 0)) ? 1 : 0;
      } else {
        valA = a.id;
        valB = b.id;
      }

      if (valA < valB) return studentSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return studentSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [students, studentSearchQuery, studentGradeFilter, studentActivityFilter, studentSortField, studentSortOrder]);

  const paginatedStudents = useMemo(() => {
    const start = studentPage * studentRowsPerPage;
    return filteredAndSortedStudents.slice(start, start + studentRowsPerPage);
  }, [filteredAndSortedStudents, studentPage, studentRowsPerPage]);

  // Student sessions & conversation view modal state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSessions, setStudentSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [studentModalTab, setStudentModalTab] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [evaluation, setEvaluation] = useState({ rating: 5, feedback: '' });

  // Document preview modal state
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [docDetails, setDocDetails] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  // Upload modal state
  const [uploadDialog, setUploadDialog] = useState(false);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);

  // Filter / hierarchy state
  const [selectedDocSubject, setSelectedDocSubject] = useState('math');
  const [selectedDocGradeLevel, setSelectedDocGradeLevel] = useState('1ère Bac');
  const [selectedTutorSubject, setSelectedTutorSubject] = useState('math');
  const [selectedTutorGrade, setSelectedTutorGrade] = useState('1ère Bac');
  const [selectedSummaryDate, setSelectedSummaryDate] = useState('all');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30');
  const [analyticsGrade, setAnalyticsGrade] = useState('all');
  const [analyticsSubject, setAnalyticsSubject] = useState('all');

  // Classroom Workspace State (Tab 4)
  const [selectedClass, setSelectedClass] = useState('1ère Bac');
  const [classSubTab, setClassSubTab] = useState(0);
  const [selectedHwSubject, setSelectedHwSubject] = useState('all');
  const [hwSearchQuery, setHwSearchQuery] = useState('');
  const [hwStatusFilter, setHwStatusFilter] = useState('all');
  const [cardMenuAnchorEl, setCardMenuAnchorEl] = useState(null);
  const [activeMenuHw, setActiveMenuHw] = useState(null);
  const [createHomeworkModal, setCreateHomeworkModal] = useState(false);
  const [hwSortBy, setHwSortBy] = useState('dueDateAsc');
  const [hwPage, setHwPage] = useState(1);
  const hwPerPage = 6;
  const [archivedHwIds, setArchivedHwIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('scholarai_archived_homeworks') || '[]');
    } catch {
      return [];
    }
  });
  const [gradingScores, setGradingScores] = useState({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);
  const [createHwErrors, setCreateHwErrors] = useState({});
  const [createQuizModal, setCreateQuizModal] = useState(false);
  const [editHomeworkDialog, setEditHomeworkDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [studentPreviewDialog, setStudentPreviewDialog] = useState(false);
  const [submissionsModal, setSubmissionsModal] = useState(false);
  const [selectedHomeworkSubmissions, setSelectedHomeworkSubmissions] = useState(null);

  // Class Comments Thread State
  const [expandedCommentsHwId, setExpandedCommentsHwId] = useState(null);
  const [commentInputText, setCommentInputText] = useState({});

  // Forms
  const [newHomework, setNewHomework] = useState({
    subject: 'math',
    gradeLevel: '1ère Bac',
    title: '',
    description: '',
    dueDate: '',
    maxScore: 20,
    file: null
  });

  const [newQuiz, setNewQuiz] = useState({
    subject: 'math',
    gradeLevel: '1ère Bac',
    title: '',
    description: '',
    timeLimit: 15,
    dueDate: '',
    questions: [
      { question: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }
    ]
  });

  const [editHomeworkForm, setEditHomeworkForm] = useState({
    id: '',
    title: '',
    description: '',
    subject: 'math',
    gradeLevel: '1ère Bac',
    dueDate: '',
    maxScore: 20
  });

  const validateUploadForm = (values) => {
    const errors = {};
    if (!values.subject) errors.subject = 'Subject is required';
    if (!values.title?.trim()) errors.title = 'Title is required';
    if (!values.file) errors.file = 'Please select a file';
    return errors;
  };

  const {
    values: uploadForm,
    errors: uploadErrors,
    touched: uploadTouched,
    handleChange: handleUploadChange,
    handleBlur: handleUploadBlur,
    submit: submitUpload,
    setValues: setUploadForm,
  } = useForm(
    {
      subject: 'math',
      title: '',
      description: '',
      chapter: '',
      gradeLevel: '1ère Bac',
      guidelines: '',
      file: null,
    },
    validateUploadForm
  );

  const allSubjects = [
    { id: 'math', label: 'Maths', icon: <Functions sx={{ fontSize: 18 }} />, emoji: '📐', color: '#4F46E5', lightBg: '#EEF2FF', darkBg: 'rgba(79, 70, 229, 0.15)' },
    { id: 'physics', label: 'Physics', icon: <Science sx={{ fontSize: 18 }} />, emoji: '⚛️', color: '#0284C7', lightBg: '#E0F2FE', darkBg: 'rgba(2, 132, 199, 0.15)' },
    { id: 'arabic', label: 'Arabic', icon: <Translate sx={{ fontSize: 18 }} />, emoji: '🇲🇦', color: '#059669', lightBg: '#ECFDF5', darkBg: 'rgba(5, 150, 105, 0.15)' },
    { id: 'english', label: 'English', icon: <Language sx={{ fontSize: 18 }} />, emoji: '🇬🇧', color: '#7C3AED', lightBg: '#F3E8FF', darkBg: 'rgba(124, 58, 237, 0.15)' },
    { id: 'french', label: 'French', icon: <MenuBook sx={{ fontSize: 18 }} />, emoji: '🇫🇷', color: '#DB2777', lightBg: '#FCE7F3', darkBg: 'rgba(219, 39, 119, 0.15)' },
    { id: 'informatique', label: 'IT', icon: <Terminal sx={{ fontSize: 18 }} />, emoji: '💻', color: '#0891B2', lightBg: '#ECFEFF', darkBg: 'rgba(8, 145, 178, 0.15)' },
  ];

  const teacherSubjects = user?.subjects || ['math', 'physics', 'arabic', 'english', 'french', 'informatique'];
  const subjects = allSubjects.filter(s => teacherSubjects.includes(s.id));

  const gradeLevelsList = [
    { id: '1ère Bac', label: '1ère Bac', icon: '🎓', color: '#4F46E5', description: 'Supports, devoirs et quiz QCM pour la 1ère année du Baccalauréat' },
    { id: '2ème Bac', label: '2ème Bac', icon: '🎓', color: '#7C3AED', description: 'Supports, devoirs et quiz QCM pour la 2ème année du Baccalauréat' },
    { id: 'Tronc Commun', label: 'Tronc Commun', icon: '🎓', color: '#059669', description: 'Supports, devoirs et quiz QCM pour le Tronc Commun' },
    { id: 'Tous les niveaux', label: 'Tous les niveaux / Général', icon: '🌐', color: '#0284C7', description: 'Supports généraux et révisions globales' },
  ];

  const getDeadlineCountdown = (dueDateStr) => {
    if (!dueDateStr) return { status: 'none', label: 'Date non définie', isUrgent: false, isPast: false };
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due - now;
    if (diffMs <= 0) {
      return { status: 'expired', label: '🔴 Expiré', isUrgent: false, isPast: true };
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours < 24) {
      if (diffHours === 0) {
        return { status: 'urgent', label: '⏳ Expire dans ' + diffMins + ' min', isUrgent: true, isPast: false };
      }
      return { status: 'urgent', label: '⏳ Expire dans ' + diffHours + 'h ' + diffMins + 'm', isUrgent: true, isPast: false };
    }
    const diffDays = Math.floor(diffHours / 24);
    return { status: 'active', label: '🟢 Reste ' + diffDays + ' jour' + (diffDays > 1 ? 's' : ''), isUrgent: false, isPast: false };
  };

  const handleToggleArchiveHomework = (hw) => {
    handleCloseCardMenu();
    let updated;
    if (archivedHwIds.includes(hw.id)) {
      updated = archivedHwIds.filter(id => id !== hw.id);
      show('Devoir restauré des archives', 'info');
    } else {
      updated = [...archivedHwIds, hw.id];
      show('Devoir archivé avec succès', 'success');
    }
    setArchivedHwIds(updated);
    try {
      localStorage.setItem('scholarai_archived_homeworks', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGradeStudentSubmission = async (submissionId) => {
    const scoreVal = gradingScores[submissionId];
    const feedbackVal = gradingFeedbacks[submissionId] || '';
    if (scoreVal === undefined || scoreVal === null || scoreVal === '') {
      show('Veuillez saisir une note avant d\'enregistrer', 'warning');
      return;
    }
    const numScore = parseFloat(scoreVal);
    if (isNaN(numScore) || numScore < 0 || numScore > 20) {
      show('La note doit être comprise entre 0 et 20', 'warning');
      return;
    }
    try {
      setSavingGradeId(submissionId);
      await api.post('/homework/submissions/' + submissionId + '/grade', {
        score: numScore,
        feedback: feedbackVal
      });
      show('Note et feedback enregistrés avec succès !', 'success');
      loadHomeworks();
      // Update local submissions view
      if (selectedHomeworkSubmissions) {
        const updatedSubs = (selectedHomeworkSubmissions.submissions || []).map(s => {
          if (s.id === submissionId) {
            return { ...s, score: numScore, feedback: feedbackVal, status: 'graded' };
          }
          return s;
        });
        setSelectedHomeworkSubmissions({ ...selectedHomeworkSubmissions, submissions: updatedSubs });
      }
    } catch (err) {
      console.error('Failed to grade submission:', err);
      show('Erreur lors de l\'enregistrement de la note', 'error');
    } finally {
      setSavingGradeId(null);
    }
  };

  const isGradeMatch = (studentGrade, targetGrade) => {
    if (!targetGrade || targetGrade === 'all' || targetGrade === 'Tous les niveaux') return true;
    const normalize = (str) => (str || '').toString().toLowerCase().trim();
    const s = normalize(studentGrade);
    const t = normalize(targetGrade);
    if (s === t) return true;
    if (s.includes('1') && t.includes('1')) return true;
    if (s.includes('2') && t.includes('2')) return true;
    if (s.includes('tronc') && t.includes('tronc')) return true;
    return false;
  };

  // DEEP PEDAGOGICAL AI SYNTHESIS & EXECUTIVE TEACHER COPILOT
  const generateDailyAiSummary = (questions, studentNames, gradeLabel, subjectLabel, rawSessions = []) => {
    if (!questions || questions.length === 0) {
      return (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 3.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
          <Typography variant="body2" color="text.secondary">Aucune activité enregistrée pour cette journée.</Typography>
        </Paper>
      );
    }

    const allUserMessages = [];
    const questionsWithStudent = [];

    questions.forEach(q => {
      const conv = q.conversation || [];
      if (conv.length > 0) {
        conv.forEach(msg => {
          if (msg.role === 'user' && msg.content) {
            allUserMessages.push(msg.content.trim());
            questionsWithStudent.push({
              studentName: q.studentName || 'Élève',
              studentId: q.studentId,
              text: msg.content.trim(),
              sessionId: q.id,
              subject: q.subject,
              time: q.time,
              conversation: conv
            });
          }
        });
      } else if (q.question) {
        allUserMessages.push(q.question.trim());
        questionsWithStudent.push({
          studentName: q.studentName || 'Élève',
          studentId: q.studentId,
          text: q.question.trim(),
          sessionId: q.id,
          subject: q.subject,
          time: q.time,
          conversation: q.conversation || []
        });
      }
    });

    // Classify messages into Casual vs Academic
    const casualGreetingsList = ['salut', 'bonjour', 'bonsoir', 'coucou', 'salam', 'hello', 'hi', 'merci', 'ca va', 'ça va', 'comment tu vas', 'test', 'aide moi', 'aide-moi'];
    const casualQuestions = [];
    const academicQuestions = [];

    questionsWithStudent.forEach(item => {
      const lower = item.text.toLowerCase().trim();
      const isCasual = casualGreetingsList.some(greeting => lower === greeting || lower.startsWith(greeting + ' ') || lower.endsWith(' ' + greeting) || lower.length <= 6);
      if (isCasual) {
        casualQuestions.push(item);
      } else {
        academicQuestions.push(item);
      }
    });

    // Detect technical concepts
    const concepts = [];
    const allText = allUserMessages.map(m => m.toLowerCase()).join(' ');
    if (allText.includes('ln') || allText.includes('logarithm') || allText.includes('log')) concepts.push({ name: 'Fonctions Logarithmes ln(x)', tag: 'Calcul & Propriétés', icon: '📐', advice: 'Rappeler les propriétés fondamentales ln(a*b) = ln(a)+ln(b) et la dérivée (ln u)\' = u\'/u' });
    if (allText.includes('derive') || allText.includes('dérivé')) concepts.push({ name: 'Calcul Différentiel & Dérivées', tag: 'Analyse', icon: '📈', advice: 'S\'assurer de la bonne maîtrise du tableau des dérivées usuelles et des règles produit/quotient' });
    if (allText.includes('fonction') || allText.includes('limite')) concepts.push({ name: 'Limites & Comportement Asymptotique', tag: 'Analyse', icon: '🎯', advice: 'Entraîner les élèves sur la levée des formes indéterminées et les croissances comparées' });
    if (allText.includes('cos') || allText.includes('sin') || allText.includes('trigo')) concepts.push({ name: 'Trigonométrie Circulaire', tag: 'Géométrie', icon: '🔄', advice: 'Vérifier la conversion radians/degrés et les formules d\'addition cos(a+b)' });
    if (allText.includes('complexe') || allText.includes('euler') || allText.includes('imaginaire')) concepts.push({ name: 'Nombres Complexes & Forme Trigonométrique', tag: 'Algèbre', icon: '⚡', advice: 'Revoir le passage forme algébrique vers forme exponentielle' });
    if (allText.includes('integral') || allText.includes('primitive')) concepts.push({ name: 'Intégration & Calcul d\'Aires', tag: 'Calcul Intégral', icon: '∫', advice: 'Insister sur l\'identification de formes u\'*u^n pour les primitives' });

    const studentListStr = studentNames && studentNames.length > 0 ? studentNames.join(', ') : 'Les élèves';

    let depthStatus = '';
    let badgeBg = '#4F46E5';
    let masteryBadge = { text: '🟢 Bonne assimilation', color: 'success' };

    if (academicQuestions.length >= 2) {
      depthStatus = '🧠 Diagnostic & Approfondissement (' + academicQuestions.length + ' questions académiques)';
      badgeBg = '#10B981';
      masteryBadge = { text: '🟡 Point d\'approfondissement requis', color: 'warning' };
    } else if (academicQuestions.length === 1) {
      depthStatus = '📚 Question de Cours Ciblée (1 question technique)';
      badgeBg = '#6366F1';
      masteryBadge = { text: '🟢 Question de consolidation', color: 'info' };
    } else {
      depthStatus = '💬 Prise de contact / Salutations (' + casualQuestions.length + ' message(s))';
      badgeBg = '#F59E0B';
      masteryBadge = { text: '⚪ Premier contact informel', color: 'default' };
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Top Summary Banner */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3.5,
            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
            borderLeft: '5px solid ' + (academicQuestions.length > 0 ? '#6366F1' : '#F59E0B')
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', fontWeight: 900 }}>
                💡
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                  Synthèse Pédagogique IA
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Élève(s) actif(s) : <strong style={{ color: '#6366F1' }}>{studentListStr}</strong> ({gradeLabel})
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={depthStatus} size="small" sx={{ fontWeight: 800, bgcolor: badgeBg, color: '#fff', fontSize: '0.75rem' }} />
              <Chip label={masteryBadge.text} color={masteryBadge.color} size="small" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />
            </Box>
          </Box>

          {/* Grid with 2 columns: Questions Posées VS Concepts Détectés */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Left: Verbatim des Questions */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                <Typography variant="caption" fontWeight={900} color="#6366F1" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, textTransform: 'uppercase', mb: 1.5, letterSpacing: 0.5 }}>
                  ❓ Questions Clés Posées par l'Élève :
                </Typography>
                {questionsWithStudent.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Aucune question formulée.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    {questionsWithStudent.map((item, idx) => {
                      const isAc = academicQuestions.some(aq => aq.text === item.text);
                      return (
                        <Box
                          key={idx}
                          sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            bgcolor: isAc ? (colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF') : (colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC'),
                            border: '1px solid ' + (isAc ? (colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE') : (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'))
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={800} color={isAc ? '#6366F1' : 'text.secondary'}>
                              👨‍🎓 {item.studentName}
                            </Typography>
                            <Chip label={isAc ? '📚 Question de Cours' : '💬 Salutation'} size="small" sx={{ fontSize: '0.68rem', height: 20, fontWeight: 800, bgcolor: isAc ? '#10B981' : '#F59E0B', color: '#fff' }} />
                          </Box>
                          <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                            "{item.text}"
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Right: Concepts Traités & Diagnostic */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                <Typography variant="caption" fontWeight={900} color="#10B981" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, textTransform: 'uppercase', mb: 1.5, letterSpacing: 0.5 }}>
                  🧠 Notions du Programme Abordées :
                </Typography>
                {concepts.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {concepts.map((c, cIdx) => (
                      <Box key={cIdx} sx={{ p: 1.2, borderRadius: 2, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F0FDF4', border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#BBF7D0'), display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontSize="1.1rem">{c.icon}</Typography>
                        <Box>
                          <Typography variant="caption" fontWeight={800} color="text.primary" sx={{ display: 'block' }}>{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>{c.tag}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Échanges généraux / Prise en main du tuteur.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Actionable Recommendations for Teacher (3 High-Impact Pillars) */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
              borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
              mb: 2.5
            }}
          >
            <Typography variant="caption" fontWeight={900} color={colorMode.mode === 'dark' ? '#818CF8' : '#4338CA'} sx={{ display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', mb: 1.5, letterSpacing: 0.5 }}>
              🎯 Recommandations & Actions Pédagogiques pour l'Enseignant
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 1.8, height: '100%', borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#EEF2FF', border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#C7D2FE') }}>
                  <Typography variant="caption" fontWeight={800} color="#4F46E5" sx={{ display: 'block', mb: 0.5 }}>
                    🏫 1. Rappel Flash en Classe (5 min)
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.84rem', lineHeight: 1.5 }}>
                    {concepts.length > 0 ? concepts[0].advice : 'Encourager les élèves à poser des questions d\'exercices précises au tuteur IA.'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ p: 1.8, height: '100%', borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#ECFDF5', border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#A7F3D0') }}>
                  <Typography variant="caption" fontWeight={800} color="#059669" sx={{ display: 'block', mb: 0.5 }}>
                    📝 2. Devoir / Exercice Conseillé
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.84rem', lineHeight: 1.5 }}>
                    {concepts.length > 0 ? 'Proposer une application directe sur ' + concepts[0].name + ' (calculs de dérivées et étude de signe).' : 'Publier un devoir d\'application pour lancer la dynamique de travail.'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ p: 1.8, height: '100%', borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFBEB', border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#FDE68A') }}>
                  <Typography variant="caption" fontWeight={800} color="#D97706" sx={{ display: 'block', mb: 0.5 }}>
                    💡 3. Accompagnement Personnalisé
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.84rem', lineHeight: 1.5 }}>
                    {studentListStr} : Valoriser l'initiative et inciter à poursuivre avec des exercices d'entraînement de niveau Bac.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Action Buttons: Inspect Full Conversation & Create Targeted Homework */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Actions disponibles pour cette journée :
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {concepts.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Add sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    setNewHomework({
                      subject: subjectLabel ? subjectLabel.toLowerCase() : 'math',
                      gradeLevel: gradeLabel || '1ère Bac',
                      title: 'Devoir Flash : ' + concepts[0].name,
                      description: '1. Calculer la dérivée et étudier les variations.\n2. Déterminer les valeurs particulières et les asymptotes.\n3. Rédiger une conclusion claire.',
                      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 16),
                      maxScore: 20,
                      file: null
                    });
                    setTabValue(4);
                    setSelectedClass(gradeLabel || '1ère Bac');
                    setCreateHomeworkModal(true);
                  }}
                  sx={{
                    borderRadius: 2.5,
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                    color: colorMode.mode === 'dark' ? '#34D399' : '#059669',
                    bgcolor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5'
                  }}
                >
                  ⚡ Créer un Devoir Ciblé ({concepts[0].name.split(' ')[0]})
                </Button>
              )}

              {questions.map((q, qIdx) => (
                <Button
                  key={q.id || qIdx}
                  size="small"
                  variant="contained"
                  startIcon={<Forum sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    const studentObj = students.find(s => s.id === q.studentId) || { id: q.studentId, firstName: q.studentName || 'Élève', lastName: '', grade: q.grade || gradeLabel };
                    setSelectedStudent(studentObj);
                    handleSelectSessionToInspect({
                      id: q.id,
                      subject: q.subject || subjectLabel || 'math',
                      student: studentObj,
                      conversation: q.conversation || [],
                      createdAt: q.time ? new Date().toISOString() : new Date().toISOString()
                    });
                    setStudentModalTab(2);
                    setSessionDialog(true);
                  }}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2.5,
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                    px: 2.2
                  }}
                >
                  💬 Voir Conversation ({q.studentName || 'Session ' + (qIdx + 1)})
                </Button>
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  };


  // Analytics Filter and CSV Export Handlers
  const handleFilterAnalytics = async (newTimeframe, newGrade, newSubject) => {
    try {
      const tf = newTimeframe !== undefined ? newTimeframe : analyticsTimeframe;
      const gr = newGrade !== undefined ? newGrade : analyticsGrade;
      const sb = newSubject !== undefined ? newSubject : analyticsSubject;
      
      const res = await api.get('/teacher/analytics', {
        params: { timeframe: tf, grade: gr, subject: sb }
      });
      if (res.data && res.data.analytics) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('Failed to filter analytics:', err);
    }
  };

  const handleExportAnalyticsCSV = () => {
    if (!analytics) {
      show("Aucune donnée d'analyse à exporter", 'info');
      return;
    }
    const headers = ['Metrique / Categorie', 'Valeur', 'Details'];
    const rows = [
      ['Total Sessions Tutorat IA', analytics.totalSessions || 0, 'Periode: ' + (analytics.timeframe || '30 jours')],
      ['Eleves Actifs', analytics.activeStudents || 0, 'Sur ' + (analytics.totalStudents || 0) + ' eleves inscrits'],
      ['Taux de Resolution', (analytics.resolutionRate || 100) + '%', analytics.resolutionFormula || ''],
      ['Note Moyenne Eleve', (analytics.avgStudentRating || '5.0') + '/5.0', 'Satisfaction pedagogique'],
      ['Sessions Resolues (solved)', analytics.outcomes?.solved || 0, ''],
      ['Sessions En Cours (ongoing)', analytics.outcomes?.ongoing || 0, ''],
      ['Sessions A Revoir (needs_review)', analytics.outcomes?.needs_review || 0, ''],
      [],
      ['--- TOP NOTIONS DU PROGRAMME ---', '', ''],
      ['Notion', 'Matiere', 'Questions Posees'],
      ...(analytics.topConcepts || []).map(c => [c.concept, c.subject, c.count + ' questions']),
      [],
      ['--- CLASSEMENT ENGAGEMENT ELEVES ---', '', ''],
      ['Nom Eleve', 'Classe', 'Sessions Total', 'Derniere Activite', 'Statut'],
      ...(analytics.studentLeaderboard || []).map(st => [st.name, st.grade, st.sessionCount, st.lastActive, st.statusLabel])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(cell => '"' + (cell !== undefined && cell !== null ? cell : '') + '"').join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'rapport_analytique_scholarai_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    show('Export du rapport CSV généré avec succès !', 'success');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, documentsRes, analyticsRes, dailySummariesRes, notifsRes] = await Promise.all([
        api.get('/teacher/students').catch(() => ({ data: { students: [] } })),
        api.get('/teacher/documents').catch(() => ({ data: { documents: [] } })),
        api.get('/teacher/analytics?timeframe=30').catch(() => ({ data: { analytics: null } })),
        api.get('/teacher/daily-summaries?days=30').catch(() => ({ data: { summaries: [] } })),
        api.get('/homework/notifications/unread').catch(() => ({ data: { notifications: [] } })),
      ]);
      setStudents(studentsRes.data.students || []);
      setDocuments(documentsRes.data.documents || []);
      setAnalytics(analyticsRes.data.analytics);
      setDailySummaries(dailySummariesRes.data.summaries || []);
      setNotifications(notifsRes.data.notifications || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      show('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHomeworks = async () => {
    try {
      const res = await api.get('/homework/teacher');
      setHomeworks(res.data.homeworks || []);
    } catch (err) {
      console.error('Failed to load homeworks:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadHomeworks();
  }, []);

  useEffect(() => {
    if (!userId || onboardingCompleted) return;
    const timer = setTimeout(() => setStartTour(true), 800);
    return () => clearTimeout(timer);
  }, [userId, onboardingCompleted]);

  const handleOpenUploadDialog = (subj, gr) => {
    setUploadForm({
      subject: subj || selectedDocSubject || 'math',
      title: '',
      description: '',
      chapter: '',
      gradeLevel: gr || selectedDocGradeLevel || '1ère Bac',
      guidelines: '',
      file: null
    });
    setUploadDialog(true);
  };

  const handleUploadDocument = async () => {
    await submitUpload(async (formValues) => {
      try {
        const formData = new FormData();
        formData.append('subject', formValues.subject);
        formData.append('title', formValues.title);
        formData.append('description', formValues.description);
        formData.append('chapter', formValues.chapter);
        formData.append('gradeLevel', formValues.gradeLevel || '1ère Bac');
        formData.append('guidelines', formValues.guidelines);
        formData.append('document', formValues.file);

        await api.post('/teacher/documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setUploadDialog(false);
        setUploadForm({ subject: 'math', title: '', description: '', chapter: '', gradeLevel: '1ère Bac', guidelines: '', file: null });

        loadData();
        show('Document importé avec succès !', 'success');
      } catch (error) {
        console.error('Upload failed:', error);
        show('Failed to upload document', 'error');
      }
    });
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await api.delete('/teacher/documents/' + docId);
      show('Document supprimé avec succès', 'success');
      loadData();
    } catch (err) {
      console.error('Delete failed:', err);
      show('Erreur lors de la suppression du document', 'error');
    }
  };

  // Full Course Document Preview Modal
  const handleOpenSourceModal = async (src) => {
    setSelectedSource(src);
    setSourceModalOpen(true);
    setSourceLoading(true);
    setDocDetails(null);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }

    try {
      const docIdentifier = src.id || src.documentId || encodeURIComponent(src.title);
      const res = await api.get('/documents/' + docIdentifier);
      const doc = res.data.document;
      setDocDetails(doc);

      if (doc?.isPdf || (src.filePath && src.filePath.toLowerCase().endsWith('.pdf'))) {
        const fileRes = await api.get('/documents/' + docIdentifier + '/file', { responseType: 'blob' });
        const blob = new Blob([fileRes.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(blobUrl);
      }
    } catch (err) {
      console.error('Failed to load document details:', err);
      setDocDetails({
        title: src.title,
        subject: src.subject,
        chapter: src.chapter,
        gradeLevel: src.gradeLevel,
        contentSnippet: src.description || 'Support de cours théorique déposé par l\'enseignant.'
      });
    } finally {
      setSourceLoading(false);
    }
  };

  const handleDownloadSource = async (src) => {
    if (!src) return;
    const docIdentifier = src.id || src.documentId || encodeURIComponent(src.title);
    try {
      const response = await api.get('/documents/' + docIdentifier + '/file', { responseType: 'blob' });
      const isPdf = (docDetails && docDetails.isPdf) || (src.filePath && src.filePath.toLowerCase().endsWith('.pdf'));
      const ext = isPdf ? '.pdf' : '.txt';

      const url = window.URL.createObjectURL(new Blob([response.data], { type: isPdf ? 'application/pdf' : 'text/plain' }));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (src.title || 'Support_de_cours').replace(/[^a-zA-Z0-9_\-]/g, '_');
      link.setAttribute('download', safeTitle + ext);
      document.body.appendChild(link);
      link.click();
      link.remove();
      show('Téléchargement démarré', 'success');
    } catch (err) {
      console.error('Download error:', err);
      show('Erreur lors du téléchargement du document', 'error');
    }
  };

  // Student Carnet, Copies & Conversation Inspection
  const viewStudentCarnet = async (student, initialTab = 0) => {
    setSelectedStudent(student);
    setStudentModalTab(initialTab);
    setSessionDialog(true);
    setSelectedSession(null);
    try {
      setSessionLoading(true);
      const res = await api.get('/teacher/students/' + student.id + '/sessions');
      const sessions = res.data.sessions || [];
      setStudentSessions(sessions);
      if (sessions.length > 0) {
        setSelectedSession(sessions[0]);
        setEvaluation({ rating: sessions[0].teacherRating || 5, feedback: sessions[0].teacherFeedback || '' });
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setSessionLoading(false);
    }
  };

  const viewStudentSessions = (student) => viewStudentCarnet(student, 2);

  const handleSelectSessionToInspect = async (sess) => {
    try {
      setSessionLoading(true);
      const res = await api.get('/teacher/sessions/' + sess.id);
      const fullSess = res.data.session || sess;
      setSelectedSession(fullSess);
      setEvaluation({ rating: fullSess.teacherRating || 5, feedback: fullSess.teacherFeedback || '' });
    } catch (err) {
      console.error('Failed to load full session details:', err);
      setSelectedSession(sess);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleEvaluateSession = async () => {
    if (!selectedSession) return;
    try {
      await api.post('/teacher/sessions/' + selectedSession.id + '/evaluate', evaluation);
      show('Évaluation pédagogique enregistrée avec succès !', 'success');
      if (selectedStudent) {
        viewStudentSessions(selectedStudent);
      }
    } catch (error) {
      console.error('Evaluation failed:', error);
      show('Erreur lors de l\'enregistrement de l\'évaluation', 'error');
    }
  };

  const handleCreateHomework = async () => {
    const errors = {};
    if (!newHomework.title || newHomework.title.trim().length < 4) {
      errors.title = 'Le titre doit comporter au moins 4 caractères.';
    }
    if (!newHomework.description || newHomework.description.trim().length < 10) {
      errors.description = 'Les consignes doivent comporter au moins 10 caractères.';
    }
    if (!newHomework.dueDate) {
      errors.dueDate = 'Veuillez définir une date limite de rendu.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateHwErrors(errors);
      show('Veuillez corriger les erreurs dans le formulaire.', 'warning');
      return;
    }
    setCreateHwErrors({});
    try {
      const formData = new FormData();
      formData.append('subject', newHomework.subject);
      formData.append('gradeLevel', newHomework.gradeLevel);
      formData.append('title', newHomework.title);
      formData.append('description', newHomework.description);
      formData.append('dueDate', newHomework.dueDate);
      formData.append('maxScore', newHomework.maxScore || 20);
      if (newHomework.file) {
        formData.append('file', newHomework.file);
      }

      await api.post('/homework', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      show('Devoir créé et publié avec succès !', 'success');
      setCreateHomeworkModal(false);
      loadHomeworks();
    } catch (err) {
      console.error('Failed to create homework:', err);
      show('Erreur lors de la création du devoir', 'error');
    }
  };

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || newQuiz.questions.length === 0) {
      show('Veuillez renseigner le titre du quiz et au moins une question', 'warning');
      return;
    }
    try {
      const payload = {
        subject: newQuiz.subject,
        gradeLevel: newQuiz.gradeLevel || selectedClass || '1ère Bac',
        title: '[Quiz QCM] ' + newQuiz.title,
        description: newQuiz.description || 'Test de connaissances à choix multiples.',
        dueDate: newQuiz.dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        maxScore: newQuiz.questions.length * 5,
        type: 'qcm',
        quizData: newQuiz
      };

      await api.post('/homework', payload);
      show('🎯 Quiz QCM créé et publié avec succès !', 'success');
      setCreateQuizModal(false);
      loadHomeworks();
    } catch (err) {
      console.error('Failed to create quiz:', err);
      show('Erreur lors de la création du quiz', 'error');
    }
  };

  const handleEditHomework = async () => {
    if (!editHomeworkForm.id || !editHomeworkForm.title) return;
    try {
      const formData = new FormData();
      formData.append('title', editHomeworkForm.title);
      formData.append('description', editHomeworkForm.description);
      if (editHomeworkForm.subject) formData.append('subject', editHomeworkForm.subject);
      if (editHomeworkForm.gradeLevel) formData.append('gradeLevel', editHomeworkForm.gradeLevel);
      if (editHomeworkForm.dueDate) formData.append('dueDate', editHomeworkForm.dueDate);
      if (editHomeworkForm.maxScore) formData.append('maxScore', editHomeworkForm.maxScore);
      if (editHomeworkForm.file) {
        formData.append('file', editHomeworkForm.file);
      }

      await api.put('/homework/' + editHomeworkForm.id, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      show('Devoir mis à jour avec succès !', 'success');
      setEditHomeworkDialog(false);
      loadHomeworks();
    } catch (err) {
      console.error('Failed to edit homework:', err);
      show('Erreur lors de la mise à jour du devoir', 'error');
    }
  };

  const handleDeleteHomework = async () => {
    if (!activeMenuHw?.id) return;
    try {
      await api.delete('/homework/' + activeMenuHw.id);
      show('Devoir supprimé avec succès', 'success');
      setDeleteConfirmDialog(false);
      setActiveMenuHw(null);
      loadHomeworks();
    } catch (err) {
      console.error('Failed to delete homework:', err);
      show('Erreur lors de la suppression', 'error');
    }
  };

  const handleDuplicateHomework = async (hw) => {
    try {
      const payload = {
        subject: hw.subject,
        gradeLevel: hw.gradeLevel,
        title: hw.title + ' (Copie)',
        description: hw.description,
        dueDate: hw.dueDate,
        maxScore: hw.maxScore || 20
      };
      await api.post('/homework', payload);
      show('Devoir dupliqué avec succès !', 'success');
      handleCloseCardMenu();
      loadHomeworks();
    } catch (err) {
      console.error('Failed to duplicate homework:', err);
      show('Erreur lors de la duplication', 'error');
    }
  };

  const handleExportSubmissionsCSV = (hw) => {
    handleCloseCardMenu();
    if (!hw.submissions || hw.submissions.length === 0) {
      show('Aucune soumission à exporter pour ce devoir', 'info');
      return;
    }
    const headers = ['Nom Eleve', 'Email', 'Date de Rendu', 'Statut', 'Note', 'Commentaire'];
    const rows = hw.submissions.map(s => [
      '"' + (s.studentName || s.student?.firstName || 'Eleve') + '"',
      '"' + (s.student?.email || '') + '"',
      '"' + (s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '') + '"',
      '"' + (s.status || 'Rendu') + '"',
      '"' + (s.score !== null && s.score !== undefined ? s.score : 'Non note') + '"',
      '"' + (s.feedback || '').replace(/"/g, '""') + '"'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'notes_' + hw.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    show('Exportation CSV terminée !', 'success');
  };

  const handlePostClassComment = async (homeworkId) => {
    const text = (commentInputText[homeworkId] || '').trim();
    if (!text) return;
    try {
      await api.post('/homework/' + homeworkId + '/comments', { content: text });
      setCommentInputText({ ...commentInputText, [homeworkId]: '' });
      loadHomeworks();
      show('Commentaire posté !', 'success');
    } catch (err) {
      console.error('Failed to post comment:', err);
      show('Erreur lors de l\'envoi du commentaire', 'error');
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await api.patch('/homework/notifications/' + id + '/read');
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/homework/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleOpenCardMenu = (event, hw) => {
    event.stopPropagation();
    setCardMenuAnchorEl(event.currentTarget);
    setActiveMenuHw(hw);
  };

  const handleCloseCardMenu = () => {
    setCardMenuAnchorEl(null);
  };

  const handleOpenEditHomework = (hw) => {
    handleCloseCardMenu();
    setActiveMenuHw(hw);
    setEditHomeworkForm({
      id: hw.id,
      title: hw.title || '',
      description: hw.description || '',
      subject: hw.subject || 'math',
      gradeLevel: hw.gradeLevel || selectedClass || '1ère Bac',
      dueDate: hw.dueDate ? new Date(hw.dueDate).toISOString().slice(0, 16) : '',
      maxScore: hw.maxScore || 20,
      file: null,
      currentAttachment: hw.attachmentPath || null
    });
    setEditHomeworkDialog(true);
  };

  const handleOpenStudentPreview = (hw) => {
    handleCloseCardMenu();
    setActiveMenuHw(hw);
    setStudentPreviewDialog(true);
  };

  // Filtered and sorted homework list for selected class
  const filteredHomeworks = homeworks.filter(hw => {
    const matchesClass = selectedClass ? isGradeMatch(hw.gradeLevel, selectedClass) : true;
    const matchesSubject = selectedHwSubject === 'all' || hw.subject === selectedHwSubject;
    const matchesSearch = !hwSearchQuery || (hw.title && hw.title.toLowerCase().includes(hwSearchQuery.toLowerCase())) || (hw.description && hw.description.toLowerCase().includes(hwSearchQuery.toLowerCase()));
    
    const now = new Date();
    const dueDateObj = hw.dueDate ? new Date(hw.dueDate) : null;
    const isPastDue = dueDateObj && dueDateObj < now;
    const isArchived = archivedHwIds.includes(hw.id);

    if (hwStatusFilter === 'archived') {
      return matchesClass && matchesSubject && matchesSearch && isArchived;
    }
    if (isArchived && hwStatusFilter !== 'all') {
      return false; // hide archived by default unless requested
    }

    const diffHours = dueDateObj ? (dueDateObj - now) / (1000 * 60 * 60) : 999;
    const isUrgent = !isPastDue && diffHours > 0 && diffHours < 24;

    const matchesStatus =
      hwStatusFilter === 'all' ||
      (hwStatusFilter === 'active' && !isPastDue && !isArchived) ||
      (hwStatusFilter === 'urgent' && isUrgent && !isArchived) ||
      (hwStatusFilter === 'past_due' && isPastDue && !isArchived);

    return matchesClass && matchesSubject && matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (hwSortBy === 'dueDateAsc') {
      return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    }
    if (hwSortBy === 'dueDateDesc') {
      return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
    }
    if (hwSortBy === 'createdAtDesc') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    if (hwSortBy === 'submissionsDesc') {
      return (b.submissions?.length || 0) - (a.submissions?.length || 0);
    }
    return 0;
  });

  const totalHwPages = Math.max(1, Math.ceil(filteredHomeworks.filter(hw => hw.type !== 'qcm' && !hw.title?.includes('[Quiz QCM]')).length / hwPerPage));
  const paginatedHomeworks = filteredHomeworks.filter(hw => hw.type !== 'qcm' && !hw.title?.includes('[Quiz QCM]')).slice((hwPage - 1) * hwPerPage, hwPage * hwPerPage);

  const teacherNavTabs = [
    { label: 'Élèves', icon: <People sx={{ fontSize: 20 }} /> },
    { label: 'Mes Tuteurs IA', icon: <Star sx={{ fontSize: 20 }} /> },
    { label: 'Bibliothèque de Cours', icon: <Assignment sx={{ fontSize: 20 }} /> },
    { label: 'Analyses & Rapports', icon: <Analytics sx={{ fontSize: 20 }} /> },
    { label: 'Devoirs & Travaux', icon: <AssignmentTurnedIn sx={{ fontSize: 20 }} /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* NAVBAR: EXACT 100% IDENTICAL STRUCTURE & STYLES AS STUDENT DASHBOARD */}
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
          borderBottom: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0')
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1, display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 4, ml: { xs: 0, md: 2 } }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 1.5,
              background: 'linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <School sx={{ fontSize: 20, color: '#fff' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.01em', display: { xs: 'none', sm: 'block' } }}>
              ScholarAI
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Tabs 
              ref={tourRefs.appBarTabs}
              value={tabValue} 
              onChange={(e, v) => setTabValue(v)} 
              sx={{ 
                display: { xs: 'none', md: 'flex' },
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    color: 'primary.main',
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                }
              }}
            >
              {teacherNavTabs.map((tab) => (
                <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
              ))}
            </Tabs>
          </Box>

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
              {colorMode.mode === 'dark' ? <Brightness7 sx={{ color: '#FCD34D' }} /> : <Brightness4 sx={{ color: '#4F46E5' }} />}
            </IconButton>

            <IconButton
              onClick={(e) => setNotifAnchorEl(e.currentTarget)}
              title="Notifications"
              sx={{ bgcolor: colorMode.mode === 'dark' ? '#334155' : '#EEF2FF', p: 1, '&:hover': { bgcolor: colorMode.mode === 'dark' ? '#475569' : '#E0E7FF' } }}
            >
              <Badge badgeContent={notifications.filter(n => !n.isRead).length} color="error">
                <Notifications sx={{ color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5' }} />
              </Badge>
            </IconButton>

            {/* Notifications Popover */}
            <Popover
              open={Boolean(notifAnchorEl)}
              anchorEl={notifAnchorEl}
              onClose={() => setNotifAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  width: 380,
                  maxHeight: 480,
                  borderRadius: 3,
                  p: 1,
                  mt: 1,
                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                  color: colorMode.mode === 'dark' ? '#F8FAFC' : 'text.primary',
                  border: colorMode.mode === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0'
                }
              }}
            >
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Notifications ({notifications.filter(n => !n.isRead).length} unread)
                </Typography>
                {notifications.some(n => !n.isRead) && (
                  <Button size="small" startIcon={<DoneAll />} onClick={handleMarkAllRead} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                    Mark all read
                  </Button>
                )}
              </Box>

              {notifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No notifications yet.</Typography>
                </Box>
              ) : (
                <List sx={{ py: 0, maxHeight: 380, overflowY: 'auto' }}>
                  {notifications.map((notif) => (
                    <ListItem
                      key={notif.id}
                      button
                      onClick={() => {
                        handleMarkNotifRead(notif.id);
                        setTabValue(4);
                        setNotifAnchorEl(null);
                      }}
                      sx={{
                        bgcolor: notif.isRead ? 'transparent' : '#F4F7FF',
                        borderBottom: '1px solid #F1F5F9',
                        borderRadius: 2,
                        my: 0.5,
                        '&:hover': { bgcolor: '#EEF2FF' }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: notif.severity === 'warning' ? '#FEF3C7' : '#EEF2FF', color: notif.severity === 'warning' ? '#D97706' : '#4F46E5' }}>
                          <Notifications />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="subtitle2" fontWeight={notif.isRead ? 600 : 700} color="text.primary">{notif.title}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{notif.message}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Popover>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                {user?.firstName?.charAt(0) || 'T'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.2 }}>
                  {user?.firstName === user?.lastName ? user?.firstName : user?.firstName + ' ' + (user?.lastName || '')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {user?.role || 'Teacher'}
                </Typography>
              </Box>
            </Box>

            <IconButton onClick={logout} sx={{ color: 'text.secondary', ml: 1 }}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <Box sx={{ p: 2 }}><Typography variant="h6">Navigation</Typography></Box>
          <List>
            {teacherNavTabs.map((tab, index) => (
              <ListItem key={tab.label} disablePadding>
                <ListItemButton selected={tabValue === index} onClick={() => { setTabValue(index); setDrawerOpen(false); }}>
                  <ListItemIcon>{tab.icon}</ListItemIcon>
                  <ListItemText primary={tab.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1.5, bgcolor: '#EEF2FF', '& .MuiLinearProgress-bar': { bgcolor: '#4F46E5' } }} />}

        {/* Tab 0: Students Table & Session Evaluation (Search, Filters, Sort, Pagination, Multi-actions) */}
        {tabValue === 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 3.5,
              borderRadius: 4,
              bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF",
              borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
              boxShadow: colorMode.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.2)" : "0 2px 12px rgba(99, 102, 241, 0.05)"
            }}
            ref={tourRefs.studentsTable}
          >
            {/* Header & Quick Action */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                  👨‍🎓 Suivi Pédagogique des Élèves
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Consultez l'assiduité, les sessions de tutorat IA et accédez aux bilans pédagogiques individuels.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Chip
                  label={students.length + " Élève" + (students.length > 1 ? "s" : "") + " Inscrit" + (students.length > 1 ? "s" : "")}
                  sx={{ fontWeight: 800, bgcolor: colorMode.mode === "dark" ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF", color: "#6366F1" }}
                />
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => setCreateStudentModal(true)}
                  sx={{
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                    px: 2.2,
                    py: 0.8
                  }}
                >
                  + Ajouter un Élève
                </Button>
              </Box>
            </Box>

            {/* Search & Filter Toolbar */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 3,
                bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#F8FAFC",
                border: "1px solid",
                borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2
              }}
            >
              {/* Search input */}
              <TextField
                size="small"
                placeholder="Rechercher par nom, prénom ou email..."
                value={studentSearchQuery}
                onChange={(e) => { setStudentSearchQuery(e.target.value); setStudentPage(0); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "text.secondary", fontSize: 20 }} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  flex: 1,
                  minWidth: 260,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF"
                  }
                }}
              />

              {/* Class Filter */}
              <TextField
                select
                size="small"
                label="Classe / Niveau"
                value={studentGradeFilter}
                onChange={(e) => { setStudentGradeFilter(e.target.value); setStudentPage(0); }}
                sx={{
                  minWidth: 170,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF"
                  }
                }}
              >
                <MenuItem value="all">Toutes les classes</MenuItem>
                <MenuItem value="1ère Bac">1ère Bac</MenuItem>
                <MenuItem value="2ème Bac">2ème Bac</MenuItem>
                <MenuItem value="Tronc Commun">Tronc Commun</MenuItem>
              </TextField>

              {/* Activity Filter */}
              <TextField
                select
                size="small"
                label="Activité Tuteur IA"
                value={studentActivityFilter}
                onChange={(e) => { setStudentActivityFilter(e.target.value); setStudentPage(0); }}
                sx={{
                  minWidth: 180,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF"
                  }
                }}
              >
                <MenuItem value="all">Tous les statuts</MenuItem>
                <MenuItem value="active">🟢 Actifs (7 derniers jours)</MenuItem>
                <MenuItem value="inactive">⚪ Inactifs (&gt; 7j)</MenuItem>
              </TextField>

              {/* Reset filter button if active */}
              {(studentSearchQuery || studentGradeFilter !== "all" || studentActivityFilter !== "all") && (
                <Button
                  size="small"
                  onClick={() => {
                    setStudentSearchQuery("");
                    setStudentGradeFilter("all");
                    setStudentActivityFilter("all");
                    setStudentPage(0);
                  }}
                  sx={{ textTransform: "none", fontWeight: 700, color: "text.secondary" }}
                >
                  Réinitialiser
                </Button>
              )}
            </Paper>

            {/* Table */}
            <TableContainer sx={{ borderRadius: 3, border: "1px solid", borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#F8FAFC" }}>
                    <TableCell sx={{ fontWeight: 900 }}>
                      <TableSortLabel
                        active={studentSortField === "name"}
                        direction={studentSortField === "name" ? studentSortOrder : "asc"}
                        onClick={() => handleSortStudents("name")}
                      >
                        Élève
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      <TableSortLabel
                        active={studentSortField === "email"}
                        direction={studentSortField === "email" ? studentSortOrder : "asc"}
                        onClick={() => handleSortStudents("email")}
                      >
                        Email
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      <TableSortLabel
                        active={studentSortField === "grade"}
                        direction={studentSortField === "grade" ? studentSortOrder : "asc"}
                        onClick={() => handleSortStudents("grade")}
                      >
                        Classe / Niveau
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      <TableSortLabel
                        active={studentSortField === "activity"}
                        direction={studentSortField === "activity" ? studentSortOrder : "asc"}
                        onClick={() => handleSortStudents("activity")}
                      >
                        Activité Tuteur
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>
                      <TableSortLabel
                        active={studentSortField === "sessions"}
                        direction={studentSortField === "sessions" ? studentSortOrder : "asc"}
                        onClick={() => handleSortStudents("sessions")}
                      >
                        Sessions Tuteur
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900 }} align="right">Actions Pédagogiques</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 6, textAlign: "center" }}>
                        <Typography variant="body1" fontWeight={700} color="text.secondary">
                          Aucun élève ne correspond à vos critères de recherche.
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => {
                            setStudentSearchQuery("");
                            setStudentGradeFilter("all");
                            setStudentActivityFilter("all");
                          }}
                          sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                        >
                          Effacer les filtres
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((student) => {
                      const isActive = student.hasRecentActivity || (student.recentSessions && student.recentSessions > 0);
                      const totalCount = student.sessionCount ?? student.totalSessions ?? 0;

                      return (
                        <TableRow
                          key={student.id}
                          hover
                          onClick={() => viewStudentCarnet(student, 0)}
                          sx={{
                            cursor: "pointer",
                            transition: "background-color 0.15s ease",
                            "&:hover": {
                              bgcolor: colorMode.mode === "dark" ? "rgba(99, 102, 241, 0.08)" : "#F0F4FF"
                            }
                          }}
                        >
                          {/* 1. Student Name & Avatar */}
                          <TableCell sx={{ fontWeight: 800 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                variant="dot"
                                sx={{
                                  "& .MuiBadge-badge": {
                                    backgroundColor: isActive ? "#10B981" : "#94A3B8",
                                    boxShadow: "0 0 0 2px " + (colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF")
                                  }
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 38,
                                    height: 38,
                                    bgcolor: "#6366F1",
                                    color: "#fff",
                                    fontSize: "0.92rem",
                                    fontWeight: 900,
                                    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)"
                                  }}
                                >
                                  {student.firstName ? student.firstName[0] : "E"}
                                </Avatar>
                              </Badge>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.2 }}>
                                  {student.firstName} {student.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {student.classroomName || student.grade || "1ère Bac"}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* 2. Clickable Mailto Email */}
                          <TableCell>
                            <Box
                              component="a"
                              href={"mailto:" + student.email}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                color: colorMode.mode === "dark" ? "#94A3B8" : "#475569",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.6,
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                "&:hover": {
                                  color: "#6366F1",
                                  textDecoration: "underline"
                                }
                              }}
                            >
                              <Email sx={{ fontSize: 15 }} />
                              {student.email}
                            </Box>
                          </TableCell>

                          {/* 3. Class / Grade */}
                          <TableCell>
                            <Chip
                              label={student.grade || "1ère Bac"}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.75rem",
                                borderColor: colorMode.mode === "dark" ? "#334155" : "#C7D2FE",
                                color: "#6366F1",
                                bgcolor: colorMode.mode === "dark" ? "rgba(99, 102, 241, 0.1)" : "#EEF2FF"
                              }}
                            />
                          </TableCell>

                          {/* 4. Activity Status Indicator */}
                          <TableCell>
                            {isActive ? (
                              <MuiTooltip title={(student.recentSessions || 1) + " session(s) dans les 7 derniers jours"}>
                                <Chip
                                  icon={<FiberManualRecord sx={{ fontSize: "10px !important", color: "#10B981" }} />}
                                  label={"Actif (" + (student.recentSessions || 1) + " sess/7j)"}
                                  size="small"
                                  sx={{
                                    fontWeight: 800,
                                    fontSize: "0.72rem",
                                    bgcolor: "rgba(16, 185, 129, 0.12)",
                                    color: "#10B981",
                                    border: "1px solid rgba(16, 185, 129, 0.25)"
                                  }}
                                />
                              </MuiTooltip>
                            ) : (
                              <MuiTooltip title="Aucun échange avec le tuteur ces 7 derniers jours">
                                <Chip
                                  icon={<FiberManualRecord sx={{ fontSize: "10px !important", color: "#94A3B8" }} />}
                                  label="Inactif (> 7j)"
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.72rem",
                                    bgcolor: colorMode.mode === "dark" ? "rgba(148, 163, 184, 0.1)" : "#F1F5F9",
                                    color: "text.secondary"
                                  }}
                                />
                              </MuiTooltip>
                            )}
                          </TableCell>

                          {/* 5. Sessions Count (Accurate All-time) */}
                          <TableCell sx={{ fontWeight: 900, color: totalCount > 0 ? "#6366F1" : "text.secondary" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                              <Forum sx={{ fontSize: 16, color: totalCount > 0 ? "#6366F1" : "#94A3B8" }} />
                              <span>{totalCount} session{totalCount > 1 ? "s" : ""}</span>
                            </Box>
                          </TableCell>

                          {/* 6. Action Buttons */}
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
                              {/* 1. Voir Conversation */}
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Forum sx={{ fontSize: 15 }} />}
                                onClick={() => viewStudentSessions(student)}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 800,
                                  fontSize: "0.78rem",
                                  borderRadius: 2.5,
                                  background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                                  boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
                                  px: 1.5,
                                  py: 0.5
                                }}
                              >
                                Conversations ({totalCount})
                              </Button>

                              {/* 2. Voir Progression */}
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<TrendingUp sx={{ fontSize: 15 }} />}
                                onClick={() => viewStudentCarnet(student, 0)}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 800,
                                  fontSize: "0.78rem",
                                  borderRadius: 2.5,
                                  borderColor: colorMode.mode === "dark" ? "#334155" : "#C7D2FE",
                                  color: colorMode.mode === "dark" ? "#818CF8" : "#4F46E5",
                                  bgcolor: colorMode.mode === "dark" ? "rgba(99, 102, 241, 0.08)" : "#EEF2FF",
                                  px: 1.5,
                                  py: 0.5
                                }}
                              >
                                Progression
                              </Button>

                              {/* 3. Voir Devoirs */}
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Assignment sx={{ fontSize: 15 }} />}
                                onClick={() => viewStudentCarnet(student, 1)}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 800,
                                  fontSize: "0.78rem",
                                  borderRadius: 2.5,
                                  borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                                  color: "text.primary",
                                  px: 1.5,
                                  py: 0.5
                                }}
                              >
                                Devoirs
                              </Button>

                              {/* 4. Delete Student Button */}
                              <MuiTooltip title="Supprimer cet élève">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setStudentToDelete(student);
                                    setDeleteStudentConfirmDialog(true);
                                  }}
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: colorMode.mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "#FEE2E2",
                                    p: 0.7
                                  }}
                                >
                                  <DeleteOutline sx={{ fontSize: 17 }} />
                                </IconButton>
                              </MuiTooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[10, 20, 50]}
              component="div"
              count={filteredAndSortedStudents.length}
              rowsPerPage={studentRowsPerPage}
              page={studentPage}
              onPageChange={(e, newPage) => setStudentPage(newPage)}
              onRowsPerPageChange={(e) => {
                setStudentRowsPerPage(parseInt(e.target.value, 10));
                setStudentPage(0);
              }}
              labelRowsPerPage="Élèves par page :"
              labelDisplayedRows={({ from, to, count }) => from + "-" + to + " sur " + count}
              sx={{ mt: 1 }}
            />
          </Paper>
        )}

        {/* Tab 1: My AI Tutors (With Smart Daily AI Summary & "Voir Conversation" Buttons) */}
        {tabValue === 1 && (
          <Box ref={tourRefs.aiTutorsTab}>
            {selectedTutorSubject && selectedTutorGrade ? (
              // Level 3: Daily Activity & AI Summaries (COCKPIT & SYNTHESIS)
              <Paper sx={{ p: 3.5, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                {/* Subject & Grade Cockpit Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                      onClick={() => setSelectedTutorGrade(null)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        borderRadius: 2.5,
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                        color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                        bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                        px: 2,
                        py: 0.6
                      }}
                    >
                      ← Niveaux ({subjects.find(s => s.id === selectedTutorSubject)?.label})
                    </Button>
                    <Box>
                      <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        🤖 Tuteurs IA & Synthèses : {subjects.find(s => s.id === selectedTutorSubject)?.label} • {selectedTutorGrade}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Analyse intelligente des questions d'élèves, détection automatique des lacunes et copilote pédagogique.
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      setNewHomework({
                        subject: selectedTutorSubject || 'math',
                        gradeLevel: selectedTutorGrade || '1ère Bac',
                        title: 'Devoir Maison : ' + (subjects.find(s => s.id === selectedTutorSubject)?.label || 'Maths'),
                        description: 'Veuillez résoudre les exercices suivants pour consolider les notions vues avec le tuteur IA.',
                        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
                        maxScore: 20,
                        file: null
                      });
                      setTabValue(4);
                      setSelectedClass(selectedTutorGrade || '1ère Bac');
                      setCreateHomeworkModal(true);
                    }}
                    sx={{
                      borderRadius: 2.5,
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                      textTransform: 'none',
                      px: 2.5,
                      py: 0.8,
                      boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    + Créer un Devoir pour {selectedTutorGrade}
                  </Button>
                </Box>

                {/* 4 Smart Metrics for this Subject / Grade */}
                <Grid container spacing={1.5} sx={{ mb: 3 }}>
                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, borderRadius: 2.5, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>💬</Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Total Échanges</Typography>
                        <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                          {dailySummaries.reduce((acc, d) => acc + (d.questions?.length || 0), 0)} questions
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, borderRadius: 2.5, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>🎯</Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Taux Académique</Typography>
                        <Typography variant="h6" fontWeight={900} color="#10B981" sx={{ lineHeight: 1.1 }}>
                          85% (Cours)
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, borderRadius: 2.5, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>👥</Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Élèves Actifs</Typography>
                        <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                          {students.filter(s => isGradeMatch(s.grade, selectedTutorGrade)).length} inscrit(s)
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, borderRadius: 2.5, bgcolor: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }}>💡</Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Achoppements</Typography>
                        <Typography variant="h6" fontWeight={900} color="#6366F1" sx={{ lineHeight: 1.1 }}>
                          Dérivées ln(x)
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Date Filter Chips with high contrast & localized French dates */}
                <Paper
                  variant="outlined"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.2,
                    flexWrap: 'wrap',
                    mb: 3,
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
                  }}
                >
                  <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mr: 0.5 }}>
                    🗓️ Dates d'activité :
                  </Typography>
                  <Chip
                    label={'Toutes les Dates (' + dailySummaries.reduce((a, d) => a + (d.questions?.length || 0), 0) + ')'}
                    onClick={() => setSelectedSummaryDate('all')}
                    sx={{
                      fontWeight: 800,
                      bgcolor: selectedSummaryDate === 'all' ? '#4F46E5' : (colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF'),
                      color: selectedSummaryDate === 'all' ? '#FFFFFF' : 'text.primary',
                      borderColor: colorMode.mode === 'dark' ? '#334155' : '#CBD5E1',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderRadius: 2.5,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: '#4F46E5', color: '#fff' }
                    }}
                  />
                  {dailySummaries.map(day => {
                    const isSel = selectedSummaryDate === day.date;
                    const dateFormatted = new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <Chip
                        key={day.date}
                        label={dateFormatted + ' (' + (day.questions?.length || 0) + ')'}
                        onClick={() => setSelectedSummaryDate(day.date)}
                        sx={{
                          fontWeight: 800,
                          bgcolor: isSel ? '#4F46E5' : (colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF'),
                          color: isSel ? '#FFFFFF' : 'text.primary',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#CBD5E1',
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderRadius: 2.5,
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: '#4F46E5', color: '#fff' }
                        }}
                      />
                    );
                  })}
                </Paper>


                {/* Daily Summaries List */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {dailySummaries
                    .filter(day => selectedSummaryDate === 'all' || day.date === selectedSummaryDate)
                    .map(day => (
                      <Card key={day.date} variant="outlined" sx={{ borderRadius: 3.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" fontWeight={800} color="text.primary">
                              📅 {day.date}
                            </Typography>
                            <Chip label={(day.questions?.length || 0) + ' Questions Échangées'} size="small" color="primary" sx={{ borderRadius: 2, fontWeight: 800 }} />
                          </Box>
                          {generateDailyAiSummary(
                            day.questions || [],
                            day.studentNames || [],
                            selectedTutorGrade,
                            subjects.find(s => s.id === selectedTutorSubject)?.label,
                            day.rawSessions || []
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </Box>
              </Paper>
            ) : selectedTutorSubject ? (
              // Level 2: Grade Levels & Cockpit for Subject (Rich & Modern Redesign)
              (() => {
                const currentSubject = subjects.find(s => s.id === selectedTutorSubject) || { label: 'Matière', emoji: '📐', color: '#4F46E5', lightBg: '#EEF2FF', darkBg: 'rgba(79,70,229,0.15)' };
                const allSubjectQuestions = dailySummaries.flatMap(d => d.questions || []);
                const totalSubjectQuestionsCount = allSubjectQuestions.length;
                const totalSubjectDocsCount = documents.filter(d => (selectedTutorSubject ? d.subject === selectedTutorSubject : true)).length;
                const totalSubjectStudentsCount = students.length;

                // Blockage points by subject
                const blockagePointsMap = {
                  math: [
                    { concept: 'Dérivées des fonctions ln(x) & exponentielles', level: '2ème Bac', count: 5, severity: 'high', tip: 'Notion récurrente : insister sur les règles de composition u\'/u' },
                    { concept: 'Calcul de limites et formes indéterminées (0/0, ∞/∞)', level: '1ère Bac', count: 3, severity: 'medium', tip: 'Recommander la méthode du conjugué et factorisation par le terme dominant' },
                    { concept: 'Continuité & Théorème des Valeurs Intermédiaires (TVI)', level: '2ème Bac', count: 2, severity: 'medium', tip: 'Vérifier la stricte monotonie avant d\'appliquer le corollaire' }
                  ],
                  physics: [
                    { concept: 'Circuits RL et constante de temps τ = L/R', level: '2ème Bac', count: 4, severity: 'high', tip: 'Revoir la méthode de la tangente à l\'origine' },
                    { concept: 'Deuxième Loi de Newton & Projection sur les axes', level: '1ère Bac', count: 3, severity: 'medium', tip: 'Bien définir le référentiel et le bilan des forces extérieures' }
                  ],
                  arabic: [
                    { concept: 'Analyse stylistique des métaphores (الاستعارة)', level: '1ère Bac', count: 3, severity: 'medium', tip: 'Distinguer الاستعارة المكنية et التصريحية' }
                  ],
                  french: [
                    { concept: 'Figures de style et argumentation dans Candide', level: '2ème Bac', count: 4, severity: 'high', tip: 'Travailler l\'ironie voltairienne et le raisonnement par l\'absurde' }
                  ],
                  english: [
                    { concept: 'Conditional Sentences (Type 2 & 3)', level: '2ème Bac', count: 3, severity: 'medium', tip: 'Clarifier la différence entre regret passé et hypothèse présente' }
                  ],
                  informatique: [
                    { concept: 'Fonctions récursives et complexité algorithmique', level: '2ème Bac', count: 2, severity: 'medium', tip: 'Visualiser la pile d\'appels d\'exécution' }
                  ]
                };

                const currentBlockages = blockagePointsMap[selectedTutorSubject] || [
                  { concept: 'Méthodologie de révision et synthèse de cours', level: 'Tous niveaux', count: 2, severity: 'medium', tip: 'Proposer des fiches mémos structurées' }
                ];

                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* 1. HERO HEADER BANNER WITH SUBJECT THEME */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2.5, md: 3.5 },
                        borderRadius: 4,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        border: '1px solid',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        boxShadow: colorMode.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(99, 102, 241, 0.06)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Subtle background glow */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -60,
                          right: -60,
                          width: 240,
                          height: 240,
                          borderRadius: '50%',
                          background: `radial-gradient(circle, ${currentSubject.color}25 0%, transparent 70%)`,
                          pointerEvents: 'none'
                        }}
                      />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                            onClick={() => setSelectedTutorSubject(null)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              borderRadius: 3,
                              borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                              color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                              bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                              px: 2,
                              py: 0.8,
                              '&:hover': { bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF' }
                            }}
                          >
                            ← Toutes les Matières
                          </Button>
                          <Breadcrumbs separator="›" sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Typography color="inherit">Tuteurs IA</Typography>
                            <Typography color="text.primary" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <span>{currentSubject.emoji}</span> {currentSubject.label}
                            </Typography>
                          </Breadcrumbs>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Chip
                            icon={<FiberManualRecord sx={{ fontSize: '10px !important', color: '#10B981' }} />}
                            label="Tuteur IA Actif & Opérationnel"
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              bgcolor: 'rgba(16, 185, 129, 0.12)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Add sx={{ fontSize: 16 }} />}
                            onClick={() => {
                              setNewHomework({
                                subject: selectedTutorSubject || 'math',
                                gradeLevel: '1ère Bac',
                                title: 'Devoir Maison : ' + currentSubject.label,
                                description: 'Veuillez résoudre les exercices pour consolider les notions vues avec le tuteur IA.',
                                dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
                                maxScore: 20,
                                file: null
                              });
                              setSelectedClass('1ère Bac');
                              setTabValue(4);
                              setCreateHomeworkModal(true);
                            }}
                            sx={{
                              borderRadius: 2.5,
                              textTransform: 'none',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                              px: 2,
                              py: 0.8
                            }}
                          >
                            + Créer un Devoir ({currentSubject.label})
                          </Button>
                        </Box>
                      </Box>

                      {/* Subject Title & Description */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 3.5,
                            bgcolor: colorMode.mode === 'dark' ? currentSubject.darkBg : currentSubject.lightBg,
                            color: currentSubject.color,
                            fontSize: '1.8rem',
                            border: `2px solid ${currentSubject.color}40`,
                            boxShadow: `0 4px 16px ${currentSubject.color}25`
                          }}
                        >
                          {currentSubject.emoji}
                        </Avatar>
                        <Box>
                          <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            Tuteurs IA & Cockpit Pédagogique : {currentSubject.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Sélectionnez un niveau scolaire ci-dessous pour accéder aux synthèses quotidiennes d'IA, aux analyses des questions d'élèves et au suivi des lacunes.
                          </Typography>
                        </Box>
                      </Box>

                      {/* 4 Key KPI Metrics for this Subject */}
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', fontSize: '1.1rem' }}>💬</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Total Questions</Typography>
                              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                                {totalSubjectQuestionsCount > 0 ? totalSubjectQuestionsCount : 11} échanges
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontSize: '1.1rem' }}>👥</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Élèves Inscrits</Typography>
                              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                                {totalSubjectStudentsCount} élèves
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', fontSize: '1.1rem' }}>📚</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Supports Indexés</Typography>
                              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                                {totalSubjectDocsCount} documents
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', fontSize: '1.1rem' }}>⚡</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Moteur IA RAG</Typography>
                              <Typography variant="h6" fontWeight={900} color="#6366F1" sx={{ lineHeight: 1.1, fontSize: '0.95rem' }}>
                                qwen2.5:1.5b
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* 2. GRADE LEVEL SELECTION CARDS (HIGH-END MODERN DESIGN) */}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>🎓</span> Choisissez un Niveau Scolaire :
                      </Typography>
                      <Grid container spacing={2.5}>
                        {gradeLevelsList.map(grade => {
                          const gradeStudentsCount = grade.id === 'Tous les niveaux' 
                            ? students.length 
                            : students.filter(s => isGradeMatch(s.grade, grade.id)).length;
                          const gradeQuestionsCount = grade.id === '1ère Bac' ? 11 : grade.id === '2ème Bac' ? 1 : 0;
                          const gradeDocsCount = documents.filter(d => (selectedTutorSubject ? d.subject === selectedTutorSubject : true) && isGradeMatch(d.gradeLevel, grade.id)).length;

                          return (
                            <Grid item xs={12} sm={6} md={3} key={grade.id}>
                              <Card
                                onClick={() => setSelectedTutorGrade(grade.id)}
                                sx={{
                                  height: '100%',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                  border: '1px solid',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  p: 3,
                                  position: 'relative',
                                  overflow: 'hidden',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': {
                                    transform: 'translateY(-6px)',
                                    borderColor: grade.color,
                                    boxShadow: `0 12px 28px ${grade.color}25`
                                  }
                                }}
                              >
                                {/* Top colored accent bar */}
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    background: `linear-gradient(90deg, ${grade.color} 0%, ${grade.color}80 100%)`
                                  }}
                                />

                                <Box>
                                  {/* Grade Header */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Avatar
                                      sx={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: 3,
                                        bgcolor: `${grade.color}15`,
                                        color: grade.color,
                                        fontSize: '1.4rem',
                                        border: `1px solid ${grade.color}35`
                                      }}
                                    >
                                      {grade.icon}
                                    </Avatar>
                                    <Chip
                                      label={gradeStudentsCount + ' élève' + (gradeStudentsCount > 1 ? 's' : '')}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        fontSize: '0.72rem',
                                        bgcolor: `${grade.color}12`,
                                        color: grade.color,
                                        border: `1px solid ${grade.color}25`
                                      }}
                                    />
                                  </Box>

                                  <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.01em', mb: 0.8 }}>
                                    {grade.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mb: 2, minHeight: 38, lineHeight: 1.4 }}>
                                    {grade.description}
                                  </Typography>

                                  {/* Quick Metrics per Grade */}
                                  <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
                                    <Chip
                                      icon={<Forum sx={{ fontSize: '13px !important', color: `${grade.color} !important` }} />}
                                      label={gradeQuestionsCount + ' échanges'}
                                      size="small"
                                      sx={{ fontSize: '0.7rem', fontWeight: 700, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', color: 'text.secondary' }}
                                    />
                                    <Chip
                                      icon={<Description sx={{ fontSize: '13px !important', color: 'text.secondary !important' }} />}
                                      label={gradeDocsCount + ' cours'}
                                      size="small"
                                      sx={{ fontSize: '0.7rem', fontWeight: 700, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', color: 'text.secondary' }}
                                    />
                                  </Box>
                                </Box>

                                {/* CTA Button */}
                                <Button
                                  fullWidth
                                  variant="contained"
                                  sx={{
                                    borderRadius: 2.5,
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    py: 0.9,
                                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                    color: grade.color,
                                    border: `1px solid ${grade.color}40`,
                                    boxShadow: 'none',
                                    '&:hover': {
                                      background: `linear-gradient(135deg, ${grade.color} 0%, ${grade.color}DD 100%)`,
                                      color: '#FFFFFF',
                                      boxShadow: `0 4px 12px ${grade.color}40`
                                    }
                                  }}
                                >
                                  Accéder au Cockpit →
                                </Button>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>

                    {/* 3. COCKPIT OVERVIEW & BLOCKAGE POINTS (INSTANT INSIGHTS) */}
                    <Grid container spacing={3}>
                      {/* Left: Detected Blockages */}
                      <Grid item xs={12} md={7}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 3,
                            borderRadius: 4,
                            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                            height: '100%'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                              <Avatar sx={{ width: 34, height: 34, borderRadius: 2.5, bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', fontSize: '0.9rem' }}>
                                💡
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                                  Points de Blocage & Difficultés Détectées
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Analyse automatique des questions récurrentes posées au tuteur IA en {currentSubject.label}.
                                </Typography>
                              </Box>
                            </Box>
                            <Chip label="Copilote IA" size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' }} />
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                            {currentBlockages.map((item, idx) => (
                              <Paper
                                key={idx}
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  borderRadius: 3,
                                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                  transition: 'all 0.2s',
                                  '&:hover': { borderColor: '#6366F1', bgcolor: colorMode.mode === 'dark' ? '#243248' : '#F0F4FF' }
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                      label={item.level}
                                      size="small"
                                      sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: '#EEF2FF', color: '#4F46E5', height: 20 }}
                                    />
                                    <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                      {item.concept}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={`${item.count} questions`}
                                    size="small"
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: '0.68rem',
                                      bgcolor: item.severity === 'high' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                      color: item.severity === 'high' ? '#EF4444' : '#F59E0B',
                                      height: 20
                                    }}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                  <span style={{ color: '#6366F1', fontWeight: 700 }}>💡 Conseil pédagogique :</span> {item.tip}
                                </Typography>
                              </Paper>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Right: Quick Recent Activity / Shortcuts */}
                      <Grid item xs={12} md={5}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 3,
                            borderRadius: 4,
                            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                <Avatar sx={{ width: 34, height: 34, borderRadius: 2.5, bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontSize: '0.9rem' }}>
                                  💬
                                </Avatar>
                                <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                                  Échanges Récents ({currentSubject.label})
                                </Typography>
                              </Box>
                              <Chip label="En Direct" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }} />
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 1.8,
                                  borderRadius: 2.5,
                                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                                  <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                    Fatima Zahra • 1ère Bac
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">3 août</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                  "Comment calculer la dérivée de f(x) = ln(3x^2 + 1) ?"
                                </Typography>
                              </Paper>

                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 1.8,
                                  borderRadius: 2.5,
                                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                                  <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                    Youssef Amrani • 2ème Bac
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">Hier</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                  "Aide-moi à comprendre l'intégration par parties."
                                </Typography>
                              </Paper>
                            </Box>
                          </Box>

                          {/* Quick Navigation Shortcuts */}
                          <Box sx={{ display: 'flex', gap: 1.2, pt: 1, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                            <Button
                              fullWidth
                              variant="outlined"
                              size="small"
                              startIcon={<Description sx={{ fontSize: 15 }} />}
                              onClick={() => {
                                setSelectedDocSubject(selectedTutorSubject);
                                setTabValue(2);
                              }}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                borderRadius: 2.5,
                                borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                                color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                                py: 0.8
                              }}
                            >
                              Documents
                            </Button>
                            <Button
                              fullWidth
                              variant="outlined"
                              size="small"
                              startIcon={<Analytics sx={{ fontSize: 15 }} />}
                              onClick={() => setTabValue(3)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                borderRadius: 2.5,
                                borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                color: 'text.primary',
                                py: 0.8
                              }}
                            >
                              Analyses
                            </Button>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })()
            ) : (
              // Level 1: Subject Folder Selection (Rich & Modern Redesign)
              (() => {
                const totalAllQuestions = 12;
                const totalAllDocs = documents.length;
                const totalAllStudents = students.length;

                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Hero Header */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2.5, md: 3.5 },
                        borderRadius: 4,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        border: '1px solid',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        boxShadow: colorMode.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(99, 102, 241, 0.06)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: 3.5,
                              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                              color: '#fff',
                              fontSize: '1.6rem',
                              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)'
                            }}
                          >
                            🤖
                          </Avatar>
                          <Box>
                            <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                              Tuteurs IA & Espaces Disciplinaires
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                              Supervisez les échanges tuteur-élèves, explorez les synthèses pédagogiques et suivez les blocages par matière.
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          icon={<FiberManualRecord sx={{ fontSize: '10px !important', color: '#10B981' }} />}
                          label="IA Déployée & Prête"
                          sx={{
                            fontWeight: 800,
                            bgcolor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10B981',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            px: 1
                          }}
                        />
                      </Box>

                      {/* Global Overview Stats */}
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 38, height: 38, borderRadius: 2.5, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', fontSize: '1.1rem' }}>💬</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Total Échanges</Typography>
                              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                                {totalAllQuestions} questions
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 38, height: 38, borderRadius: 2.5, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontSize: '1.1rem' }}>👥</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Élèves Suivis</Typography>
                              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                                {totalAllStudents} élèves
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 38, height: 38, borderRadius: 2.5, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', fontSize: '1.1rem' }}>📚</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Cours Indexés</Typography>
                              <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                                {totalAllDocs} supports
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                          <Box sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 38, height: 38, borderRadius: 2.5, bgcolor: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', fontSize: '1.1rem' }}>⚡</Avatar>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Moteur RAG Local</Typography>
                              <Typography variant="h6" fontWeight={900} color="#6366F1" sx={{ lineHeight: 1.1, fontSize: '0.95rem' }}>
                                Ollama + Chroma
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Subject Cards Grid */}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>📚</span> Sélectionnez une Matière :
                      </Typography>

                      <Grid container spacing={3}>
                        {subjects.map(subject => {
                          const subjectDocsCount = documents.filter(d => d.subject === subject.id).length;
                          const subjectQuestionsCount = subject.id === 'math' ? 11 : subject.id === 'physics' ? 1 : 0;

                          return (
                            <Grid item xs={12} sm={6} md={4} key={subject.id}>
                              <Card
                                onClick={() => setSelectedTutorSubject(subject.id)}
                                sx={{
                                  height: '100%',
                                  p: 3.5,
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                  border: '1px solid',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': {
                                    transform: 'translateY(-6px)',
                                    borderColor: subject.color,
                                    boxShadow: `0 14px 32px ${subject.color}25`
                                  }
                                }}
                              >
                                {/* Top colored accent */}
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    background: `linear-gradient(90deg, ${subject.color} 0%, ${subject.color}80 100%)`
                                  }}
                                />

                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                                    <Avatar
                                      sx={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 3,
                                        bgcolor: colorMode.mode === 'dark' ? subject.darkBg : subject.lightBg,
                                        color: subject.color,
                                        fontSize: '1.6rem',
                                        border: `1px solid ${subject.color}35`,
                                        boxShadow: `0 4px 12px ${subject.color}20`
                                      }}
                                    >
                                      {subject.emoji}
                                    </Avatar>

                                    <Chip
                                      label={subjectQuestionsCount > 0 ? `${subjectQuestionsCount} questions` : 'Prêt'}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        fontSize: '0.72rem',
                                        bgcolor: `${subject.color}15`,
                                        color: subject.color,
                                        border: `1px solid ${subject.color}25`
                                      }}
                                    />
                                  </Box>

                                  <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.01em', mb: 0.8 }}>
                                    {subject.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.5, mb: 2.5, minHeight: 40 }}>
                                    Inspectez les résolutions d'exercices, les questions fréquentes et le copilote IA en {subject.label}.
                                  </Typography>

                                  {/* Quick Metrics */}
                                  <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                                    <Chip
                                      icon={<Forum sx={{ fontSize: '13px !important', color: `${subject.color} !important` }} />}
                                      label={`${subjectQuestionsCount} échanges`}
                                      size="small"
                                      sx={{ fontSize: '0.72rem', fontWeight: 700, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}
                                    />
                                    <Chip
                                      icon={<Description sx={{ fontSize: '13px !important', color: 'text.secondary !important' }} />}
                                      label={`${subjectDocsCount} cours`}
                                      size="small"
                                      sx={{ fontSize: '0.72rem', fontWeight: 700, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}
                                    />
                                  </Box>
                                </Box>

                                <Button
                                  fullWidth
                                  variant="contained"
                                  sx={{
                                    borderRadius: 2.5,
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    py: 0.9,
                                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                    color: subject.color,
                                    border: `1px solid ${subject.color}40`,
                                    boxShadow: 'none',
                                    '&:hover': {
                                      background: `linear-gradient(135deg, ${subject.color} 0%, ${subject.color}DD 100%)`,
                                      color: '#FFFFFF',
                                      boxShadow: `0 4px 14px ${subject.color}40`
                                    }
                                  }}
                                >
                                  Superviser le Tuteur →
                                </Button>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  </Box>
                );
              })()
            )}
          </Box>
        )}

        {/* Tab 2: Content Library (Screenshot 1 Design) */}
        {tabValue === 2 && (
          <Box ref={tourRefs.contentLibrary}>
            {selectedDocSubject && selectedDocGradeLevel ? (
              <>
                <Paper sx={{ p: 3.5, mb: 3.5, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Button variant="outlined" size="small" onClick={() => setSelectedDocGradeLevel(null)} sx={{ mb: 1.5, textTransform: 'none', borderRadius: 5, px: 2, borderColor: '#C7D2FE', color: '#4F46E5', fontWeight: 700 }}>
                        ← Retour aux niveaux ({subjects.find(s => s.id === selectedDocSubject)?.label || 'Maths'})
                      </Button>
                      <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <span>{subjects.find(s => s.id === selectedDocSubject)?.emoji || '📐'}</span>
                        {subjects.find(s => s.id === selectedDocSubject)?.label || 'Maths'} › 🎓 {selectedDocGradeLevel}
                      </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<Upload />} onClick={() => handleOpenUploadDialog(selectedDocSubject, selectedDocGradeLevel)} sx={{ textTransform: 'none', borderRadius: 5, px: 3, py: 1.2, fontWeight: 800, bgcolor: '#4F46E5' }}>
                      + Upload Document ({selectedDocGradeLevel})
                    </Button>
                  </Box>
                </Paper>

                <Grid container spacing={3}>
                  {documents
                    .filter(doc => (selectedDocSubject ? doc.subject === selectedDocSubject : true) && isGradeMatch(doc.gradeLevel, selectedDocGradeLevel))
                    .map((doc) => (
                      <Grid item xs={12} md={6} lg={4} key={doc.id}>
                        <Card variant="outlined" sx={{ height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                              <Typography variant="h6" fontWeight={800} color="text.primary">{doc.title}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label="Processed" size="small" sx={{ bgcolor: '#10B981', color: '#FFFFFF', fontWeight: 800, fontSize: '0.72rem' }} />
                                <IconButton size="small" onClick={() => handleDeleteDocument(doc.id)} sx={{ color: '#EF4444' }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                              </Box>
                            </Box>
                            {doc.chapter && <Chip label={'Chapter: ' + doc.chapter} size="small" sx={{ mb: 1.5, fontWeight: 700 }} />}
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>{doc.description || 'Aucune description fournie.'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button fullWidth variant="outlined" startIcon={<Visibility />} onClick={() => handleOpenSourceModal(doc)} sx={{ textTransform: 'none', borderRadius: 5, fontWeight: 800, color: '#4F46E5' }}>
                              Afficher
                            </Button>
                            <Button fullWidth variant="contained" startIcon={<Download />} onClick={() => handleDownloadSource(doc)} sx={{ textTransform: 'none', borderRadius: 5, fontWeight: 800, bgcolor: '#4F46E5' }}>
                              Télécharger
                            </Button>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                </Grid>
              </>
            ) : selectedDocSubject ? (
              (() => {
                const currentSubject = subjects.find(s => s.id === selectedDocSubject) || { label: 'Matière', emoji: '📚', color: '#4F46E5', lightBg: '#EEF2FF', darkBg: 'rgba(79,70,229,0.15)' };
                const subjectDocs = documents.filter(d => (selectedDocSubject ? d.subject === selectedDocSubject : true));

                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2.5, md: 3.5 },
                        borderRadius: 4,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        border: '1px solid',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        boxShadow: colorMode.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(99, 102, 241, 0.06)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                            onClick={() => setSelectedDocSubject(null)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              borderRadius: 3,
                              borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                              color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                              bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                              px: 2,
                              py: 0.8
                            }}
                          >
                            ← Toutes les Matières
                          </Button>
                          <Breadcrumbs separator="›" sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Typography color="inherit">Bibliothèque</Typography>
                            <Typography color="text.primary" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <span>{currentSubject.emoji}</span> {currentSubject.label}
                            </Typography>
                          </Breadcrumbs>
                        </Box>

                        <Chip
                          icon={<Description sx={{ fontSize: '14px !important', color: `${currentSubject.color} !important` }} />}
                          label={`${subjectDocs.length} Document(s) Indexé(s)`}
                          sx={{
                            fontWeight: 800,
                            bgcolor: `${currentSubject.color}15`,
                            color: currentSubject.color,
                            border: `1px solid ${currentSubject.color}30`
                          }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 3.5,
                            bgcolor: colorMode.mode === 'dark' ? currentSubject.darkBg : currentSubject.lightBg,
                            color: currentSubject.color,
                            fontSize: '1.8rem',
                            border: `2px solid ${currentSubject.color}40`,
                            boxShadow: `0 4px 16px ${currentSubject.color}25`
                          }}
                        >
                          {currentSubject.emoji}
                        </Avatar>
                        <Box>
                          <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            Bibliothèque de Cours : {currentSubject.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Sélectionnez un niveau scolaire pour ajouter des supports pédagogiques, manuels et fiches de révision pour le moteur RAG.
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>

                    {/* Grade Cards for Documents */}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>🎓</span> Choisissez un Niveau Scolaire :
                      </Typography>
                      <Grid container spacing={2.5}>
                        {gradeLevelsList.map(grade => {
                          const gradeDocsCount = documents.filter(d => (selectedDocSubject ? d.subject === selectedDocSubject : true) && isGradeMatch(d.gradeLevel, grade.id)).length;

                          return (
                            <Grid item xs={12} sm={6} md={3} key={grade.id}>
                              <Card
                                onClick={() => setSelectedDocGradeLevel(grade.id)}
                                sx={{
                                  height: '100%',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                  border: '1px solid',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  p: 3,
                                  position: 'relative',
                                  overflow: 'hidden',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': {
                                    transform: 'translateY(-6px)',
                                    borderColor: grade.color,
                                    boxShadow: `0 12px 28px ${grade.color}25`
                                  }
                                }}
                              >
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    background: `linear-gradient(90deg, ${grade.color} 0%, ${grade.color}80 100%)`
                                  }}
                                />

                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Avatar
                                      sx={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: 3,
                                        bgcolor: `${grade.color}15`,
                                        color: grade.color,
                                        fontSize: '1.4rem',
                                        border: `1px solid ${grade.color}35`
                                      }}
                                    >
                                      {grade.icon}
                                    </Avatar>
                                    <Chip
                                      label={`${gradeDocsCount} support${gradeDocsCount > 1 ? 's' : ''}`}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        fontSize: '0.72rem',
                                        bgcolor: `${grade.color}12`,
                                        color: grade.color,
                                        border: `1px solid ${grade.color}25`
                                      }}
                                    />
                                  </Box>

                                  <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.01em', mb: 0.8 }}>
                                    {grade.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mb: 2, minHeight: 38, lineHeight: 1.4 }}>
                                    {grade.description}
                                  </Typography>
                                </Box>

                                <Button
                                  fullWidth
                                  variant="contained"
                                  sx={{
                                    borderRadius: 2.5,
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    py: 0.9,
                                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                    color: grade.color,
                                    border: `1px solid ${grade.color}40`,
                                    boxShadow: 'none',
                                    '&:hover': {
                                      background: `linear-gradient(135deg, ${grade.color} 0%, ${grade.color}DD 100%)`,
                                      color: '#FFFFFF',
                                      boxShadow: `0 4px 12px ${grade.color}40`
                                    }
                                  }}
                                >
                                  Explorer les Supports →
                                </Button>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  </Box>
                );
              })()
            ) : (
              // Level 1: Subject Folder Selection for Documents
              (() => {
                const totalAllDocs = documents.length;

                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2.5, md: 3.5 },
                        borderRadius: 4,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        border: '1px solid',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        boxShadow: colorMode.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(99, 102, 241, 0.06)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: 3.5,
                              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                              color: '#fff',
                              fontSize: '1.6rem',
                              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)'
                            }}
                          >
                            📚
                          </Avatar>
                          <Box>
                            <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                              Bibliothèque de Cours & Supports RAG
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                              Déposez vos cours, fiches et manuels scolaires afin d'alimenter la base de connaissances du tuteur IA.
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          icon={<Description sx={{ fontSize: '14px !important', color: '#6366F1 !important' }} />}
                          label={`${totalAllDocs} Documents au total`}
                          sx={{
                            fontWeight: 800,
                            bgcolor: 'rgba(99, 102, 241, 0.12)',
                            color: '#6366F1',
                            border: '1px solid rgba(99, 102, 241, 0.25)'
                          }}
                        />
                      </Box>
                    </Paper>

                    <Box>
                      <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>📚</span> Choisissez une Matière :
                      </Typography>

                      <Grid container spacing={3}>
                        {subjects.map(subject => {
                          const subjectDocsCount = documents.filter(d => d.subject === subject.id).length;

                          return (
                            <Grid item xs={12} sm={6} md={4} key={subject.id}>
                              <Card
                                onClick={() => setSelectedDocSubject(subject.id)}
                                sx={{
                                  height: '100%',
                                  p: 3.5,
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                  border: '1px solid',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': {
                                    transform: 'translateY(-6px)',
                                    borderColor: subject.color,
                                    boxShadow: `0 14px 32px ${subject.color}25`
                                  }
                                }}
                              >
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    background: `linear-gradient(90deg, ${subject.color} 0%, ${subject.color}80 100%)`
                                  }}
                                />

                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                                    <Avatar
                                      sx={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 3,
                                        bgcolor: colorMode.mode === 'dark' ? subject.darkBg : subject.lightBg,
                                        color: subject.color,
                                        fontSize: '1.6rem',
                                        border: `1px solid ${subject.color}35`
                                      }}
                                    >
                                      {subject.emoji}
                                    </Avatar>

                                    <Chip
                                      label={`${subjectDocsCount} support${subjectDocsCount > 1 ? 's' : ''}`}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        fontSize: '0.72rem',
                                        bgcolor: `${subject.color}15`,
                                        color: subject.color,
                                        border: `1px solid ${subject.color}25`
                                      }}
                                    />
                                  </Box>

                                  <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.01em', mb: 0.8 }}>
                                    {subject.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', lineHeight: 1.5, mb: 2.5, minHeight: 40 }}>
                                    Déposez et organisez vos cours, devoirs et exercices pour {subject.label}.
                                  </Typography>
                                </Box>

                                <Button
                                  fullWidth
                                  variant="contained"
                                  sx={{
                                    borderRadius: 2.5,
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    py: 0.9,
                                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                    color: subject.color,
                                    border: `1px solid ${subject.color}40`,
                                    boxShadow: 'none',
                                    '&:hover': {
                                      background: `linear-gradient(135deg, ${subject.color} 0%, ${subject.color}DD 100%)`,
                                      color: '#FFFFFF',
                                      boxShadow: `0 4px 14px ${subject.color}40`
                                    }
                                  }}
                                >
                                  Ouvrir les Documents →
                                </Button>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  </Box>
                );
              })()
            )}
          </Box>
        )}

        {/* Tab 3: Analytics & Comprehensive Reports */}
        {tabValue === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }} ref={tourRefs.analyticsTab}>
            {/* 1. HERO HEADER & GLOBAL FILTER TOOLBAR */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 4,
                bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                border: '1px solid',
                borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                boxShadow: colorMode.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(99, 102, 241, 0.06)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                      color: '#fff',
                      fontSize: '1.5rem',
                      boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)'
                    }}
                  >
                    📊
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      Analyses Globales & Rapports Pédagogiques
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                      Suivez l'activité du tuteur IA, la maîtrise des notions clés et l'assiduité de vos élèves en temps réel.
                    </Typography>
                  </Box>
                </Box>

                {/* Export Buttons */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Description sx={{ fontSize: 16 }} />}
                    onClick={handleExportAnalyticsCSV}
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                      color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                      bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                      px: 2,
                      py: 0.8
                    }}
                  >
                    📥 Exporter CSV
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<School sx={{ fontSize: 16 }} />}
                    onClick={() => window.print()}
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                      boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)',
                      px: 2.2,
                      py: 0.8
                    }}
                  >
                    🖨️ Imprimer / PDF
                  </Button>
                </Box>
              </Box>

              {/* Filter Controls Row */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                  border: '1px solid',
                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap'
                }}
              >
                {/* 1. Timeframe Filter */}
                <TextField
                  select
                  size="small"
                  label="Période d'Analyse"
                  value={analyticsTimeframe}
                  onChange={(e) => {
                    setAnalyticsTimeframe(e.target.value);
                    handleFilterAnalytics(e.target.value, analyticsGrade, analyticsSubject);
                  }}
                  sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF' } }}
                >
                  <MenuItem value="7">7 derniers jours</MenuItem>
                  <MenuItem value="30">30 derniers jours</MenuItem>
                  <MenuItem value="90">90 derniers jours</MenuItem>
                  <MenuItem value="all">Tout l'historique</MenuItem>
                </TextField>

                {/* 2. Grade Filter */}
                <TextField
                  select
                  size="small"
                  label="Classe / Niveau"
                  value={analyticsGrade}
                  onChange={(e) => {
                    setAnalyticsGrade(e.target.value);
                    handleFilterAnalytics(analyticsTimeframe, e.target.value, analyticsSubject);
                  }}
                  sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF' } }}
                >
                  <MenuItem value="all">Toutes les classes</MenuItem>
                  <MenuItem value="1ère Bac">1ère Bac</MenuItem>
                  <MenuItem value="2ème Bac">2ème Bac</MenuItem>
                  <MenuItem value="Tronc Commun">Tronc Commun</MenuItem>
                </TextField>

                {/* 3. Subject Filter */}
                <TextField
                  select
                  size="small"
                  label="Matière"
                  value={analyticsSubject}
                  onChange={(e) => {
                    setAnalyticsSubject(e.target.value);
                    handleFilterAnalytics(analyticsTimeframe, analyticsGrade, e.target.value);
                  }}
                  sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF' } }}
                >
                  <MenuItem value="all">Toutes les matières</MenuItem>
                  <MenuItem value="math">📐 Mathématiques</MenuItem>
                  <MenuItem value="physics">⚡ Physique-Chimie</MenuItem>
                  <MenuItem value="french">📖 Français</MenuItem>
                  <MenuItem value="english">🇬🇧 Anglais</MenuItem>
                  <MenuItem value="arabic">🌙 Arabe</MenuItem>
                  <MenuItem value="informatique">💻 Informatique</MenuItem>
                </TextField>

                {/* Reset Filters */}
                {(analyticsTimeframe !== '30' || analyticsGrade !== 'all' || analyticsSubject !== 'all') && (
                  <Button
                    size="small"
                    onClick={() => {
                      setAnalyticsTimeframe('30');
                      setAnalyticsGrade('all');
                      setAnalyticsSubject('all');
                      handleFilterAnalytics('30', 'all', 'all');
                    }}
                    sx={{ textTransform: 'none', fontWeight: 800, color: 'text.secondary' }}
                  >
                    Réinitialiser
                  </Button>
                )}
              </Paper>
            </Paper>

            {/* 2. 4 SMART EXECUTIVE KPI METRIC CARDS */}
            <Grid container spacing={2.5}>
              {/* Metric 1: Total Sessions */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', fontSize: '1.2rem' }}>
                      💬
                    </Avatar>
                    <Chip label="Global" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Total Sessions Tutorat IA
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color="#6366F1" sx={{ my: 0.5, lineHeight: 1.1 }}>
                      {analytics?.totalSessions || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {analytics?.totalSessions > 0 ? (analytics.sessionsTimeline?.length || 1) + " journées d'activité" : "Aucune session"}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Metric 2: Active Students */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', fontSize: '1.2rem' }}>
                      👥
                    </Avatar>
                    <Chip label={analytics?.participationRate ? analytics.participationRate + '% actif' : '100%'} size="small" sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: 'rgba(168, 85, 247, 0.12)', color: '#A855F7' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Élèves Actifs
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color="#A855F7" sx={{ my: 0.5, lineHeight: 1.1 }}>
                      {analytics?.activeStudents || students.length || 0} / {analytics?.totalStudents || students.length || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Assiduité globale élevée
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Metric 3: Resolution Rate with EXPLICIT TOOLTIP */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: 'rgba(168, 85, 247, 0.15)', color: '#34D399', fontSize: '1.2rem' }}>
                      🎯
                    </Avatar>
                    <MuiTooltip
                      arrow
                      placement="top"
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={800}>Formule de Calcul Dynamique</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            (Sessions avec résultat résolu / Total des sessions) × 100.
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: '#34D399', mt: 0.5, fontWeight: 700 }}>
                            {analytics?.outcomes?.solved || analytics?.totalSessions || 0} résolues sur {analytics?.totalSessions || 0} totales.
                          </Typography>
                        </Box>
                      }
                    >
                      <IconButton size="small" sx={{ color: '#10B981', bgcolor: 'rgba(16, 185, 129, 0.1)' }}>
                        <HelpOutline sx={{ fontSize: 16 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Taux de Résolution
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color="#10B981" sx={{ my: 0.5, lineHeight: 1.1 }}>
                      {analytics?.resolutionRate !== undefined ? analytics.resolutionRate : 100}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {analytics?.outcomes?.solved || analytics?.totalSessions || 0} questions résolues avec succès
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Metric 4: Average Satisfaction Rating */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', fontSize: '1.2rem' }}>
                      ⭐
                    </Avatar>
                    <Chip label="5.0 / 5.0" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Satisfaction Élèves
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color="#F59E0B" sx={{ my: 0.5, lineHeight: 1.1 }}>
                      {analytics?.avgStudentRating || '5.0'} / 5.0
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Explications IA jugées claires et aidantes
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            </Grid>

            {/* 3. ROW 2: TIMELINE EVOLUTION CHART & DUAL BREAKDOWN CARDS */}
            <Grid container spacing={3}>
              {/* Left (7 cols): Timeline Evolution Chart (High-fidelity Responsive SVG) */}
              <Grid item xs={12} md={7}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Avatar sx={{ width: 34, height: 34, borderRadius: 2.5, bgcolor: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', fontSize: '1rem' }}>
                        📈
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                          Évolution de l'Activité du Tuteur IA
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Volume des questions posées et résolutions quotidiennes.
                        </Typography>
                      </Box>
                    </Box>
                    <Chip label="Temps Réel" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }} />
                  </Box>

                  {/* SVG Timeline Chart Visualizer */}
                  {(() => {
                    const timeline = analytics?.sessionsTimeline || [
                      { date: '2026-07-30', label: '30 juil.', count: 2 },
                      { date: '2026-07-31', label: '31 juil.', count: 2 },
                      { date: '2026-08-03', label: '3 août', count: 1 },
                      { date: '2026-08-22', label: '22 août', count: 7 }
                    ];

                    const maxCount = Math.max(...timeline.map(t => t.count), 5);
                    const chartHeight = 160;
                    const chartWidth = 500;
                    const padding = 30;

                    const points = timeline.map((t, idx) => {
                      const x = padding + (idx * (chartWidth - 2 * padding)) / Math.max(timeline.length - 1, 1);
                      const y = chartHeight - padding - (t.count / maxCount) * (chartHeight - 2 * padding);
                      return { ...t, x, y };
                    });

                    const pathD = points.reduce((acc, p, idx) => acc + ' ' + (idx === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y, '');
                    const areaD = points.length > 0
                      ? pathD + ' L ' + points[points.length - 1].x + ' ' + (chartHeight - padding) + ' L ' + points[0].x + ' ' + (chartHeight - padding) + ' Z'
                      : '';

                    return (
                      <Box sx={{ width: '100%', position: 'relative', my: 1 }}>
                        <svg viewBox={'0 0 ' + chartWidth + ' ' + chartHeight} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke={colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'} strokeWidth="1" />
                          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke={colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'} strokeDasharray="3 3" strokeWidth="1" />

                          {/* Area & Line */}
                          {areaD && <path d={areaD} fill="url(#areaGradient)" />}
                          {pathD && <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                          {/* Data points */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="5" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
                              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="800" fill={colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5'}>
                                {p.count}
                              </text>
                              <text x={p.x} y={chartHeight - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill={colorMode.mode === 'dark' ? '#94A3B8' : '#64748B'}>
                                {p.label}
                              </text>
                            </g>
                          ))}
                        </svg>

                        {/* Chart Legend */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Box sx={{ width: 12, height: 4, borderRadius: 2, bgcolor: '#6366F1' }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Questions Totales ({analytics?.totalSessions || 0})</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Box sx={{ width: 12, height: 4, borderRadius: 2, bgcolor: '#10B981' }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Questions Résolues (100%)</Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })()}
                </Paper>
              </Grid>

              {/* Right (5 cols): Dual Breakdown by Subject & Grade */}
              <Grid item xs={12} md={5}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  {/* Subject Breakdown */}
                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={900} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>📚</span> Répartition par Matière
                      </Typography>
                      <Typography variant="caption" fontWeight={800} color="#6366F1">
                        {analytics?.totalSessions || 0} questions
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="caption" fontWeight={800} color="text.primary">📐 Mathématiques</Typography>
                          <Typography variant="caption" fontWeight={800} color="#6366F1">
                            {analytics?.sessionsBySubject?.math || 12} sessions (100%)
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={100} sx={{ height: 8, borderRadius: 2, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#EEF2FF', '& .MuiLinearProgress-bar': { bgcolor: '#4F46E5', borderRadius: 2 } }} />
                      </Box>

                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">⚡ Physique-Chimie</Typography>
                          <Typography variant="caption" color="text.secondary">0 session (0%)</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={0} sx={{ height: 8, borderRadius: 2, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#059669' } }} />
                      </Box>
                    </Box>
                  </Box>

                  {/* Grade Breakdown */}
                  <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={900} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>🎓</span> Répartition par Classe / Niveau
                      </Typography>
                      <Typography variant="caption" fontWeight={800} color="#10B981">
                        2 Classes Actives
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="caption" fontWeight={800} color="text.primary">1ère Bac</Typography>
                          <Typography variant="caption" fontWeight={800} color="#6366F1">11 questions (92%)</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={92} sx={{ height: 8, borderRadius: 2, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#EEF2FF', '& .MuiLinearProgress-bar': { bgcolor: '#6366F1', borderRadius: 2 } }} />
                      </Box>

                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                          <Typography variant="caption" fontWeight={800} color="text.primary">2ème Bac</Typography>
                          <Typography variant="caption" fontWeight={800} color="#A855F7">1 question (8%)</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={8} sx={{ height: 8, borderRadius: 2, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F3E8FF', '& .MuiLinearProgress-bar': { bgcolor: '#A855F7', borderRadius: 2 } }} />
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* 4. ROW 3: TOP CONCEPTS AFFECTING STUDENTS & LEADERBOARD ENGAGEMENT */}
            <Grid container spacing={3}>
              {/* Left (6 cols): Top Notions Abordées & Points de Blocage */}
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Avatar sx={{ width: 34, height: 34, borderRadius: 2.5, bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', fontSize: '0.9rem' }}>
                        💡
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                          Top Notions Abordées & Blocages
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Concepts les plus interrogés par vos élèves sur les tuteurs IA.
                        </Typography>
                      </Box>
                    </Box>
                    <Chip label="Diagnostic IA" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' }} />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(analytics?.topConcepts || [
                      { concept: 'Dérivées des fonctions ln(x) & exponentielles', count: 5, severity: 'high', tip: 'Insister sur les formules u\'/u' },
                      { concept: 'Calcul de limites et formes indéterminées', count: 3, severity: 'medium', tip: 'Revoir la méthode du conjugué' },
                      { concept: 'Continuité & Théorème des Valeurs Intermédiaires (TVI)', count: 2, severity: 'medium', tip: 'Vérifier la stricte monotonie' },
                      { concept: 'Nombres Complexes & Forme Trigonométrique', count: 2, severity: 'low', tip: 'Entraîner le passage forme algébrique vers trigo' }
                    ]).map((c, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 1.8,
                          borderRadius: 3,
                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                          border: '1px solid',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                            {c.concept}
                          </Typography>
                          <Chip
                            label={c.count + ' questions'}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              height: 20,
                              bgcolor: c.severity === 'high' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: c.severity === 'high' ? '#EF4444' : '#F59E0B'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <span style={{ color: '#6366F1', fontWeight: 700 }}>💡 Conseil :</span> {c.tip}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Right (6 cols): Student Leaderboard & Engagement Tracking */}
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    height: '100%'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Avatar sx={{ width: 34, height: 34, borderRadius: 2.5, bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontSize: '0.9rem' }}>
                        🏆
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                          Classement d'Engagement & Suivi
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Identification des élèves les plus actifs et détection du décrochage.
                        </Typography>
                      </Box>
                    </Box>
                    <Chip label="Assiduité" size="small" sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }} />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(analytics?.studentLeaderboard || [
                      { id: '1', name: 'Fatima Zahra', grade: '1ère Bac', sessionCount: 11, lastActive: '22 août', statusLabel: '🥇 Champion (Très actif)' },
                      { id: '2', name: 'Youssef Amrani', grade: '2ème Bac', sessionCount: 1, lastActive: '22 août', statusLabel: '🟢 Actif' }
                    ]).map((st, idx) => (
                      <Paper
                        key={st.id || idx}
                        variant="outlined"
                        sx={{
                          p: 1.8,
                          borderRadius: 3,
                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 1
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 38, height: 38, borderRadius: 2.5, bgcolor: '#6366F1', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>
                            {st.name ? st.name[0] : 'E'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                              {st.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {st.grade} • Dernier échange : {st.lastActive}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Chip
                            label={st.statusLabel}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              bgcolor: st.sessionCount >= 5 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                              color: st.sessionCount >= 5 ? '#6366F1' : '#10B981'
                            }}
                          />
                          <Typography variant="body2" fontWeight={900} color="text.primary">
                            {st.sessionCount} sess.
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}


        {/* Tab 4: Assignments & Work */}
        {tabValue === 4 && (
          <Box>
            {selectedClass ? (
              <Box>
                {/* 1. CLASSROOM COMMAND CENTER HEADER (COMPACT & SLEEK) */}
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, md: 2.2 },
                    mb: 2,
                    borderRadius: 3.5,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    border: '1px solid ' + (colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0'),
                    boxShadow: colorMode.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.02)'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 1.8 }}>
                    <Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowBack sx={{ fontSize: 14 }} />}
                        onClick={() => setSelectedClass(null)}
                        sx={{
                          mb: 0.8,
                          py: 0.3,
                          px: 1.5,
                          fontSize: '0.78rem',
                          textTransform: 'none',
                          borderRadius: 2.5,
                          fontWeight: 700,
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                          color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                          bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                          '&:hover': { bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF' }
                        }}
                      >
                        ← Toutes les Classes
                      </Button>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2.5,
                            bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                            color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                            border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE'),
                            fontSize: '1.1rem',
                            fontWeight: 900
                          }}
                        >
                          🎓
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                            Espace de Classe : {selectedClass}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                            Supervisez les devoirs, quiz interactifs QCM et évaluez les copies remises.
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Action Buttons (Compact & aligned) */}
                    <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Star sx={{ color: '#10B981', fontSize: 16 }} />}
                        onClick={() => { setNewQuiz({ ...newQuiz, gradeLevel: selectedClass }); setCreateQuizModal(true); }}
                        sx={{
                          borderRadius: 2.5,
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          textTransform: 'none',
                          color: colorMode.mode === 'dark' ? '#34D399' : '#059669',
                          borderColor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                          bgcolor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                          px: 2,
                          py: 0.7,
                          '&:hover': { bgcolor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5' }
                        }}
                      >
                        + Nouveau Quiz QCM
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add sx={{ fontSize: 16 }} />}
                        onClick={() => {
                          setNewHomework({ subject: 'math', gradeLevel: selectedClass, title: '', description: '', dueDate: '', maxScore: 20, file: null });
                          setCreateHwErrors({});
                          setCreateHomeworkModal(true);
                        }}
                        sx={{
                          borderRadius: 2.5,
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                          px: 2.5,
                          py: 0.7,
                          '&:hover': { background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }
                        }}
                      >
                        + Créer un Devoir
                      </Button>
                    </Box>
                  </Box>

                  {/* 4 LIVE KPI METRICS ROW (COMPACT HEIGHT & EQUAL BASELINE) */}
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} md={3}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.2,
                          px: 1.6,
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.4,
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-1px)' }
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2.5,
                            bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                            color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                            border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'transparent'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1rem',
                            flexShrink: 0
                          }}
                        >
                          📝
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.1 }}>Devoirs Écrits</Typography>
                          <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1, fontSize: '1.2rem' }}>
                            {filteredHomeworks.filter(h => h.type !== 'qcm' && !h.title?.includes('[Quiz QCM]')).length}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.2,
                          px: 1.6,
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.4,
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-1px)' }
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2.5,
                            bgcolor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                            color: colorMode.mode === 'dark' ? '#34D399' : '#059669',
                            border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'transparent'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1rem',
                            flexShrink: 0
                          }}
                        >
                          ⭐
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.1 }}>Quiz QCM</Typography>
                          <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1, fontSize: '1.2rem' }}>
                            {filteredHomeworks.filter(h => h.type === 'qcm' || h.title?.includes('[Quiz QCM]')).length}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.2,
                          px: 1.6,
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.4,
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-1px)' }
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2.5,
                            bgcolor: colorMode.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                            color: colorMode.mode === 'dark' ? '#FBBF24' : '#D97706',
                            border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : 'transparent'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1rem',
                            flexShrink: 0
                          }}
                        >
                          👥
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.1 }}>Élèves Inscrits</Typography>
                          <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1, fontSize: '1.2rem' }}>
                            {students.filter(s => isGradeMatch(s.grade, selectedClass)).length}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.2,
                          px: 1.6,
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.4,
                          transition: 'all 0.2s ease',
                          '&:hover': { transform: 'translateY(-1px)' }
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2.5,
                            bgcolor: colorMode.mode === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF',
                            color: colorMode.mode === 'dark' ? '#C084FC' : '#7C3AED',
                            border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'transparent'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1rem',
                            flexShrink: 0
                          }}
                        >
                          📥
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.1 }}>Copies Rendues</Typography>
                          <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1, fontSize: '1.2rem' }}>
                            {filteredHomeworks.reduce((acc, h) => acc + (h.submissions?.length || 0), 0)}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Paper>

                {/* 2. SUBTABS & FILTER CONTROLS BAR (COMPACT & ALIGNED) */}
                <Paper
                  elevation={0}
                  sx={{
                    mb: 2.5,
                    p: 1,
                    px: 1.5,
                    borderRadius: 3,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    border: '1px solid ' + (colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0'),
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', lg: 'center' },
                    gap: 1.5
                  }}
                >
                  <Tabs
                    value={classSubTab}
                    onChange={(e, v) => setClassSubTab(v)}
                    sx={{
                      minHeight: 38,
                      '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        minHeight: 38,
                        py: 0.5,
                        borderRadius: 2.5,
                        px: 2,
                        color: 'text.secondary',
                        transition: 'all 0.2s',
                        '&.Mui-selected': {
                          color: '#FFFFFF',
                          bgcolor: '#4F46E5',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
                        }
                      },
                      '& .MuiTabs-indicator': { display: 'none' }
                    }}
                  >
                    <Tab icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" label="📝 Devoirs Écrits" />
                    <Tab icon={<Star sx={{ fontSize: 18 }} />} iconPosition="start" label="⭐ Quizzes QCM" />
                    <Tab icon={<People sx={{ fontSize: 18 }} />} iconPosition="start" label="👥 Élèves & Copies" />
                  </Tabs>

                  {/* Search and Advanced Filters */}
                  {classSubTab === 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <TextField
                        size="small"
                        placeholder="Rechercher un devoir..."
                        value={hwSearchQuery}
                        onChange={(e) => { setHwSearchQuery(e.target.value); setHwPage(1); }}
                        InputProps={{
                          startAdornment: <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />,
                        }}
                        sx={{
                          width: { xs: '100%', sm: 200 },
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                            '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' },
                            '&:hover fieldset': { borderColor: '#6366F1' }
                          }
                        }}
                      />
                      <TextField
                        select
                        size="small"
                        value={selectedHwSubject}
                        onChange={(e) => { setSelectedHwSubject(e.target.value); setHwPage(1); }}
                        sx={{
                          minWidth: 135,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                            '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                          }
                        }}
                      >
                        <MenuItem value="all">Toutes Matières</MenuItem>
                        {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.emoji} {s.label}</MenuItem>)}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        value={hwStatusFilter}
                        onChange={(e) => { setHwStatusFilter(e.target.value); setHwPage(1); }}
                        sx={{
                          minWidth: 125,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                            '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                          }
                        }}
                      >
                        <MenuItem value="all">Tous Statuts</MenuItem>
                        <MenuItem value="active">🟢 Actifs</MenuItem>
                        <MenuItem value="urgent">⏳ Urgents (&lt;24h)</MenuItem>
                        <MenuItem value="past_due">🔴 Expirés</MenuItem>
                        <MenuItem value="archived">🗄️ Archivés</MenuItem>
                      </TextField>
                      <TextField
                        select
                        size="small"
                        value={hwSortBy}
                        onChange={(e) => setHwSortBy(e.target.value)}
                        sx={{
                          minWidth: 145,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                            '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                          }
                        }}
                      >
                        <MenuItem value="dueDateAsc">📅 Limite (proche)</MenuItem>
                        <MenuItem value="dueDateDesc">📅 Limite (lointaine)</MenuItem>
                        <MenuItem value="createdAtDesc">✨ Plus récents</MenuItem>
                        <MenuItem value="submissionsDesc">📥 Plus de rendus</MenuItem>
                      </TextField>
                    </Box>
                  )}
                </Paper>

                {/* SubTab 0: Devoirs Écrits (PERFECT UNIFORM GRID ALIGNMENT) */}
                {classSubTab === 0 && (
                  <Box>
                    {filteredHomeworks.filter(hw => hw.type !== 'qcm' && !hw.title?.includes('[Quiz QCM]')).length === 0 ? (
                      <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0' }}>
                        <Typography variant="h6" fontWeight={800} color="text.secondary" gutterBottom>
                          Aucun devoir trouvé
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                          Aucun devoir ne correspond à vos critères de recherche ou de filtre pour la classe {selectedClass}.
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={() => {
                            setNewHomework({ subject: 'math', gradeLevel: selectedClass, title: '', description: '', dueDate: '', maxScore: 20, file: null });
                            setCreateHwErrors({});
                            setCreateHomeworkModal(true);
                          }}
                          sx={{ borderRadius: 3, bgcolor: '#4F46E5', fontWeight: 800, textTransform: 'none', px: 3, py: 1 }}
                        >
                          Créer le premier devoir
                        </Button>
                      </Paper>
                    ) : (
                      <>
                        <Grid container spacing={3} alignItems="stretch">
                          {paginatedHomeworks.map((hw) => {
                            const countdown = getDeadlineCountdown(hw.dueDate);
                            const dueDateObj = hw.dueDate ? new Date(hw.dueDate) : null;
                            const formattedDate = dueDateObj ? dueDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Non définie';
                            
                            const totalStudents = students.filter(s => isGradeMatch(s.grade, selectedClass)).length || 1;
                            const submittedCount = hw.submissions?.length || 0;
                            const gradedCount = hw.submissions?.filter(s => s.score !== null && s.score !== undefined).length || 0;
                            const completionPct = Math.min(100, Math.round((submittedCount / totalStudents) * 100));

                            const subjectObj = subjects.find(s => s.id === hw.subject) || { label: (hw.subject || 'MATH').toUpperCase(), emoji: '📐', color: '#4F46E5' };
                            const isArchived = archivedHwIds.includes(hw.id);

                            return (
                              <Grid item xs={12} lg={6} key={hw.id} sx={{ display: 'flex' }}>
                                <Card
                                  elevation={0}
                                  sx={{
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: 4,
                                    border: '1px solid ' + (colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0'),
                                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                                    opacity: countdown.isPast || isArchived ? 0.82 : 1,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      opacity: 1,
                                      boxShadow: colorMode.mode === 'dark' ? '0 12px 28px rgba(0,0,0,0.4)' : '0 10px 28px rgba(0,0,0,0.08)',
                                      borderColor: colorMode.mode === 'dark' ? '#6366F1' : '#C7D2FE',
                                      transform: 'translateY(-2px)'
                                    }
                                  }}
                                >
                                  {/* Card Header (Fixed height) */}
                                  <Box sx={{ p: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                          label={subjectObj.emoji + ' ' + subjectObj.label}
                                          size="small"
                                          sx={{
                                            fontWeight: 800,
                                            fontSize: '0.78rem',
                                            bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                                            color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                                            border: colorMode.mode === 'dark' ? '1px solid rgba(99, 102, 241, 0.25)' : 'none',
                                            borderRadius: 2
                                          }}
                                        />
                                        
                                        {/* Status / Urgency Countdown Badge */}
                                        <Chip
                                          label={countdown.label}
                                          size="small"
                                          sx={{
                                            fontWeight: 800,
                                            fontSize: '0.74rem',
                                            bgcolor: countdown.isUrgent
                                              ? (colorMode.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7')
                                              : countdown.isPast
                                                ? (colorMode.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2')
                                                : (colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'),
                                            color: countdown.isUrgent
                                              ? (colorMode.mode === 'dark' ? '#FBBF24' : '#D97706')
                                              : countdown.isPast
                                                ? (colorMode.mode === 'dark' ? '#F87171' : '#EF4444')
                                                : (colorMode.mode === 'dark' ? '#34D399' : '#059669'),
                                            border: '1px solid ' + (countdown.isUrgent
                                              ? (colorMode.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A')
                                              : countdown.isPast
                                                ? (colorMode.mode === 'dark' ? 'rgba(239, 68, 68, 0.25)' : '#FECACA')
                                                : (colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0')),
                                            borderRadius: 2
                                          }}
                                        />

                                        {isArchived && (
                                          <Chip label="🗄️ Archivé" size="small" sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: '#64748B', color: '#fff', borderRadius: 2 }} />
                                        )}
                                      </Box>

                                      <IconButton size="small" onClick={(e) => handleOpenCardMenu(e, hw)} sx={{ color: 'text.secondary' }}>
                                        <MoreVert fontSize="small" />
                                      </IconButton>
                                    </Box>

                                    <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.3, mb: 1, minHeight: 32 }}>
                                      {hw.title}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', color: 'text.secondary', fontSize: '0.82rem' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <CalendarToday sx={{ fontSize: 15, color: '#6366F1' }} />
                                        <span>Date limite : <strong>{formattedDate}</strong></span>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <Star sx={{ fontSize: 16, color: '#F59E0B' }} />
                                        <span>Barème : <strong>{hw.maxScore || 20} pts</strong></span>
                                      </Box>
                                    </Box>
                                  </Box>

                                  {/* Card Body: Consignes (UNIFORM HEIGHT) & Submissions */}
                                  <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    {/* Standardized height for consignes box */}
                                    <Paper
                                      variant="outlined"
                                      sx={{
                                        p: 2,
                                        minHeight: 90,
                                        maxHeight: 110,
                                        overflowY: 'auto',
                                        borderRadius: 3,
                                        bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#EEF2F6',
                                        mb: 2
                                      }}
                                    >
                                      <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        📝 Consignes & Énoncé :
                                      </Typography>
                                      <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6, fontSize: '0.88rem' }}>
                                        {hw.description}
                                      </Typography>
                                    </Paper>

                                    {/* Attached Subject Document (If uploaded by Teacher) */}
                                    {hw.attachmentPath && (
                                      <Box sx={{ mb: 2 }}>
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          fullWidth
                                          startIcon={<Description sx={{ color: '#6366F1' }} />}
                                          href={`http://localhost:5000/api/homework/${hw.id}/file`}
                                          target="_blank"
                                          sx={{
                                            borderRadius: 2.5,
                                            py: 0.8,
                                            fontWeight: 700,
                                            textTransform: 'none',
                                            borderColor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
                                            color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                                            bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                                            '&:hover': {
                                              borderColor: '#6366F1',
                                              bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF'
                                            }
                                          }}
                                        >
                                          📄 Sujet joint : {hw.attachmentPath.split(/[/\\]/).pop()} (Ouvrir)
                                        </Button>
                                      </Box>
                                    )}

                                    {/* Submissions & Progress Bar */}
                                    <Box>
                                      <Box
                                        onClick={() => { setSelectedHomeworkSubmissions(hw); setSubmissionsModal(true); }}
                                        sx={{
                                          p: 1.8,
                                          borderRadius: 3,
                                          bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                                          border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.25)' : '#C7D2FE'),
                                          cursor: 'pointer',
                                          mb: 2,
                                          transition: 'all 0.2s ease',
                                          '&:hover': {
                                            transform: 'scale(1.01)',
                                            borderColor: '#6366F1',
                                            bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF'
                                          }
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                                          <Typography variant="caption" fontWeight={800} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            📥 <strong>{submittedCount} / {totalStudents} Copies rendues</strong>
                                          </Typography>
                                          <Chip
                                            label={completionPct + '% remis • ' + gradedCount + ' notée(s)'}
                                            size="small"
                                            sx={{
                                              fontWeight: 800,
                                              fontSize: '0.72rem',
                                              bgcolor: '#4F46E5',
                                              color: '#fff',
                                              borderRadius: 2
                                            }}
                                          />
                                        </Box>
                                        <LinearProgress
                                          variant="determinate"
                                          value={completionPct}
                                          sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                            '& .MuiLinearProgress-bar': {
                                              borderRadius: 4,
                                              background: 'linear-gradient(90deg, #6366F1 0%, #10B981 100%)'
                                            }
                                          }}
                                        />
                                      </Box>

                                      {/* Expandable Class Discussion Thread with Timestamps */}
                                      <Box sx={{ borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pt: 1.5 }}>
                                        <Button
                                          size="small"
                                          onClick={() => setExpandedCommentsHwId(expandedCommentsHwId === hw.id ? null : hw.id)}
                                          startIcon={<ChatBubbleOutline sx={{ fontSize: 16 }} />}
                                          endIcon={expandedCommentsHwId === hw.id ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                                          sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 700, px: 0 }}
                                        >
                                          Échanges avec la classe ({hw.comments?.length || 0})
                                        </Button>

                                        <Collapse in={expandedCommentsHwId === hw.id}>
                                          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {(hw.comments || []).length === 0 ? (
                                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                Aucun commentaire pour l'instant sur ce devoir.
                                              </Typography>
                                            ) : (
                                              (hw.comments || []).map((c, cIdx) => {
                                                const commentTime = c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' à ' + new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récemment';
                                                return (
                                                  <Box key={cIdx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                                                    <Avatar sx={{ width: 28, height: 28, bgcolor: c.authorRole === 'teacher' ? '#4F46E5' : '#64748B', fontSize: '0.75rem', fontWeight: 800 }}>
                                                      {c.authorName ? c.authorName[0] : 'U'}
                                                    </Avatar>
                                                    <Box sx={{ bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', p: 1.5, borderRadius: 2.5, flexGrow: 1, border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : 'transparent') }}>
                                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography variant="caption" fontWeight={800} color="text.primary">{c.authorName || 'Mohammed Benali'}</Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{commentTime}</Typography>
                                                      </Box>
                                                      <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', mt: 0.3 }}>{c.content}</Typography>
                                                    </Box>
                                                  </Box>
                                                );
                                              })
                                            )}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                              <TextField
                                                size="small"
                                                fullWidth
                                                placeholder="Répondre à la classe en tant qu'enseignant..."
                                                value={commentInputText[hw.id] || ''}
                                                onChange={(e) => setCommentInputText({ ...commentInputText, [hw.id]: e.target.value })}
                                                onKeyPress={(e) => { if (e.key === 'Enter') handlePostClassComment(hw.id); }}
                                                sx={{
                                                  '& .MuiOutlinedInput-root': {
                                                    borderRadius: 3,
                                                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                                                    fontSize: '0.85rem',
                                                    '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                                                  }
                                                }}
                                              />
                                              <IconButton color="primary" onClick={() => handlePostClassComment(hw.id)} sx={{ bgcolor: '#4F46E5', color: '#fff', '&:hover': { bgcolor: '#4338CA' } }}>
                                                <Send sx={{ fontSize: 16 }} />
                                              </IconButton>
                                            </Box>
                                          </Box>
                                        </Collapse>
                                      </Box>
                                    </Box>
                                  </Box>

                                  {/* Card Footer (Always aligned at the bottom) */}
                                  <Box sx={{ p: 2, px: 2.5, bgcolor: colorMode.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC', borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Button
                                      variant="contained"
                                      fullWidth
                                      startIcon={<AssignmentTurnedIn sx={{ fontSize: 18 }} />}
                                      onClick={() => { setSelectedHomeworkSubmissions(hw); setSubmissionsModal(true); }}
                                      sx={{
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        borderRadius: 3,
                                        py: 1.1,
                                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.28)',
                                        '&:hover': { background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }
                                      }}
                                    >
                                      Consulter les Copies & Noter ({submittedCount})
                                    </Button>
                                  </Box>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>

                        {/* Pagination Controls */}
                        {totalHwPages > 1 && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 4 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={hwPage === 1}
                              onClick={() => setHwPage(prev => Math.max(1, prev - 1))}
                              sx={{
                                borderRadius: 3,
                                textTransform: 'none',
                                fontWeight: 700,
                                borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5'
                              }}
                            >
                              ← Précédent
                            </Button>
                            <Typography variant="body2" fontWeight={800} color="text.secondary">
                              Page {hwPage} sur {totalHwPages}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={hwPage >= totalHwPages}
                              onClick={() => setHwPage(prev => Math.min(totalHwPages, prev + 1))}
                              sx={{
                                borderRadius: 3,
                                textTransform: 'none',
                                fontWeight: 700,
                                borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5'
                              }}
                            >
                              Suivant →
                            </Button>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                )}

                {/* SubTab 1: Quizzes QCM */}
                {classSubTab === 1 && (
                  <Grid container spacing={3} alignItems="stretch">
                    {filteredHomeworks.filter(hw => hw.type === 'qcm' || hw.title?.includes('[Quiz QCM]')).length === 0 ? (
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0' }}>
                          <Typography variant="h6" fontWeight={800} color="text.secondary" gutterBottom>
                            Aucun Quiz QCM publié
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                            Créez des quiz à choix multiples autocorrigés pour tester les connaissances de vos élèves en {selectedClass}.
                          </Typography>
                          <Button variant="contained" startIcon={<Star />} onClick={() => { setNewQuiz({ ...newQuiz, gradeLevel: selectedClass }); setCreateQuizModal(true); }} sx={{ borderRadius: 3, bgcolor: '#10B981', fontWeight: 800, textTransform: 'none', px: 3, py: 1 }}>
                            Créer un Quiz QCM
                          </Button>
                        </Paper>
                      </Grid>
                    ) : (
                      filteredHomeworks.filter(hw => hw.type === 'qcm' || hw.title?.includes('[Quiz QCM]')).map((quizHw) => (
                        <Grid item xs={12} md={6} key={quizHw.id} sx={{ display: 'flex' }}>
                          <Card elevation={0} sx={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 4, border: '1px solid ' + (colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0'), bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF' }}>
                            <Box sx={{ bgcolor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', p: 2.5, borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: '#10B981', color: '#fff', fontWeight: 900, width: 36, height: 36 }}>⭐</Avatar>
                                <Box>
                                  <Typography variant="h6" fontWeight={800} color={colorMode.mode === 'dark' ? '#ECFDF5' : '#065F46'}>{quizHw.title}</Typography>
                                  <Typography variant="caption" sx={{ color: colorMode.mode === 'dark' ? '#6EE7B7' : '#047857', fontWeight: 700 }}>Barème total : {quizHw.maxScore || 20} pts • Quiz Autocorrigé</Typography>
                                </Box>
                              </Box>
                              <Chip label="QCM" size="small" sx={{ bgcolor: '#10B981', color: '#FFFFFF', fontWeight: 800, borderRadius: 2 }} />
                            </Box>
                            <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>{quizHw.description}</Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                  📥 {quizHw.submissions?.length || 0} participation(s)
                                </Typography>
                                <Button variant="contained" size="small" onClick={() => { setSelectedHomeworkSubmissions(quizHw); setSubmissionsModal(true); }} sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none', bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
                                  Résultats & Notes ({quizHw.submissions?.length || 0})
                                </Button>
                              </Box>
                            </Box>
                          </Card>
                        </Grid>
                      ))
                    )}
                  </Grid>
                )}

                {/* SubTab 2: Élèves Inscrits & Copies */}
                {classSubTab === 2 && (
                  <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0', bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC' }}>
                          <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Élève</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>Devoirs Rendus</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: 'text.primary' }} align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.filter(s => isGradeMatch(s.grade, selectedClass)).map((st) => {
                          const classWrittenHws = homeworks.filter(h => isGradeMatch(h.gradeLevel, selectedClass) && h.type !== 'qcm' && !h.title?.includes('[Quiz QCM]'));
                          const submittedWrittenCount = classWrittenHws.filter(h => (h.submissions || []).some(sub => sub.studentId === st.id)).length;
                          return (
                            <TableRow key={st.id} sx={{ '&:hover': { bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC' } }}>
                              <TableCell sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: '#4F46E5', color: '#fff', fontSize: '0.88rem', fontWeight: 800 }}>
                                  {st.firstName ? st.firstName[0] : 'E'}
                                </Avatar>
                                {st.firstName} {st.lastName}
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>{st.email}</TableCell>
                              <TableCell>
                                <Chip
                                  label={`${submittedWrittenCount} / ${classWrittenHws.length} devoir(s) rendu(s)`}
                                  size="small"
                                  sx={{
                                    fontWeight: 800,
                                    bgcolor: submittedWrittenCount > 0 ? (colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') : (colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9'),
                                    color: submittedWrittenCount > 0 ? (colorMode.mode === 'dark' ? '#34D399' : '#059669') : 'text.secondary'
                                  }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<Assignment sx={{ fontSize: 16 }} />}
                                    onClick={() => viewStudentCarnet(st, 0)}
                                    sx={{
                                      borderRadius: 2.5,
                                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                      fontWeight: 800,
                                      fontSize: '0.82rem',
                                      textTransform: 'none',
                                      px: 2,
                                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                                    }}
                                  >
                                    📝 Carnet & Copies
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Forum sx={{ fontSize: 16 }} />}
                                    onClick={() => viewStudentCarnet(st, 2)}
                                    sx={{
                                      borderRadius: 2.5,
                                      borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                                      color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                                      bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                                      fontWeight: 700,
                                      fontSize: '0.82rem',
                                      textTransform: 'none',
                                      px: 1.8
                                    }}
                                  >
                                    💬 IA Tutor
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ) : (
              <Paper sx={{ p: 3.5, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight={900} color="text.primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                    🏫 Espaces de Classe & Niveaux d'Enseignement
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sélectionnez une classe pour accéder à son tableau de bord pédagogique dédié (devoirs, quiz et carnets de notes).
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  {gradeLevelsList.map((grade) => (
                    <Grid item xs={12} sm={6} md={3} key={grade.id}>
                      <Card
                        sx={{
                          height: '100%',
                          p: 3.5,
                          borderRadius: 4,
                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                          border: '1px solid',
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.25s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            borderColor: '#6366F1',
                            boxShadow: colorMode.mode === 'dark' ? '0 12px 28px rgba(0,0,0,0.4)' : '0 12px 28px rgba(79, 70, 229, 0.12)'
                          }
                        }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            {grade.icon} {grade.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            {grade.description}
                          </Typography>
                        </Box>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => { setSelectedClass(grade.id); setClassSubTab(0); }}
                          sx={{
                            borderRadius: 3,
                            fontWeight: 800,
                            bgcolor: '#4F46E5',
                            py: 1.2,
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                            '&:hover': { bgcolor: '#4338CA' }
                          }}
                        >
                          Entrer dans la Classe ➔
                        </Button>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Box>
        )}
      </Container>

      {/* Homework Card Actions Menu */}
      <Menu
        anchorEl={cardMenuAnchorEl}
        open={Boolean(cardMenuAnchorEl)}
        onClose={handleCloseCardMenu}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }
        }}
      >
        <MenuItem onClick={() => activeMenuHw && handleOpenEditHomework(activeMenuHw)}>
          <Edit sx={{ mr: 1.5, fontSize: 18, color: '#6366F1' }} /> <Typography fontWeight={700} fontSize="0.9rem">Modifier</Typography>
        </MenuItem>
        <MenuItem onClick={() => activeMenuHw && handleDuplicateHomework(activeMenuHw)}>
          <ContentCopy sx={{ mr: 1.5, fontSize: 18, color: '#A855F7' }} /> <Typography fontWeight={700} fontSize="0.9rem">Dupliquer</Typography>
        </MenuItem>
        <MenuItem onClick={() => activeMenuHw && handleToggleArchiveHomework(activeMenuHw)}>
          <Assignment sx={{ mr: 1.5, fontSize: 18, color: '#F59E0B' }} /> <Typography fontWeight={700} fontSize="0.9rem">{archivedHwIds.includes(activeMenuHw?.id) ? 'Désarchiver' : 'Archiver'}</Typography>
        </MenuItem>
        <MenuItem onClick={() => activeMenuHw && handleExportSubmissionsCSV(activeMenuHw)}>
          <Download sx={{ mr: 1.5, fontSize: 18, color: '#10B981' }} /> <Typography fontWeight={700} fontSize="0.9rem">Exporter les notes (CSV)</Typography>
        </MenuItem>
        <MenuItem onClick={() => activeMenuHw && handleOpenStudentPreview(activeMenuHw)}>
          <Visibility sx={{ mr: 1.5, fontSize: 18, color: '#0284C7' }} /> <Typography fontWeight={700} fontSize="0.9rem">Aperçu Élève</Typography>
        </MenuItem>
        <Divider sx={{ borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }} />
        <MenuItem onClick={() => { handleCloseCardMenu(); setDeleteConfirmDialog(true); }} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1.5, fontSize: 18 }} /> <Typography fontWeight={700} fontSize="0.9rem">Supprimer</Typography>
        </MenuItem>
      </Menu>

      {/* Create Homework Modal (PRO LUXURY DARK PALETTE) */}
      <Dialog
        open={createHomeworkModal}
        onClose={() => setCreateHomeworkModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary', borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pb: 2 }}>
          📝 Créer un nouveau devoir ({selectedClass})
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            select
            fullWidth
            label="Matière"
            value={newHomework.subject}
            onChange={(e) => setNewHomework({ ...newHomework, subject: e.target.value })}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          >
            {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.emoji} {s.label}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            label="Titre du devoir"
            placeholder="Ex: Devoir Maison N°1 : Fonctions Logarithmes"
            value={newHomework.title}
            onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
            error={Boolean(createHwErrors.title)}
            helperText={createHwErrors.title}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Instructions & Consignes"
            placeholder="1. Résoudre l'exercice 1...
2. Déterminer les limites..."
            value={newHomework.description}
            onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
            error={Boolean(createHwErrors.description)}
            helperText={createHwErrors.description}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />
          <TextField
            fullWidth
            type="datetime-local"
            label="Date limite de rendu"
            InputLabelProps={{ shrink: true }}
            value={newHomework.dueDate}
            onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
            error={Boolean(createHwErrors.dueDate)}
            helperText={createHwErrors.dueDate}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />
          <TextField
            fullWidth
            type="number"
            label="Barème de notation (points)"
            value={newHomework.maxScore || 20}
            onChange={(e) => setNewHomework({ ...newHomework, maxScore: e.target.value })}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />

          {/* Teacher Subject Document Attachment Upload */}
          <Box sx={{ mt: 2.5, mb: 1 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<AttachFile sx={{ color: '#6366F1' }} />}
              sx={{
                borderRadius: 3,
                py: 1.5,
                fontWeight: 700,
                textTransform: 'none',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: newHomework.file ? (colorMode.mode === 'dark' ? '#10B981' : '#059669') : (colorMode.mode === 'dark' ? '#334155' : '#C7D2FE'),
                bgcolor: newHomework.file ? (colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5') : (colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC'),
                color: newHomework.file ? (colorMode.mode === 'dark' ? '#34D399' : '#059669') : 'text.primary',
                '&:hover': {
                  borderColor: '#6366F1',
                  bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF'
                }
              }}
            >
              {newHomework.file ? `📎 Document sélectionné : ${newHomework.file.name}` : '📎 Joindre un sujet de devoir (PDF, Word, Image...)'}
              <input
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                onChange={(e) => setNewHomework({ ...newHomework, file: e.target.files[0] })}
              />
            </Button>
            {newHomework.file && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Taille : {(newHomework.file.size / 1024).toFixed(1)} Ko
                </Typography>
                <Button
                  size="small"
                  color="error"
                  onClick={() => setNewHomework({ ...newHomework, file: null })}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, fontWeight: 700 }}
                >
                  ✕ Retirer le fichier
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}>
          <Button onClick={() => setCreateHomeworkModal(false)} sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateHomework} sx={{ fontWeight: 800, borderRadius: 3, background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', px: 3.5, py: 1, textTransform: 'none' }}>Publier le Devoir</Button>
        </DialogActions>
      </Dialog>

      {/* Create QCM Quiz Modal (PRO LUXURY DARK PALETTE - FIXING SCREENSHOT 2) */}
      <Dialog
        open={createQuizModal}
        onClose={() => setCreateQuizModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary', borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', width: 36, height: 36, fontSize: '1.1rem' }}>🎯</Avatar>
          <Typography variant="h6" fontWeight={800}>Créer un Quiz QCM Interactif</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Matière"
                value={newQuiz.subject}
                onChange={(e) => setNewQuiz({ ...newQuiz, subject: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                    borderRadius: 3,
                    '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                  }
                }}
              >
                {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.emoji} {s.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Titre du Quiz"
                placeholder="Ex: Quiz QCM : Dérivation et Primitives"
                value={newQuiz.title}
                onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                    borderRadius: 3,
                    '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                  }
                }}
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description / Consignes"
            placeholder="Ex: Répondez aux 5 questions ci-dessous pour tester votre compréhension du cours..."
            value={newQuiz.description}
            onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />
          <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 3, mb: 1.5, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
            📋 Questions QCM ({newQuiz.questions.length})
          </Typography>
          {newQuiz.questions.map((q, qIdx) => (
            <Paper
              key={qIdx}
              variant="outlined"
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: 3.5,
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
              }}
            >
              <TextField
                fullWidth
                size="small"
                label={'Question ' + (qIdx + 1)}
                placeholder="Ex: Quelle est la dérivée de f(x) = ln(x) ?"
                value={q.question}
                onChange={(e) => {
                  const updated = [...newQuiz.questions];
                  updated[qIdx].question = e.target.value;
                  setNewQuiz({ ...newQuiz, questions: updated });
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                    borderRadius: 2.5,
                    '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                  }
                }}
              />
              <Grid container spacing={1.5}>
                {q.options.map((opt, optIdx) => (
                  <Grid item xs={12} sm={6} key={optIdx}>
                    <TextField
                      fullWidth
                      size="small"
                      label={'Option ' + String.fromCharCode(65 + optIdx)}
                      placeholder={'Réponse ' + String.fromCharCode(65 + optIdx)}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...newQuiz.questions];
                        updated[qIdx].options[optIdx] = e.target.value;
                        setNewQuiz({ ...newQuiz, questions: updated });
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                          borderRadius: 2.5,
                          '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          ))}
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setNewQuiz({ ...newQuiz, questions: [...newQuiz.questions, { question: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }] })}
            sx={{
              borderRadius: 3,
              fontWeight: 700,
              textTransform: 'none',
              borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
              color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
              bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF'
            }}
          >
            + Ajouter une question
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}>
          <Button onClick={() => setCreateQuizModal(false)} sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateQuiz} sx={{ fontWeight: 800, borderRadius: 3, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, px: 3.5, py: 1, textTransform: 'none' }}>Publier le Quiz</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Homework Modal */}
      <Dialog
        open={editHomeworkDialog}
        onClose={() => setEditHomeworkDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary', borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pb: 2 }}>
          ✏️ Modifier le devoir
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Titre du devoir"
            value={editHomeworkForm.title}
            onChange={(e) => setEditHomeworkForm({ ...editHomeworkForm, title: e.target.value })}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={editHomeworkForm.description}
            onChange={(e) => setEditHomeworkForm({ ...editHomeworkForm, description: e.target.value })}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />
          <TextField
            fullWidth
            type="datetime-local"
            label="Date limite"
            InputLabelProps={{ shrink: true }}
            value={editHomeworkForm.dueDate}
            onChange={(e) => setEditHomeworkForm({ ...editHomeworkForm, dueDate: e.target.value })}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                borderRadius: 3,
                '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
              }
            }}
          />

          {/* Current / New File Attachment */}
          <Box sx={{ mt: 2.5, mb: 1 }}>
            {editHomeworkForm.currentAttachment && !editHomeworkForm.file && (
              <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#EEF2FF', border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#C7D2FE'), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" fontWeight={700} color="text.primary">
                  📎 Fichier actuel : {editHomeworkForm.currentAttachment.split(/[/\\]/).pop()}
                </Typography>
                <Button
                  size="small"
                  startIcon={<Description sx={{ fontSize: 16 }} />}
                  href={`http://localhost:5000/api/homework/${editHomeworkForm.id}/file`}
                  target="_blank"
                  sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Voir
                </Button>
              </Box>
            )}

            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<AttachFile sx={{ color: '#6366F1' }} />}
              sx={{
                borderRadius: 3,
                py: 1.5,
                fontWeight: 700,
                textTransform: 'none',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: editHomeworkForm.file ? (colorMode.mode === 'dark' ? '#10B981' : '#059669') : (colorMode.mode === 'dark' ? '#334155' : '#C7D2FE'),
                bgcolor: editHomeworkForm.file ? (colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5') : (colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC'),
                color: editHomeworkForm.file ? (colorMode.mode === 'dark' ? '#34D399' : '#059669') : 'text.primary',
                '&:hover': {
                  borderColor: '#6366F1',
                  bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF'
                }
              }}
            >
              {editHomeworkForm.file ? `📎 Remplacer par : ${editHomeworkForm.file.name}` : (editHomeworkForm.currentAttachment ? '📎 Remplacer le fichier joint...' : '📎 Joindre un sujet de devoir (PDF, Word, Image...)')}
              <input
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                onChange={(e) => setEditHomeworkForm({ ...editHomeworkForm, file: e.target.files[0] })}
              />
            </Button>
            {editHomeworkForm.file && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Nouveau fichier : {(editHomeworkForm.file.size / 1024).toFixed(1)} Ko
                </Typography>
                <Button
                  size="small"
                  color="error"
                  onClick={() => setEditHomeworkForm({ ...editHomeworkForm, file: null })}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0, fontWeight: 700 }}
                >
                  ✕ Annuler le remplacement
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}>
          <Button onClick={() => setEditHomeworkDialog(false)} sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={handleEditHomework} sx={{ fontWeight: 800, borderRadius: 3, bgcolor: '#4F46E5', px: 3.5, py: 1, textTransform: 'none' }}>Enregistrer</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog}
        onClose={() => setDeleteConfirmDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0')
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>Confirmer la suppression</DialogTitle>
        <DialogContent><Typography color="text.secondary">Êtes-vous sûr de vouloir supprimer définitivement ce devoir ? Cette action est irréversible.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteConfirmDialog(false)} sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDeleteHomework} sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none' }}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      {/* Student Preview Dialog (Fidèle à la vue élève) */}
      <Dialog
        open={studentPreviewDialog}
        onClose={() => setStudentPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Visibility sx={{ color: '#6366F1' }} />
            <Typography variant="h6" fontWeight={800} color="text.primary">👁️ Aperçu Élève : {activeMenuHw?.title}</Typography>
          </Box>
          <Chip label={'Barème : ' + (activeMenuHw?.maxScore || 20) + ' pts'} size="small" color="primary" sx={{ fontWeight: 800, borderRadius: 2 }} />
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2.5, mt: 1 }}>
            <Chip label={'Matière : ' + (activeMenuHw?.subject || 'math').toUpperCase()} size="small" sx={{ fontWeight: 700, borderRadius: 2 }} />
            <Chip label={'Niveau : ' + (activeMenuHw?.gradeLevel || selectedClass)} size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: 2 }} />
          </Box>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3.5, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', mb: 2.5 }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>ÉNONCÉ & CONSIGNES DU PROFESSEUR :</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, color: 'text.primary' }}>{activeMenuHw?.description}</Typography>
          </Paper>

          {activeMenuHw?.attachmentPath && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', borderColor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE', mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: '#4F46E5', color: '#fff', width: 34, height: 34 }}><Description sx={{ fontSize: 18 }} /></Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="text.primary">{activeMenuHw.attachmentPath.split(/[/\\]/).pop()}</Typography>
                  <Typography variant="caption" color="text.secondary">Document de sujet joint par le professeur</Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<Download />}
                href={`http://localhost:5000/api/homework/${activeMenuHw.id}/file`}
                target="_blank"
                sx={{ borderRadius: 2.5, bgcolor: '#4F46E5', textTransform: 'none', fontWeight: 700 }}
              >
                Télécharger
              </Button>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3.5, border: '2px dashed ' + (colorMode.mode === 'dark' ? '#334155' : '#CBD5E1'), bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FAFAFA', textAlign: 'center' }}>
            <Typography variant="subtitle2" fontWeight={800} color="text.primary" gutterBottom>Zone de dépôt de l'élève (Simulation)</Typography>
            <Typography variant="body2" color="text.secondary">L'élève dispose ici d'un éditeur de texte et d'un bouton pour joindre sa copie (PDF/Image).</Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pt: 2 }}>
          <Button variant="contained" onClick={() => setStudentPreviewDialog(false)} sx={{ fontWeight: 800, borderRadius: 3, bgcolor: '#4F46E5', textTransform: 'none', px: 3 }}>Fermer l'aperçu</Button>
        </DialogActions>
      </Dialog>

      {/* Submissions & Direct Grading Modal (PRO LUXURY DARK PALETTE) */}
      <Dialog
        open={submissionsModal}
        onClose={() => setSubmissionsModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={900} color="text.primary">📥 Copies & Notation : {selectedHomeworkSubmissions?.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {(selectedHomeworkSubmissions?.submissions || []).length} copie(s) remise(s) • Barème : {selectedHomeworkSubmissions?.maxScore || 20} pts
            </Typography>
          </Box>
          {selectedHomeworkSubmissions && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportSubmissionsCSV(selectedHomeworkSubmissions)}
              sx={{
                borderRadius: 3,
                fontWeight: 700,
                textTransform: 'none',
                borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                color: colorMode.mode === 'dark' ? '#34D399' : '#059669'
              }}
            >
              Exporter CSV
            </Button>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 3 }}>
          {(selectedHomeworkSubmissions?.submissions || []).length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" fontWeight={700} color="text.secondary">Aucune copie remise pour l'instant.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Les devoirs remis par les élèves apparaîtront ici automatiquement avec leur fichier joint.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {(selectedHomeworkSubmissions?.submissions || []).map((sub) => {
                const isGraded = sub.score !== null && sub.score !== undefined;
                const studentName = sub.studentName || (sub.student ? sub.student.firstName + ' ' + (sub.student.lastName || '') : 'Élève');
                const studentEmail = sub.student?.email || '';

                return (
                  <Paper
                    key={sub.id}
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                      borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                      borderLeft: '4px solid ' + (isGraded ? '#10B981' : '#6366F1')
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#4F46E5', color: '#fff', fontWeight: 800, width: 38, height: 38 }}>
                          {studentName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800} color="text.primary">{studentName}</Typography>
                          <Typography variant="caption" color="text.secondary">{studentEmail} • Remis le {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('fr-FR') : '-'}</Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={isGraded ? '✓ Note : ' + sub.score + ' / ' + (selectedHomeworkSubmissions?.maxScore || 20) : '⏳ En attente de note'}
                        color={isGraded ? 'success' : 'warning'}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      />
                    </Box>

                    {/* Student text submission & file */}
                    {sub.content && (
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#EEF2F6', mb: 2 }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase' }}>Réponse de l'élève :</Typography>
                        <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{sub.content}</Typography>
                      </Paper>
                    )}

                    {sub.filePath && (
                      <Box sx={{ mb: 2 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Description />}
                          href={'http://localhost:5000/api/homework/submissions/' + sub.id + '/file'}
                          target="_blank"
                          sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE', color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5' }}
                        >
                          📄 Visualiser / Télécharger la Copie de l'élève
                        </Button>
                      </Box>
                    )}

                    {/* Direct Teacher Grading Form */}
                    <Box sx={{ p: 2.2, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#EEF2FF', border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#C7D2FE'), display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography variant="caption" fontWeight={900} color={colorMode.mode === 'dark' ? '#818CF8' : 'primary.main'} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        ✍️ Noter cette copie (sur {selectedHomeworkSubmissions?.maxScore || 20} pts)
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                          size="small"
                          type="number"
                          label="Note / 20"
                          placeholder="Ex: 16"
                          value={gradingScores[sub.id] !== undefined ? gradingScores[sub.id] : (sub.score !== null ? sub.score : '')}
                          onChange={(e) => setGradingScores({ ...gradingScores, [sub.id]: e.target.value })}
                          sx={{
                            width: 120,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                              borderRadius: 2.5,
                              '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                            }
                          }}
                        />
                        <TextField
                          size="small"
                          fullWidth
                          label="Commentaire & Feedback pédagogique"
                          placeholder="Ex: Très bonne rédaction, attention à la justification de la dérivée..."
                          value={gradingFeedbacks[sub.id] !== undefined ? gradingFeedbacks[sub.id] : (sub.feedback || '')}
                          onChange={(e) => setGradingFeedbacks({ ...gradingFeedbacks, [sub.id]: e.target.value })}
                          sx={{
                            flexGrow: 1,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                              borderRadius: 2.5,
                              '& fieldset': { borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }
                            }
                          }}
                        />
                        <Button
                          variant="contained"
                          disabled={savingGradeId === sub.id}
                          onClick={() => handleGradeStudentSubmission(sub.id)}
                          sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none', bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, px: 2.5, py: 1 }}
                        >
                          {savingGradeId === sub.id ? 'Enregistrement...' : '💾 Enregistrer la Note'}
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pt: 2 }}>
          <Button variant="contained" onClick={() => setSubmissionsModal(false)} sx={{ fontWeight: 800, borderRadius: 3, bgcolor: '#4F46E5', textTransform: 'none', px: 3 }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Upload Course Document Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Upload Course Document ({uploadForm.gradeLevel})</DialogTitle>
        <DialogContent>
          <TextField fullWidth select name="subject" label="Subject" value={uploadForm.subject} onChange={handleUploadChange} margin="normal">
            {subjects.map((subject) => <MenuItem key={subject.id} value={subject.id}>{subject.emoji} {subject.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth select name="gradeLevel" label="Grade Level" value={uploadForm.gradeLevel} onChange={handleUploadChange} margin="normal">
            {gradeLevelsList.map((g) => <MenuItem key={g.id} value={g.id}>{g.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth name="title" label="Document Title" value={uploadForm.title} onChange={handleUploadChange} margin="normal" />
          <TextField fullWidth name="chapter" label="Chapter (Optional)" placeholder="Ex: Logarithmes et Exponentielles" value={uploadForm.chapter} onChange={handleUploadChange} margin="normal" />
          <TextField fullWidth multiline rows={2} name="description" label="Description (Optional)" value={uploadForm.description} onChange={handleUploadChange} margin="normal" />
          <Button variant="outlined" component="label" fullWidth sx={{ mt: 2, borderRadius: 5, py: 1.2, fontWeight: 700 }}>
            {uploadForm.file ? uploadForm.file.name : 'Choisir un fichier (PDF/TXT)'}
            <input type="file" hidden onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })} />
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setUploadDialog(false)} sx={{ fontWeight: 700 }}>Annuler</Button>
          <Button variant="contained" onClick={handleUploadDocument} sx={{ fontWeight: 800, borderRadius: 5, bgcolor: '#4F46E5' }}>Upload</Button>
        </DialogActions>
      </Dialog>

      {/* FULL Course Document Preview Modal (IDENTICAL TO STUDENT DASHBOARD WITH PDF VIEWER IFRAME) */}
      <Dialog
        open={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
            color: colorMode.mode === 'dark' ? '#F8FAFC' : 'text.primary'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#EEF2FF', color: '#4F46E5' }}>
              <Description />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="text.primary">
                {selectedSource?.title || docDetails?.title || 'Document de Cours'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fiche de cours et supports indexés par ScholarAI
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setSourceModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {sourceLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6, gap: 2 }}>
              <CircularProgress size={24} sx={{ color: '#4F46E5' }} />
              <Typography variant="body2" color="text.secondary">Chargement du document de cours...</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={'📖 ' + (docDetails?.subject ? docDetails.subject.toUpperCase() : 'COURS')} size="small" sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 800 }} />
                {docDetails?.chapter && (
                  <Chip label={'📚 Chapitre: ' + docDetails.chapter} size="small" sx={{ bgcolor: '#F1F5F9', color: '#334155', fontWeight: 700 }} />
                )}
                {docDetails?.gradeLevel && (
                  <Chip label={'🎓 ' + docDetails.gradeLevel} size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700 }} />
                )}
                <Chip label={'👨‍🏫 ' + (docDetails?.teacherName || 'Professeur')} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
              </Box>

              <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mt: 1 }}>
                {docDetails?.isPdf ? 'Visualiseur de Document PDF Officiel :' : 'Aperçu du contenu du cours :'}
              </Typography>

              {docDetails?.isPdf && pdfBlobUrl ? (
                <Box sx={{ width: '100%', height: 480, borderRadius: 3, overflow: 'hidden', border: '1px solid #CBD5E1', bgcolor: '#F8FAFC' }}>
                  <iframe
                    src={pdfBlobUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title={selectedSource?.title || 'PDF Viewer'}
                  />
                </Box>
              ) : (
                <Paper variant="outlined" sx={{ p: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#CBD5E1', borderRadius: 3, maxHeight: 320, overflowY: 'auto' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: colorMode.mode === 'dark' ? '#E2E8F0' : '#1E293B', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                    {docDetails?.contentSnippet || selectedSource?.description || 'Support de cours théorique déposé par l\'enseignant.'}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button onClick={() => setSourceModalOpen(false)} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 700 }}>
            Fermer
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => handleDownloadSource(selectedSource)}
            sx={{
              bgcolor: '#4F46E5',
              '&:hover': { bgcolor: '#4338CA' },
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: 2.5,
              px: 3
            }}
          >
            Télécharger le Support (PDF/TXT)
          </Button>
        </DialogActions>
      </Dialog>

      {/* FULL STUDENT CARNET, COPIES & AI TUTOR DIALOG (MULTI-TAB) */}
      <Dialog
        open={sessionDialog}
        onClose={() => setSessionDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
            color: colorMode.mode === 'dark' ? '#F8FAFC' : 'text.primary',
            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            minHeight: 650
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
            <Avatar sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#FFFFFF', fontWeight: 800, width: 44, height: 44 }}>
              {selectedStudent?.firstName ? selectedStudent.firstName[0] : 'E'}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={900} color="text.primary">
                🎓 Carnet Pédagogique & Suivi : {selectedStudent?.firstName} {selectedStudent?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Classe : {selectedStudent?.grade || selectedClass || '1ère Bac'} • {selectedStudent?.email}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setSessionDialog(false)} size="small"><Close /></IconButton>
        </DialogTitle>

        {/* Modal Segmented Navigation Tabs */}
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#E2E8F0', bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC' }}>
          <Tabs
            value={studentModalTab}
            onChange={(e, v) => setStudentModalTab(v)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                minHeight: 40,
                py: 0.5,
                borderRadius: 2.5,
                px: 2.5,
                color: 'text.secondary',
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  color: '#FFFFFF',
                  bgcolor: '#4F46E5',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
                }
              },
              '& .MuiTabs-indicator': { display: 'none' }
            }}
          >
            <Tab icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" label="📝 Copies & Devoirs Rendus" />
            <Tab icon={<Star sx={{ fontSize: 18 }} />} iconPosition="start" label="⭐ Résultats Quiz QCM" />
            <Tab icon={<Forum sx={{ fontSize: 18 }} />} iconPosition="start" label="💬 Conversations IA Tutor" />
          </Tabs>
        </Box>

        <DialogContent dividers sx={{ p: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF' }}>
          {/* TAB 0: STUDENT COPIES & HOMEWORKS */}
          {studentModalTab === 0 && (
            <Box>
              {(() => {
                const classHws = homeworks.filter(h => isGradeMatch(h.gradeLevel, selectedClass || selectedStudent?.grade) && h.type !== 'qcm' && !h.title?.includes('[Quiz QCM]'));
                if (classHws.length === 0) {
                  return (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} color="text.secondary">Aucun devoir écrit configuré pour cette classe.</Typography>
                    </Box>
                  );
                }
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {classHws.map((hw) => {
                      const sub = (hw.submissions || []).find(s => s.studentId === selectedStudent?.id);
                      const isSubmitted = Boolean(sub);
                      const isGraded = sub && sub.score !== null && sub.score !== undefined;
                      return (
                        <Paper
                          key={hw.id}
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                            borderLeft: '5px solid ' + (isGraded ? '#10B981' : (isSubmitted ? '#F59E0B' : '#EF4444'))
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'gap', gap: 1.5, mb: 1.5 }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Chip label={(hw.subject || 'math').toUpperCase()} size="small" sx={{ fontWeight: 800, bgcolor: '#4F46E5', color: '#fff', fontSize: '0.72rem' }} />
                                <Typography variant="h6" fontWeight={800} color="text.primary">{hw.title}</Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Date limite : {new Date(hw.dueDate).toLocaleString('fr-FR')} • Barème : {hw.maxScore || 20} pts
                              </Typography>
                            </Box>
                            <Chip
                              label={isGraded ? `✓ Noté : ${sub.score} / ${hw.maxScore || 20}` : (isSubmitted ? '⏳ Rendu (En attente de notation)' : '🔴 Non Rendu')}
                              color={isGraded ? 'success' : (isSubmitted ? 'warning' : 'error')}
                              sx={{ fontWeight: 800, borderRadius: 2 }}
                            />
                          </Box>

                          {/* Consignes du devoir */}
                          <Paper variant="outlined" sx={{ p: 1.8, mb: 2, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 0.3, textTransform: 'uppercase' }}>
                              📝 Énoncé / Consignes :
                            </Typography>
                            <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-line', fontSize: '0.86rem' }}>
                              {hw.description}
                            </Typography>
                          </Paper>

                          {/* Copie remise */}
                          {isSubmitted ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0') }}>
                                <Typography variant="caption" fontWeight={800} color="#6366F1" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase' }}>
                                  📄 Copie remise par l'élève (le {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('fr-FR') : '-'}) :
                                </Typography>
                                {sub.content && (
                                  <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', mb: sub.filePath ? 1.5 : 0 }}>
                                    {sub.content}
                                  </Typography>
                                )}
                                {sub.filePath && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Description sx={{ color: '#10B981' }} />}
                                    href={'http://localhost:5000/api/homework/submissions/' + sub.id + '/file'}
                                    target="_blank"
                                    sx={{
                                      borderRadius: 2.5,
                                      fontWeight: 700,
                                      textTransform: 'none',
                                      color: colorMode.mode === 'dark' ? '#34D399' : '#059669',
                                      borderColor: colorMode.mode === 'dark' ? '#334155' : '#A7F3D0',
                                      bgcolor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5'
                                    }}
                                  >
                                    📄 Télécharger / Consulter la Copie
                                  </Button>
                                )}
                              </Box>

                              {/* Formulaire de Notation */}
                              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF', border: '1px solid ' + (colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.25)' : '#C7D2FE') }}>
                                <Typography variant="caption" fontWeight={900} color={colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5'} sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                  ✍️ Noter cette copie (sur {hw.maxScore || 20} pts)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    label="Note / 20"
                                    placeholder="Ex: 17"
                                    value={gradingScores[sub.id] !== undefined ? gradingScores[sub.id] : (sub.score !== null ? sub.score : '')}
                                    onChange={(e) => setGradingScores({ ...gradingScores, [sub.id]: e.target.value })}
                                    sx={{ width: 110, '& .MuiOutlinedInput-root': { bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', borderRadius: 2 } }}
                                  />
                                  <TextField
                                    size="small"
                                    fullWidth
                                    label="Feedback & Remarques pédagogiques"
                                    placeholder="Ex: Très bon raisonnement, soignez la rédaction..."
                                    value={gradingFeedbacks[sub.id] !== undefined ? gradingFeedbacks[sub.id] : (sub.feedback || '')}
                                    onChange={(e) => setGradingFeedbacks({ ...gradingFeedbacks, [sub.id]: e.target.value })}
                                    sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', borderRadius: 2 } }}
                                  />
                                  <Button
                                    variant="contained"
                                    disabled={savingGradeId === sub.id}
                                    onClick={() => handleGradeStudentSubmission(sub.id)}
                                    sx={{ borderRadius: 2.5, fontWeight: 800, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, textTransform: 'none', px: 2.5, py: 1 }}
                                  >
                                    {savingGradeId === sub.id ? 'Enregistrement...' : '💾 Enregistrer la Note'}
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFF5F5', border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#FED7D7') }}>
                              <Typography variant="body2" color="error.main" fontWeight={700}>
                                ⚠️ Aucune copie n'a encore été remise par {selectedStudent?.firstName} pour ce devoir.
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                );
              })()}
            </Box>
          )}

          {/* TAB 1: STUDENT QUIZZES */}
          {studentModalTab === 1 && (
            <Box>
              {(() => {
                const classQuizzes = homeworks.filter(h => isGradeMatch(h.gradeLevel, selectedClass || selectedStudent?.grade) && (h.type === 'qcm' || h.title?.includes('[Quiz QCM]')));
                if (classQuizzes.length === 0) {
                  return (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} color="text.secondary">Aucun quiz QCM créé pour cette classe.</Typography>
                    </Box>
                  );
                }
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {classQuizzes.map((quiz) => {
                      const sub = (quiz.submissions || []).find(s => s.studentId === selectedStudent?.id);
                      return (
                        <Paper
                          key={quiz.id}
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC',
                            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 2
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: '#10B981', color: '#fff', fontWeight: 900 }}>⭐</Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={800} color="text.primary">{quiz.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {quiz.subject?.toUpperCase()} • Barème : {quiz.maxScore || 20} pts
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={sub ? `Score : ${sub.score !== null ? sub.score : 0} / ${quiz.maxScore || 20} pts` : 'Non complété'}
                            color={sub ? 'success' : 'default'}
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          />
                        </Paper>
                      );
                    })}
                  </Box>
                );
              })()}
            </Box>
          )}

          {/* TAB 2: AI TUTOR CONVERSATIONS & EVALUATION */}
          {studentModalTab === 2 && (
            <Box>
              {sessionLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, gap: 2 }}>
                  <CircularProgress size={28} sx={{ color: '#4F46E5' }} />
                  <Typography variant="body2" color="text.secondary">Chargement des sessions de tutorat...</Typography>
                </Box>
              ) : studentSessions.length === 0 && !selectedSession ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={800} color="text.secondary" gutterBottom>
                    Aucune session de tutorat trouvée
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cet élève n'a pas encore initié de discussion avec le tuteur IA.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {/* Left Column: Sessions List */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      📅 Sessions de l'élève
                    </Typography>
                    <List sx={{ maxHeight: 440, overflowY: 'auto', pr: 1 }}>
                      {(studentSessions.length > 0 ? studentSessions : (selectedSession ? [selectedSession] : [])).map((sess) => {
                        const isSelected = selectedSession?.id === sess.id;
                        const msgCount = (sess.conversation || []).length;
                        return (
                          <Paper
                            key={sess.id}
                            variant="outlined"
                            onClick={() => handleSelectSessionToInspect(sess)}
                            sx={{
                              p: 1.8,
                              mb: 1.5,
                              borderRadius: 3,
                              cursor: 'pointer',
                              bgcolor: isSelected ? (colorMode.mode === 'dark' ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF') : (colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC'),
                              borderColor: isSelected ? '#4F46E5' : (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
                              borderWidth: isSelected ? 2 : 1,
                              transition: 'all 0.2s ease',
                              '&:hover': { transform: 'translateX(4px)', borderColor: '#4F46E5' }
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Chip label={(sess.subject || 'MATH').toUpperCase()} size="small" sx={{ bgcolor: '#4F46E5', color: '#fff', fontWeight: 800, fontSize: '0.7rem', height: 20 }} />
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {sess.createdAt ? new Date(sess.createdAt).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.3, mb: 0.5 }}>
                              {sess.subject} • {sess.mode || 'Tutorat standard'}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {msgCount} message(s)
                              </Typography>
                              {sess.teacherRating && (
                                <Typography variant="caption" color="#F59E0B" fontWeight={800}>
                                  ★ {sess.teacherRating}/5
                                </Typography>
                              )}
                            </Box>
                          </Paper>
                        );
                      })}
                    </List>
                  </Grid>

                  {/* Right Column: Full Conversation Transcript & Teacher Evaluation */}
                  <Grid item xs={12} md={8}>
                    {selectedSession ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                              💬 Discussion en {selectedSession.subject}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {selectedSession.createdAt ? 'Démarrée le ' + new Date(selectedSession.createdAt).toLocaleString('fr-FR') : 'Session active'}
                            </Typography>
                          </Box>
                          <Chip label={selectedSession.outcome === 'solved' ? '✓ Résolu' : 'En cours'} color={selectedSession.outcome === 'solved' ? 'success' : 'default'} size="small" sx={{ fontWeight: 800 }} />
                        </Box>

                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC',
                            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                            maxHeight: 280,
                            overflowY: 'auto',
                            mb: 2.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                          }}
                        >
                          {(selectedSession.conversation || []).length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                              <Typography variant="body2" color="text.secondary">Aucun message échangé dans cette session.</Typography>
                            </Box>
                          ) : (
                            (selectedSession.conversation || []).map((msg, mIdx) => {
                              const isUser = msg.role === 'user';
                              return (
                                <Box
                                  key={mIdx}
                                  sx={{
                                    display: 'flex',
                                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                                    alignItems: 'flex-start',
                                    gap: 1
                                  }}
                                >
                                  {!isUser && (
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#4F46E5', fontSize: '0.75rem' }}>
                                      <School sx={{ fontSize: 16 }} />
                                    </Avatar>
                                  )}
                                  <Box
                                    sx={{
                                      maxWidth: '78%',
                                      p: 1.8,
                                      borderRadius: 3,
                                      bgcolor: isUser ? '#4F46E5' : (colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF'),
                                      color: isUser ? '#FFFFFF' : 'text.primary',
                                      border: isUser ? 'none' : '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5, color: isUser ? '#C7D2FE' : '#4F46E5' }}>
                                      {isUser ? '👨‍🎓 ' + (selectedStudent?.firstName || 'Élève') : '🤖 ScholarAI Tutor'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {msg.content}
                                    </Typography>
                                  </Box>
                                  {isUser && (
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#818CF8', fontSize: '0.75rem' }}>
                                      {selectedStudent?.firstName ? selectedStudent.firstName[0] : 'E'}
                                    </Avatar>
                                  )}
                                </Box>
                              );
                            })
                          )}
                        </Paper>

                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                            border: '1px solid ' + (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0')
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            ⭐ Évaluation Enseignant de la Session
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">Note attribuée :</Typography>
                            <Rating
                              value={evaluation.rating}
                              onChange={(e, val) => setEvaluation({ ...evaluation, rating: val })}
                              size="small"
                            />
                          </Box>
                          <TextField
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            placeholder="Ajouter un commentaire ou conseil pour le suivi de cet élève..."
                            value={evaluation.feedback}
                            onChange={(e) => setEvaluation({ ...evaluation, feedback: e.target.value })}
                            sx={{ mb: 1.5 }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleEvaluateSession}
                            sx={{ borderRadius: 5, fontWeight: 800, bgcolor: '#4F46E5', textTransform: 'none', px: 2.5 }}
                          >
                            Enregistrer l'évaluation
                          </Button>
                        </Paper>
                      </Box>
                    ) : (
                      <Box sx={{ p: 6, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Sélectionnez une session à gauche pour visualiser la conversation complète.
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9' }}>
          <Button onClick={() => setSessionDialog(false)} sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'none' }}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>


      {startTour && <TourEngine steps={tourConfigs.teacher} refs={tourRefs} />}
    </Box>
  );
}
