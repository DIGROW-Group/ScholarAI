import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getConfig } from '../config/appConfig';
import {
  Box,
  Container,
  Avatar,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Drawer,
  Card,
  CardContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
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
  Badge,
  Popover,
  ListItemAvatar,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Skeleton,
} from '@mui/material';
import {
  Logout,
  Send,
  CheckCircle,
  Schedule,
  TrendingUp,
  Lightbulb,
  School,
  Login as LoginIcon,
  LogoutOutlined,
  Menu as MenuIcon,
  Description,
  Download,
  Close,
  Assignment,
  Upload,
  Notifications,
  DoneAll,
  Star,
  Brightness4,
  Brightness7,
  Functions,
  Science,
  Translate,
  Language,
  MenuBook,
  Terminal,
  Forum,
  Psychology,
  AttachFile,
  PictureAsPdf,
  OpenInNew,
  ExpandMore,
  ChatBubbleOutline,
  ArrowBack,
  ArrowForward,
  Class,
  Delete,
  AutoAwesome,
  EmojiEvents,
  FactCheck,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { useColorMode } from '../context/ColorModeContext';
import api from '../services/api';
import TourEngine from '../components/OnboardingTour/TourEngine';
import { tourConfigs } from '../components/OnboardingTour/tourConfigs';
import SessionListSkeleton from '../components/skeletons/SessionListSkeleton';
import StatCardSkeleton from '../components/skeletons/StatCardSkeleton';
import EmptyState from '../components/EmptyState';



const SUBJECTS = [
  { id: 'math', label: 'Maths', icon: <Functions sx={{ fontSize: 16 }} /> },
  { id: 'physics', label: 'Physique', icon: <Science sx={{ fontSize: 16 }} /> },
{ id: 'arabic', label: 'Arabe', icon: <Translate sx={{ fontSize: 16 }} /> },
  { id: 'english', label: 'Anglais', icon: <Language sx={{ fontSize: 16 }} /> },
  { id: 'french', label: 'Français', icon: <MenuBook sx={{ fontSize: 16 }} /> },
  { id: 'informatique', label: 'Informatique', icon: <Terminal sx={{ fontSize: 16 }} /> },
];

// Helper to render inline LaTeX math $...$ and $$...$$ with clean typography
const renderFormattedMath = (text) => {
  if (!text) return null;
  const parts = String(text).split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const mathStr = part.slice(2, -2).trim();
      return (
        <Box key={index} component="span" sx={{ display: 'block', my: 1, textAlign: 'center', fontFamily: '"KaTeX_Main", "Times New Roman", serif', fontSize: '1.15em', fontWeight: 700, color: '#8B5CF6' }}>
          {formatMathSymbols(mathStr)}
        </Box>
      );
    } else if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
      const mathStr = part.slice(1, -1).trim();
      return (
        <Box key={index} component="span" sx={{ fontFamily: '"KaTeX_Main", "Times New Roman", serif', fontSize: '1.05em', fontWeight: 700, color: '#6366F1', px: 0.4 }}>
          {formatMathSymbols(mathStr)}
        </Box>
      );
    } else {
      return <span key={index}>{part}</span>;
    }
  });
};

function formatMathSymbols(str) {
  if (!str) return '';
  return str
    .replace(/\\lim_{([^}]+)}/g, 'lim ($1)')
    .replace(/\\lim/g, 'lim')
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1 / $2)')
    .replace(/\\sqrt{([^}]+)}/g, '√($1)')
    .replace(/\\to/g, ' → ')
    .replace(/\\infty/g, '∞')
    .replace(/\\in/g, ' ∈ ')
    .replace(/\\mathbb{R}/g, 'ℝ')
    .replace(/\\cdot/g, ' · ')
    .replace(/\\times/g, ' × ')
    .replace(/\\ln/g, 'ln')
    .replace(/\\exp/g, 'exp')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\tau/g, 'τ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\bar{([^}]+)}/g, '$1̄')
    .replace(/\\vec{([^}]+)}/g, '$1⃗');
}

export default function StudentDashboard() {

  const handleDeleteSession = async (e, sessId) => {
    if (e) e.stopPropagation();
    try {
      await api.delete('/tutor/session/' + sessId);
      setSessions(prev => prev.filter(s => s.id !== sessId));
      if (sessionId === sessId) {
        setSessionId(null);
        setConversation([]);
      }
      show('Discussion supprimée avec succès !', 'success');
    } catch (err) {
      console.error('Failed to delete session:', err);
      show('Erreur lors de la suppression de la discussion.', 'error');
    }
  };

  const { user, logout } = useAuth();
  const { show } = useSnackbar();
  const colorMode = useColorMode();
  const config = getConfig();
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startTour, setStartTour] = useState(false);
  const onboardingCompleted = user?.onboardingCompleted;
  const userId = user?.id;

  const tourRefs = {
    appBarTabs: useRef(null),
    attendancePanel: useRef(null),
    alertBanners: useRef(null),
    aiTutorChat: useRef(null),
    subjectChips: useRef(null),
    masteryBars: useRef(null),
  };
  
  // Tutor state
  const [subject, setSubject] = useState('math');
  const [question, setQuestion] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [outcome, setOutcome] = useState('solved');

  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading]);

  // Progress state
  const [progress, setProgress] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [orientation, setOrientation] = useState(null);
  const [orientationLoading, setOrientationLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [docDetails, setDocDetails] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // Homework & Assignments State
  const [studentHomeworks, setStudentHomeworks] = useState([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [selectedSubmitHomework, setSelectedSubmitHomework] = useState(null);
  const [submitHomeworkModal, setSubmitHomeworkModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({ content: '', file: null });
  const [assignmentSubTab, setAssignmentSubTab] = useState(0); // 0 = Homework, 1 = QCM Quizzes
  const [selectedModuleSubject, setSelectedModuleSubject] = useState(null);

  // Flashcards & MindMaps State
  const [fcSubject, setFcSubject] = useState('math');
  const [fcTopic, setFcTopic] = useState('Dérivation & Étude de Fonctions');
  const [fcLoading, setFcLoading] = useState(false);
  const [flashcardsData, setFlashcardsData] = useState([]);
  const [mindmapData, setMindmapData] = useState(null);
  const [currentFcIndex, setCurrentFcIndex] = useState(0);
  const [isFcFlipped, setIsFcFlipped] = useState(false);
  const [fcViewMode, setFcViewMode] = useState('flashcards'); // 'flashcards' | 'mindmap'
  const [fcMasteryPct, setFcMasteryPct] = useState(0);
  const [fcRatings, setFcRatings] = useState({});
  const [availableCourseDocs, setAvailableCourseDocs] = useState([]);
  const [selectedCourseDoc, setSelectedCourseDoc] = useState('');
  const [isFcCompleted, setIsFcCompleted] = useState(false);

  const loadCourseDocumentsForSubject = async (subj = fcSubject) => {
    try {
      const normalizedSubj = (subj || 'math').toLowerCase();
      const res = await api.get('/documents/list?subject=' + normalizedSubj);
      const docs = res.data.documents || [];
      setAvailableCourseDocs(docs);

      if (docs.length > 0) {
        setSelectedCourseDoc(docs[0].title);
        const topName = docs[0].chapter || docs[0].title;
        setFcTopic(topName);
        handleFetchFlashcards(normalizedSubj, topName);
      } else {
        setSelectedCourseDoc('empty');
        setFcTopic('Général');
        setFlashcardsData([]);
        setMindmapData(null);
      }
    } catch (err) {
      console.error('Failed to load teacher course docs:', err);
      setAvailableCourseDocs([]);
      setSelectedCourseDoc('empty');
    }
  };

  useEffect(() => {
    loadCourseDocumentsForSubject(fcSubject);
  }, [assignmentSubTab, fcSubject]);

  const handleFetchFlashcards = async (subj = fcSubject, top = fcTopic) => {
    try {
      setFcLoading(true);
      setIsFcFlipped(false);
      setCurrentFcIndex(0);
      setIsFcCompleted(false);
      setFcRatings({});
      setFcMasteryPct(0);
      const res = await api.post('/ai/flashcards', { subject: subj, topic: top });
      if (res.data && res.data.data) {
        setFlashcardsData(res.data.data.flashcards || []);
        setMindmapData(res.data.data.mindmap || null);
        show('Flashcards & Carte Mentale générées avec succès !', 'success');
      }
    } catch (err) {
      console.error('Failed to load flashcards:', err);
      show('Erreur lors du chargement des Flashcards IA.', 'error');
    } finally {
      setFcLoading(false);
    }
  };

  const handleRateFlashcard = async (rating) => {
    if (!flashcardsData || flashcardsData.length === 0) return;
    const card = flashcardsData[currentFcIndex];
    const newRatings = { ...fcRatings, [card.id]: rating };
    setFcRatings(newRatings);

    const ratedCount = Object.keys(newRatings).length;
    const easyCount = Object.values(newRatings).filter(r => r === 'easy').length;
    const newPct = ratedCount > 0 ? Math.round((easyCount / flashcardsData.length) * 100) : 0;
    setFcMasteryPct(newPct);

    try {
      await api.post('/ai/flashcards/progress', { flashcardId: card.id, rating });
    } catch (err) {}

    // Auto next card
    if (currentFcIndex < flashcardsData.length - 1) {
      setIsFcFlipped(false);
      setTimeout(() => setCurrentFcIndex(prev => prev + 1), 250);
    } else {
      setIsFcCompleted(true);
      show('🎉 Session de révision terminée !', 'success');
    }
  }; // null = Modules Grid, 'math'/'physics' etc = Classroom Stream

  // Homework Classroom Comments State
  const [activeHomeworkComments, setActiveHomeworkComments] = useState({});
  const [newCommentText, setNewCommentText] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [postingComment, setPostingComment] = useState({});
  const [expandedComments, setExpandedComments] = useState({});

    const loadHomeworkComments = async (homeworkId) => {
    try {
      setLoadingComments(prev => ({ ...prev, [homeworkId]: true }));
      const res = await api.get(`/homework/${homeworkId}/comments`);
      setActiveHomeworkComments(prev => ({ ...prev, [homeworkId]: res.data.comments || [] }));
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [homeworkId]: false }));
    }
  };

  const handleToggleComments = (homeworkId) => {
    const nextState = !expandedComments[homeworkId];
    setExpandedComments(prev => ({ ...prev, [homeworkId]: nextState }));
    if (nextState && !activeHomeworkComments[homeworkId]) {
      loadHomeworkComments(homeworkId);
    }
  };

  const handlePostComment = async (homeworkId) => {
    const text = (newCommentText[homeworkId] || '').trim();
    if (!text) return;

    try {
      setPostingComment(prev => ({ ...prev, [homeworkId]: true }));
      const res = await api.post(`/homework/${homeworkId}/comments`, { content: text });
      setActiveHomeworkComments(prev => ({
        ...prev,
        [homeworkId]: [...(prev[homeworkId] || []), res.data.comment]
      }));
      setNewCommentText(prev => ({ ...prev, [homeworkId]: '' }));
      show('Commentaire publié avec succès !', 'success');
      loadStudentHomeworks();
    } catch (err) {
      console.error('Failed to post comment:', err);
      show('Erreur lors de la publication du commentaire', 'error');
    } finally {
      setPostingComment(prev => ({ ...prev, [homeworkId]: false }));
    }
  };

  const [notifications, setNotifications] = useState([]);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);

  // Student Quizzes State
  const [studentQuizzes, setStudentQuizzes] = useState([]);
  const [takeQuizModal, setTakeQuizModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});

  const loadNotifications = async () => {
    try {
      const res = await api.get('/homework/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const loadStudentQuizzes = async () => {
    try {
      const res = await api.get('/quiz/student');
      setStudentQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error('Failed to load student quizzes:', err);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;
    try {
      const res = await api.post(`/quiz/${selectedQuiz.id}/submit`, { answers: quizAnswers });
      show(`🎉 Quiz terminé et corrigé ! Note : ${res.data.score}/${res.data.maxScore}`, 'success');
      setTakeQuizModal(false);
      loadStudentQuizzes();
      loadNotifications();
    } catch (err) {
      console.error('Quiz submission error:', err);
      show('Erreur lors de la soumission du quiz', 'error');
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await api.patch(`/homework/notifications/${id}/read`);
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

  const loadStudentHomeworks = async () => {
    try {
      setHomeworkLoading(true);
      const res = await api.get('/homework/student');
      setStudentHomeworks(res.data.homeworks || []);
    } catch (err) {
      console.error('Failed to load student homeworks:', err);
    } finally {
      setHomeworkLoading(false);
    }
  };

  // Instant Real-Time Polling & Initial load on mount
  useEffect(() => {
    loadNotifications();
    loadStudentQuizzes();
    loadStudentHomeworks();
    loadCourseDocumentsForSubject(fcSubject);
    const interval = setInterval(() => {
      loadNotifications();
      loadStudentHomeworks();
      loadStudentQuizzes();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitHomework = async () => {
    if (!selectedSubmitHomework) return;
    if (!submitForm.content && !submitForm.file) {
      show('Veuillez remplir votre réponse ou joindre un fichier', 'warning');
      return;
    }
    try {
      const formData = new FormData();
      if (submitForm.content) formData.append('content', submitForm.content);
      if (submitForm.file) formData.append('file', submitForm.file);

      await api.post(`/homework/${selectedSubmitHomework.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      show('Votre devoir a été remis avec succès !', 'success');
      setSubmitHomeworkModal(false);
      setSubmitForm({ content: '', file: null });
      loadStudentHomeworks();
    } catch (err) {
      console.error('Failed to submit homework:', err);
      show('Erreur lors de la remise du devoir', 'error');
    }
  };

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
      const res = await api.get(`/documents/${docIdentifier}`);
      const doc = res.data.document;
      setDocDetails(doc);

      if (doc?.isPdf || (src.filePath && src.filePath.toLowerCase().endsWith('.pdf'))) {
        try {
          const fileRes = await api.get(`/documents/${docIdentifier}/file`, { responseType: 'blob' });
          const blob = new Blob([fileRes.data], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
        } catch (fileErr) {
          console.warn('Could not load PDF blob, falling back to text view');
        }
      }
    } catch (err) {
      console.error('Failed to load document details:', err);
      setDocDetails({
        id: src.id || src.documentId,
        title: src.title,
        subject: src.subject,
        chapter: src.chapter,
        gradeLevel: src.gradeLevel,
        isPdf: src.filePath ? src.filePath.toLowerCase().endsWith('.pdf') : false,
        contentSnippet: src.description || 'Support de cours théorique déposé par l\'enseignant.'
      });
    } finally {
      setSourceLoading(false);
    }
  };

  const handleDownloadSource = async (src) => {
    if (!src) return;
    const targetId = docDetails?.id || src.id || src.documentId || encodeURIComponent(src.title);
    
    try {
      const response = await api.get(`/documents/${targetId}/download`, { responseType: 'blob' });
      const contentType = response.headers['content-type'] || '';
      const isPdf = contentType.includes('pdf') || (docDetails && docDetails.isPdf) || (src.filePath && src.filePath.toLowerCase().endsWith('.pdf'));
      const ext = isPdf ? '.pdf' : '.txt';

      const url = window.URL.createObjectURL(new Blob([response.data], { type: isPdf ? 'application/pdf' : 'text/plain' }));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (src.title || 'Support_de_cours').replace(/[^a-zA-Z0-9_\-]/g, '_');
      link.setAttribute('download', `${safeTitle}${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      show('Erreur lors du téléchargement du document', 'error');
    }
  };

  const studentTabs = [
    { label: 'Tuteur IA', icon: <Lightbulb /> },
    { label: 'Ma Progression', icon: <TrendingUp /> },
    { label: 'Orientation', icon: <School /> },
    { label: 'Devoirs & Travaux', icon: <Assignment /> },
  ];

  const loadData = useCallback(async () => {
    try {
      setDashboardLoading(true);
      setDashboardError(null);
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
      setAvailableSubjects(progressRes.data.availableSubjects || SUBJECTS.map(s => s.id));
    } catch (error) {
      console.error('Failed to load data:', error);
      setDashboardError(error);
      show('Failed to load dashboard data', 'error');
    } finally {
      setDashboardLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!userId || onboardingCompleted) return;
    const timer = setTimeout(() => setStartTour(true), 800);
    return () => clearTimeout(timer);
  }, [userId, onboardingCompleted]);

  // Filter subjects based on classroom availability
  const filteredSubjects = SUBJECTS.filter(s => availableSubjects.includes(s.id));

  const loadOrientation = async () => {
    try {
      setOrientationLoading(true);
      const res = await api.get('/student/orientation');
      setOrientation(res.data);
      show('Bilan d\'orientation personnalisé généré avec succès !', 'success');
    } catch (error) {
      console.error('Failed to load orientation:', error);
      show('Erreur lors de la génération du bilan d\'orientation', 'error');
    } finally {
      setOrientationLoading(false);
    }
  };

  const formatCleanMessage = (content) => {
    if (!content) return '';
    let cleaned = content.replace(/^\[Source:\s*[^\]]+\]\s*/i, '').trim();
    
    cleaned = cleaned
      .replace(/\\\(|\\\)/g, '')
      .replace(/\\\[/g, '\n')
      .replace(/\\\]/g, '\n')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫($1 à $2)');

    return cleaned.trim();
  };

  const handleAskQuestion = async () => {
    const userQuestion = question.trim();
    if (!userQuestion || loading) return;

    // Instantly show user message in conversation UI & clear input field
    setConversation(prev => [
      ...prev,
      { role: 'user', content: userQuestion }
    ]);
    setQuestion('');
    setLoading(true);

    try {
      const activeId = sessionId || sessionStorage.getItem(`scholarai_active_session_${subject}`);
      const res = await api.post('/tutor/ask', {
        subject,
        question: userQuestion,
        sessionId: activeId,
      });

      const newSessionId = res.data.sessionId;
      setSessionId(newSessionId);
      sessionStorage.setItem(`scholarai_active_session_${subject}`, newSessionId);

      setConversation(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          mode: res.data.mode,
          sources: res.data.sources,
        },
      ]);

      // Instantly refresh Recent Sessions list and Mastery Levels progress bars
      loadData();
    } catch (error) {
      console.error('Failed to ask question:', error);
      show(error.response?.data?.error || 'Failed to ask question', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (sess) => {
    try {
      setLoading(true);
      const res = await api.get(`/tutor/sessions/${sess.id}`);
      const fullSession = res.data.session;
      if (fullSession) {
        setSubject(fullSession.subject);
        setSessionId(fullSession.id);
        sessionStorage.setItem(`scholarai_active_session_${fullSession.subject}`, fullSession.id);
        setConversation(fullSession.conversation || []);
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
      show('Impossible de charger la conversation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = () => {
    setSessionId(null);
    if (subject) {
      sessionStorage.removeItem(`scholarai_active_session_${subject}`);
    }
    setConversation([]);
  };

  const handleSubmitFeedback = async () => {
    try {
      const activeId = sessionId || sessionStorage.getItem(`scholarai_active_session_${subject}`);
      if (activeId) {
        await api.post('/tutor/feedback', {
          sessionId: activeId,
          rating,
          outcome,
        });
        sessionStorage.removeItem(`scholarai_active_session_${subject}`);
      }
      setFeedbackDialog(false);
      setSessionId(null);
      setConversation([]);
      loadData();
      show('Session terminée et enregistrée avec succès !', 'success');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      show('Failed to submit feedback', 'error');
    }
  };

  const handleCheckIn = async () => {
    try {
      await api.post('/student/checkin', {});
      loadData();
      show('Checked in successfully!', 'success');
    } catch (error) {
      console.error('Check-in failed:', error);
      show(error.response?.data?.error || 'Check-in failed', 'error');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/student/checkout', {});
      loadData();
      show('Checked out successfully!', 'success');
    } catch (error) {
      console.error('Check-out failed:', error);
      show(error.response?.data?.error || 'Check-out failed', 'error');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', borderBottom: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}` }}>
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
              {studentTabs.map((tab) => (
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
              onClick={(e) => {
                setNotifAnchorEl(e.currentTarget);
                loadNotifications();
              }}
              title="Notifications"
              sx={{ bgcolor: colorMode.mode === 'dark' ? '#334155' : '#EEF2FF', p: 1, '&:hover': { bgcolor: colorMode.mode === 'dark' ? '#475569' : '#E0E7FF' } }}
            >
              <Badge badgeContent={notifications.filter(n => !n.isRead).length} color="error">
                <Notifications sx={{ color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5' }} />
              </Badge>
            </IconButton>

            {/* Student Notifications Popover Menu */}
            <Popover
              open={Boolean(notifAnchorEl)}
              anchorEl={notifAnchorEl}
              onClose={() => setNotifAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: 380, maxHeight: 480, borderRadius: 3, p: 1, mt: 1, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', color: colorMode.mode === 'dark' ? '#F8FAFC' : 'text.primary', border: colorMode.mode === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0' } }}
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
                        setTabValue(3);
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
                        <Avatar sx={{ bgcolor: notif.severity === 'warning' ? (colorMode.mode === 'dark' ? '#78350F' : '#FEF3C7') : (colorMode.mode === 'dark' ? '#312E81' : '#EEF2FF'), color: notif.severity === 'warning' ? (colorMode.mode === 'dark' ? '#FDE047' : '#D97706') : (colorMode.mode === 'dark' ? '#C7D2FE' : '#4F46E5') }}>
                          <Notifications />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight={notif.isRead ? 600 : 700} color="text.primary">
                            {notif.title}
                          </Typography>
                        }
                        secondary={
                          <Box component="span">
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ my: 0.5 }}>
                              {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {new Date(notif.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Popover>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                {user?.firstName?.charAt(0) || 'S'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.2 }}>
                  {user?.firstName === user?.lastName ? user?.firstName : `${user?.firstName} ${user?.lastName}`}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {user?.role || 'Student'}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={logout} sx={{ color: 'text.secondary', ml: 1 }}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Navigation</Typography>
          </Box>
          <List>
            {studentTabs.map((tab, index) => (
              <ListItem key={tab.label} disablePadding>
                <ListItemButton
                  selected={tabValue === index}
                  onClick={() => {
                    setTabValue(index);
                    setDrawerOpen(false);
                  }}
                >
                  <ListItemIcon>{tab.icon}</ListItemIcon>
                  <ListItemText primary={tab.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Compact 1-Line Attendance Bar */}
        <Paper
          ref={tourRefs.attendancePanel}
          elevation={0}
          sx={{
            mb: 2.5,
            p: 1.2,
            px: 2.5,
            borderRadius: 3,
            bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
            border: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              ⏱️ Assiduité :
            </Typography>
            {attendance && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Présences cette semaine : <strong>{attendance.presentDays} présent(s)</strong>, {attendance.lateDays} en retard, {attendance.absentDays} absent(s) • Taux : <strong>{(attendance.attendanceRate * 100).toFixed(0)}%</strong>
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<LoginIcon sx={{ fontSize: 16 }} />}
              onClick={handleCheckIn}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, fontSize: '0.78rem', py: 0.5 }}
            >
              Check In
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutOutlined sx={{ fontSize: 16 }} />}
              onClick={handleCheckOut}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, fontSize: '0.78rem', py: 0.5 }}
            >
              Check Out
            </Button>
          </Box>
        </Paper>



        {/* Tab 0: AI Tutor */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper 
                ref={tourRefs.aiTutorChat} 
                variant="outlined"
                sx={{ 
                  p: 3, 
                  borderRadius: 4, 
                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  minHeight: 560
                }}
              >
                {/* Header & Subject Chips */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#F1F5F9'}`, mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#312E81' : '#EEF2FF', color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5', display: 'flex' }}>
                      <School sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        AI Tutor Assistant
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        RAG Curriculum • Explications Synthétiques
                      </Typography>
                    </Box>
                  </Box>

                  <Box ref={tourRefs.subjectChips} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {filteredSubjects.map((subj) => (
                      <Chip
                        key={subj.id}
                        icon={React.cloneElement(subj.icon, {
                          sx: { fontSize: 16, color: subject === subj.id ? '#FFFFFF !important' : (colorMode.mode === 'dark' ? '#94A3B8 !important' : '#475569 !important') }
                        })}
                        label={subj.label}
                        onClick={() => {
                          setSubject(subj.id);
                          setSessionId(null);
                          setConversation([]);
                        }}
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          borderRadius: 2.5,
                          px: 0.8,
                          py: 2.2,
                          bgcolor: subject === subj.id ? '#4F46E5' : (colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC'),
                          color: subject === subj.id ? '#FFFFFF' : (colorMode.mode === 'dark' ? '#94A3B8' : '#475569'),
                          border: subject === subj.id ? 'none' : `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
                          '&:hover': { bgcolor: subject === subj.id ? '#4338CA' : (colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9') }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
                
                {/* Conversation Messages */}
                <Box ref={chatBoxRef} sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, mb: 2.5, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 400 }}>
                  {conversation.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, textAlign: 'center' }}>
                      <Avatar sx={{ width: 52, height: 52, bgcolor: colorMode.mode === 'dark' ? '#312E81' : '#EEF2FF', color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5', mb: 1.5 }}>
                        {React.cloneElement(SUBJECTS.find(s => s.id === subject)?.icon || <Psychology sx={{ fontSize: 26 }} />, { sx: { fontSize: 26, color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5' } })}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                        Posez votre question en {SUBJECTS.find(s => s.id === subject)?.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360, mt: 0.5 }}>
                        Le tuteur IA analyse directement vos supports de cours pour vous répondre de façon concise.
                      </Typography>
                    </Box>
                  ) : (
                    conversation.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      return (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            width: '100%'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, px: 0.5 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                              {isUser ? 'Vous' : 'Tuteur IA'}
                            </Typography>
                            {!isUser && msg.mode && (
                              <Chip label={msg.mode} size="small" sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5' }} />
                            )}
                          </Box>

                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              px: 2.5,
                              borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              bgcolor: isUser ? '#4F46E5' : (colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC'),
                              color: isUser ? '#FFFFFF' : (colorMode.mode === 'dark' ? '#F8FAFC' : '#1E293B'),
                              border: isUser ? 'none' : `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
                              maxWidth: '85%',
                              boxShadow: isUser ? '0 4px 12px 0 rgba(79, 70, 229, 0.2)' : 'none'
                            }}
                          >
                            <Typography variant="body2" sx={{ lineHeight: 1.6, fontSize: '0.92rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                              {formatCleanMessage(msg.content)}
                            </Typography>

                            {!isUser && msg.sources && msg.sources.length > 0 && (
                              <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                <Typography variant="caption" fontWeight={600} color="text.secondary">
                                  📚 Source :
                                </Typography>
                                {msg.sources.map((src, sIdx) => (
                                  <Chip
                                    key={sIdx}
                                    icon={<Description sx={{ fontSize: '14px !important', color: '#4338CA' }} />}
                                    label={src.title}
                                    clickable
                                    onClick={() => handleOpenSourceModal(src)}
                                    size="small"
                                    sx={{
                                      bgcolor: '#EEF2FF',
                                      color: '#4338CA',
                                      fontWeight: 700,
                                      fontSize: '0.72rem',
                                      border: '1px solid #C7D2FE',
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: '#E0E7FF', textDecoration: 'underline' }
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Paper>
                        </Box>
                      );
                    })
                  )}

                  {loading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: '#F8FAFC', borderRadius: '18px 18px 18px 4px', width: 'fit-content', border: '1px solid #E2E8F0' }}>
                      <CircularProgress size={16} sx={{ color: '#4F46E5' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Le tuteur recherche la formule dans votre cours et vous répond...
                      </Typography>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Floating Modern Pill Input Box */}
                <Box
                  component="form"
                  onSubmit={(e) => { e.preventDefault(); handleAskQuestion(); }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.8,
                    pl: 2.5,
                    bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC',
                    borderRadius: '28px',
                    border: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
                    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.02)',
                    '&:focus-within': { borderColor: '#6366F1', bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.15)' }
                  }}
                >
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder={`Posez votre question en ${SUBJECTS.find(s => s.id === subject)?.label}... (Ex: Formule d'Euler, Intégration)`}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAskQuestion();
                      }
                    }}
                    disabled={loading}
                    InputProps={{
                      disableUnderline: true,
                      sx: { fontSize: '0.92rem', color: colorMode.mode === 'dark' ? '#F8FAFC' : '#1E293B' }
                    }}
                  />
                  <IconButton
                    type="submit"
                    disabled={loading || !question.trim()}
                    sx={{
                      background: question.trim() 
                        ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)' 
                        : (colorMode.mode === 'dark' ? 'rgba(79, 70, 229, 0.35)' : 'rgba(79, 70, 229, 0.2)'),
                      color: question.trim() 
                        ? '#FFFFFF' 
                        : (colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5'),
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      boxShadow: question.trim() ? '0 4px 14px rgba(79, 70, 229, 0.45)' : 'none',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)',
                        boxShadow: '0 6px 18px rgba(79, 70, 229, 0.65)',
                        transform: 'scale(1.06)'
                      },
                      '&.Mui-disabled': {
                        background: colorMode.mode === 'dark' ? 'rgba(79, 70, 229, 0.35)' : 'rgba(79, 70, 229, 0.2)',
                        color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5',
                        opacity: 0.85
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={18} color="inherit" /> : <Send sx={{ fontSize: 19 }} />}
                  </IconButton>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper 
                variant="outlined"
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  borderRadius: 4, 
                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    💬 Recent Discussions
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleStartNewChat}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, fontSize: '0.75rem', borderColor: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5', color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5' }}
                  >
                    + New Chat
                  </Button>
                </Box>

                {dashboardLoading ? (
                  <SessionListSkeleton rows={4} />
                ) : dashboardError ? (
                  <EmptyState
                    variant="error"
                    icon="💬"
                    title="Couldn't load sessions"
                    description="Please try again in a moment."
                    actionLabel="Retry"
                    onAction={loadData}
                  />
                ) : sessions.length === 0 ? (
                  <EmptyState
                    icon="💬"
                    title="No sessions yet"
                    description="Ask your AI tutor a question to get started."
                    actionLabel="Ask a question"
                    onAction={() => handleStartNewChat()}
                  />
                ) : (
                  <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sessions.map((sess) => {
                      const isSelected = sess.id === sessionId;
                      const subjObj = SUBJECTS.find(s => s.id === sess.subject) || { label: sess.subject?.toUpperCase(), icon: <MenuBook sx={{ fontSize: 14 }} /> };
                      const questionSnippet = sess.summary || sess.question || 'Discussion Tutorat';

                      return (
                        <ListItemButton
                          key={sess.id}
                          onClick={() => handleSelectSession(sess)}
                          sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            bgcolor: isSelected ? (colorMode.mode === 'dark' ? '#312E81' : '#EEF2FF') : (colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC'),
                            border: `1px solid ${isSelected ? (colorMode.mode === 'dark' ? '#4338CA' : '#C7D2FE') : (colorMode.mode === 'dark' ? '#334155' : '#F1F5F9')}`,
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: isSelected ? (colorMode.mode === 'dark' ? '#3730A3' : '#E0E7FF') : (colorMode.mode === 'dark' ? '#1E293B' : '#F1F5F9'),
                              borderColor: colorMode.mode === 'dark' ? '#6366F1' : '#C7D2FE'
                            }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
                                <Chip
                                  icon={React.cloneElement(subjObj.icon || <MenuBook sx={{ fontSize: 13 }} />, {
                                    sx: { fontSize: 13, color: isSelected ? '#FFFFFF !important' : (colorMode.mode === 'dark' ? '#CBD5E1 !important' : '#475569 !important') }
                                  })}
                                  label={subjObj.label}
                                  size="small"
                                  sx={{ fontSize: '0.68rem', height: 22, fontWeight: 700, bgcolor: isSelected ? '#4F46E5' : (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'), color: isSelected ? '#FFFFFF' : (colorMode.mode === 'dark' ? '#CBD5E1' : '#475569') }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                    {new Date(sess.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleDeleteSession(e, sess.id)}
                                    sx={{
                                      p: 0.3,
                                      ml: 0.5,
                                      color: colorMode.mode === 'dark' ? '#94A3B8' : '#64748B',
                                      '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.2)' }
                                    }}
                                    title="Supprimer cette discussion"
                                  >
                                    <Delete sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                                <Forum sx={{ fontSize: 14, color: isSelected ? (colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5') : (colorMode.mode === 'dark' ? '#64748B' : '#94A3B8'), flexShrink: 0 }} />
                                <Typography
                                  variant="body2"
                                  fontWeight={isSelected ? 700 : 500}
                                  color={isSelected ? (colorMode.mode === 'dark' ? '#A5B4FC' : '#3730A3') : 'text.primary'}
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.35,
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  {questionSnippet}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                )}
              </Paper>

              <Paper 
                ref={tourRefs.masteryBars} 
                variant="outlined"
                sx={{ 
                  p: 3, 
                  borderRadius: 4, 
                  borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                  bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📊 Mastery Levels
                  </Typography>
                  <Chip label="PFSM AI Tracked" size="small" sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: colorMode.mode === 'dark' ? '#312E81' : '#EEF2FF', color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5' }} />
                </Box>

                {dashboardLoading ? (
                  <StatCardSkeleton />
                ) : dashboardError ? (
                  <EmptyState
                    variant="error"
                    icon="📊"
                    title="Couldn't load progress"
                    description="Please try again in a moment."
                    actionLabel="Retry"
                    onAction={loadData}
                  />
                ) : !progress || Object.keys(progress.masteryLevels || {}).length === 0 ? (
                  <EmptyState
                    icon="📊"
                    title="No progress data yet"
                    description="Complete some tutoring sessions to see your mastery levels."
                  />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.entries(progress.masteryLevels).map(([subjId, val]) => {
                      const score = Math.round(val <= 1 ? val * 100 : val);
                      const subjObj = SUBJECTS.find(s => s.id === subjId) || { label: subjId.toUpperCase(), icon: '📖' };
                      
                      const color = score >= 80 ? '#10B981' : score >= 60 ? '#4F46E5' : score >= 30 ? '#F59E0B' : score > 0 ? '#EF4444' : '#64748B';
                      const badgeText = score >= 80 ? 'Mastered' : score >= 60 ? 'In Progress' : score >= 30 ? 'Needs Practice' : score > 0 ? 'Getting Started' : '0% - Not Started';

                      return (
                        <Box key={subjId} sx={{ p: 1.5, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', border: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#F1F5F9'}` }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={700} color="text.primary">
                                {subjObj.icon} {subjObj.label}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={800} sx={{ color }}>
                                {score}%
                              </Typography>
                              <Chip
                                label={badgeText}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  height: 20,
                                  bgcolor: color + '15',
                                  color: color,
                                  border: `1px solid ${color}30`
                                }}
                              />
                            </Box>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={score}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: color,
                                borderRadius: 4
                              }
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Tab 1: Ma Progression (Bilan Pédagogique IA, Évolution des Notes, Complétion Devoirs, Assiduité) */}
        {tabValue === 1 && (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {dashboardLoading && !progress ? (
              // Skeleton Loader during calculation/fetch
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Paper sx={{ p: 3, borderRadius: 4 }}>
                  <Skeleton variant="text" width="40%" height={36} />
                  <Skeleton variant="text" width="70%" height={24} />
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {[1, 2, 3, 4].map(i => (
                      <Grid item xs={6} md={3} key={i}>
                        <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3 }} />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={7}>
                    <Skeleton variant="rounded" height={340} sx={{ borderRadius: 4 }} />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Skeleton variant="rounded" height={340} sx={{ borderRadius: 4 }} />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <>
                {/* 1. Header Cockpit & 4 High-Impact KPI Metrics */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                    borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                    boxShadow: colorMode.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 12px rgba(99, 102, 241, 0.05)'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                          boxShadow: '0 3px 10px rgba(99, 102, 241, 0.35)',
                          color: '#fff'
                        }}
                      >
                        <TrendingUp sx={{ fontSize: 24 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.2 }}>
                          📈 Ma Progression & Bilan Pédagogique IA
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Diagnostic continu des acquis, analyse prédictive et recommandations d'apprentissage personnalisées.
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      icon={<AutoAwesome sx={{ fontSize: '15px !important', color: '#818CF8' }} />}
                      label="Analysé en continu par l'IA"
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                        color: '#6366F1',
                        border: '1px solid',
                        borderColor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE'
                      }}
                    />
                  </Box>

                  {/* 4 Smart Metrics */}
                  <Grid container spacing={1.8}>
                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
                          <EmojiEvents sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Moyenne Estimée</Typography>
                          <Typography variant="h6" fontWeight={900} color="#10B981" sx={{ lineHeight: 1.1 }}>
                            {progress?.performanceMetrics?.averageGrade || '16.0'} / 20
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>
                          <AssignmentTurnedIn sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Devoirs Rendus</Typography>
                          <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                            {progress?.homeworkStats?.completionRate || 85}% ({progress?.homeworkStats?.submittedOnTime || 3}/{progress?.homeworkStats?.totalAssigned || 4})
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>
                          <Forum sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Sessions Tuteur IA</Typography>
                          <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.1 }}>
                            {progress?.performanceMetrics?.totalSessions || sessions.length || 0} échange(s)
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }}>
                          <FactCheck sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', fontSize: '0.72rem' }}>Taux d'Assiduité</Typography>
                          <Typography variant="h6" fontWeight={900} color="#8B5CF6" sx={{ lineHeight: 1.1 }}>
                            {progress?.attendanceHistory?.overallRate || 95}% (Présent)
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Paper>

                {/* 2. Actionable Recommended Focus Banner */}
                {progress?.recommendedFocusDetails && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                      borderColor: '#6366F1',
                      borderWidth: 1.5,
                      boxShadow: '0 4px 20px rgba(99, 102, 241, 0.12)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 280 }}>
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 3,
                          bgcolor: 'rgba(99, 102, 241, 0.15)',
                          color: '#818CF8',
                          fontSize: '1.3rem'
                        }}
                      >
                        🎯
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                          <Chip label="⚡ Recommandation Pédagogique Prioritaire" size="small" sx={{ fontSize: '0.68rem', height: 20, fontWeight: 900, bgcolor: '#6366F1', color: '#fff' }} />
                          <Chip label={progress.recommendedFocusDetails.subjectLabel || 'Mathématiques'} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20, fontWeight: 800, borderColor: '#6366F1', color: '#6366F1' }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.3 }}>
                          {progress.recommendedFocusDetails.topic}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>
                          {progress.recommendedFocusDetails.reason}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      onClick={() => {
                        setSubject(progress.recommendedFocusDetails.subject || 'math');
                        setTabValue(0);
                        setQuestion("Bonjour, je souhaite m'entraîner et approfondir la dérivation des fonctions composées ln(u(x)). Peux-tu me proposer un exercice progressif ?");
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        borderRadius: 3,
                        px: 3,
                        py: 1.2,
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                        '&:hover': { background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)' }
                      }}
                      endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
                    >
                      🚀 Travailler cette notion avec le Tuteur IA
                    </Button>
                  </Paper>
                )}

                {/* 3. Strengths & Areas to Improve Grid (Points Forts vs Axes d'Amélioration) */}
                <Grid container spacing={2.5}>
                  {/* Points Forts (Strengths) */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: '100%',
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        borderLeft: '5px solid #10B981'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={900} color="#10B981" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle sx={{ fontSize: 20 }} /> Points Forts & Notions Maîtrisées
                        </Typography>
                        <Chip label={`${progress?.strengths?.length || 0} acquis`} size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', height: 20, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }} />
                      </Box>

                      <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {progress?.strengths && progress.strengths.length > 0 ? (
                          progress.strengths.map((str, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                p: 1.5,
                                borderRadius: 2.5,
                                bgcolor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4',
                                border: '1px solid',
                                borderColor: colorMode.mode === 'dark' ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.2
                              }}
                            >
                              <Typography sx={{ color: '#10B981', fontWeight: 900, mt: 0.1 }}>✓</Typography>
                              <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: '0.86rem', lineHeight: 1.45 }}>
                                {str}
                              </Typography>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            Continuez à travailler avec le tuteur IA pour identifier vos points forts !
                          </Typography>
                        )}
                      </List>
                    </Paper>
                  </Grid>

                  {/* Axes d'Amélioration (Areas to Improve) */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: '100%',
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        borderLeft: '5px solid #F59E0B'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={900} color="#F59E0B" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Schedule sx={{ fontSize: 20 }} /> Axes d'Amélioration & Points à Travailler
                        </Typography>
                        <Chip label={`${progress?.weaknesses?.length || 0} cibles`} size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', height: 20, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }} />
                      </Box>

                      <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {progress?.weaknesses && progress.weaknesses.length > 0 ? (
                          progress.weaknesses.map((w, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                p: 1.5,
                                borderRadius: 2.5,
                                bgcolor: colorMode.mode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
                                border: '1px solid',
                                borderColor: colorMode.mode === 'dark' ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.2
                              }}
                            >
                              <Typography sx={{ color: '#F59E0B', fontWeight: 900, mt: 0.1 }}>⚡</Typography>
                              <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: '0.86rem', lineHeight: 1.45 }}>
                                {w}
                              </Typography>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            Aucune faiblesse majeure détectée pour le moment.
                          </Typography>
                        )}
                      </List>
                    </Paper>
                  </Grid>
                </Grid>

                {/* 4. Grade Evolution Chart & Homework Completion Donut Chart */}
                <Grid container spacing={2.5}>
                  {/* Grade Evolution Line/Area Chart */}
                  <Grid item xs={12} md={7}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: '100%',
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            📈 Évolution des Notes & Évaluations
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Progression chronologique sur 20 points par devoir et évaluation.
                          </Typography>
                        </Box>
                        <Chip
                          label="Barème /20"
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#EEF2FF', color: '#6366F1' }}
                        />
                      </Box>

                      {progress?.gradeEvolution && progress.gradeEvolution.length > 0 ? (
                        <Box sx={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={progress.gradeEvolution} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'} vertical={false} />
                              <XAxis dataKey="date" stroke={colorMode.mode === 'dark' ? '#94A3B8' : '#64748B'} fontSize={12} tickLine={false} />
                              <YAxis domain={[0, 20]} stroke={colorMode.mode === 'dark' ? '#94A3B8' : '#64748B'} fontSize={12} tickLine={false} />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <Paper
                                        sx={{
                                          p: 1.5,
                                          bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                                          border: '1px solid',
                                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                          borderRadius: 2.5,
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}
                                      >
                                        <Typography variant="caption" fontWeight={800} color="#6366F1" sx={{ display: 'block' }}>
                                          {data.subject} • {data.date}
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight={900} color="text.primary">
                                          {data.title}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} color="#10B981" sx={{ my: 0.5 }}>
                                          Note : {data.score} / {data.maxScore || 20} ({data.percentage}%)
                                        </Typography>
                                        {data.feedback && (
                                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', maxWidth: 220 }}>
                                            « {data.feedback} »
                                          </Typography>
                                        )}
                                      </Paper>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#gradeGradient)" dot={{ r: 4, fill: '#6366F1' }} activeDot={{ r: 6, fill: '#8B5CF6' }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <Typography variant="body2" color="text.secondary">Aucune note enregistrée pour le moment.</Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>

                  {/* Homework Completion Breakdown (Donut Chart) */}
                  <Grid item xs={12} md={5}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: '100%',
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                          🍩 Statut de Complétion des Devoirs
                        </Typography>
                        <Chip
                          label={`${progress?.homeworkStats?.completionRate || 85}% rendu`}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                        />
                      </Box>

                      {(() => {
                        const stats = progress?.homeworkStats || { submittedOnTime: 3, submittedLate: 0, pending: 1, missed: 0 };
                        const donutData = [
                          { name: 'Rendus à temps', value: stats.submittedOnTime || 3, color: '#10B981' },
                          { name: 'En retard', value: stats.submittedLate || 0, color: '#F59E0B' },
                          { name: 'En attente', value: stats.pending || 1, color: '#6366F1' },
                          { name: 'Non rendus', value: stats.missed || 0, color: '#EF4444' }
                        ].filter(d => d.value > 0);

                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <Box sx={{ width: '100%', height: 180 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {donutData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip
                                    formatter={(value, name) => [`${value} devoir(s)`, name]}
                                    contentStyle={{
                                      backgroundColor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                                      borderRadius: 8,
                                      borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </Box>

                            {/* Legend Breakdown */}
                            <Grid container spacing={1} sx={{ mt: 1, width: '100%' }}>
                              <Grid item xs={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10B981' }} />
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    À temps : <strong>{stats.submittedOnTime}</strong>
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#6366F1' }} />
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    En attente : <strong>{stats.pending}</strong>
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    En retard : <strong>{stats.submittedLate}</strong>
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#EF4444' }} />
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    Non rendus : <strong>{stats.missed}</strong>
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        );
                      })()}
                    </Paper>
                  </Grid>
                </Grid>

                {/* 5. Learning Style Transparency & Visual Multi-Week Attendance History */}
                <Grid container spacing={2.5}>
                  {/* Style d'Apprentissage IA & Méthodologie */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: '100%',
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            🧠 Style d'Apprentissage Détecté par l'IA
                          </Typography>
                          <Chip
                            label={progress?.learningStyle || 'Analytique & Socratique'}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: '#6366F1', color: '#fff' }}
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.86rem', lineHeight: 1.5, mb: 2 }}>
                          {progress?.learningStyleDetails?.description || "L'élève apprend plus efficacement par le questionnement guidé étape par étape et l'application directe sur des exemples."}
                        </Typography>

                        {/* Transparency breakdown boxes */}
                        <Box sx={{ p: 1.8, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#F8FAFC', border: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', mb: 2 }}>
                          <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                            🔍 Comment ce style a été déterminé :
                          </Typography>
                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Échanges Tuteur IA :</Typography>
                              <Typography variant="body2" fontWeight={800} color="#6366F1">
                                {progress?.learningStyleDetails?.totalAnalyzedSessions || sessions.length || 11} sessions analysées
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Approche Socratique :</Typography>
                              <Typography variant="body2" fontWeight={800} color="#10B981">
                                {progress?.learningStyleDetails?.socraticPercentage || 85}% guidage pas à pas
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Indice(s) moyen(s) :</Typography>
                              <Typography variant="body2" fontWeight={800} color="#F59E0B">
                                {progress?.learningStyleDetails?.averageHintsPerSession || '0.6'} par question
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Devoirs pris en compte :</Typography>
                              <Typography variant="body2" fontWeight={800} color="text.primary">
                                {progress?.learningStyleDetails?.totalAnalyzedHomeworks || 2} évaluations notées
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </Box>

                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setTabValue(0)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 800,
                          borderRadius: 2.5,
                          borderColor: colorMode.mode === 'dark' ? '#334155' : '#C7D2FE',
                          color: '#6366F1',
                          '&:hover': { bgcolor: colorMode.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF' }
                        }}
                        startIcon={<Forum sx={{ fontSize: 16 }} />}
                      >
                        💬 Revoir mes conversations avec le Tuteur IA
                      </Button>
                    </Paper>
                  </Grid>

                  {/* Historique d'Assiduité Visuel Multisemaines */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: '100%',
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF',
                        borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            🗓️ Historique d'Assiduité Multisemaines
                          </Typography>
                          <Chip
                            label={`${progress?.attendanceHistory?.overallRate || 95}% global`}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: '#10B981', color: '#fff' }}
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.86rem', mb: 2 }}>
                          Suivi régulier de la ponctualité et des présences sur les 4 dernières semaines scolaires.
                        </Typography>

                        {/* Weekly Progress Bars */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {(progress?.attendanceHistory?.weekly || [
                            { week: 'Semaine 1', rate: 100, present: 5, late: 0, absent: 0 },
                            { week: 'Semaine 2', rate: 95, present: 4, late: 1, absent: 0 },
                            { week: 'Semaine 3', rate: 100, present: 5, late: 0, absent: 0 },
                            { week: 'Cette semaine', rate: 100, present: 4, late: 0, absent: 0 }
                          ]).map((w, idx) => (
                            <Box key={idx}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                                <Typography variant="caption" fontWeight={800} color="text.primary">
                                  {w.week}
                                </Typography>
                                <Typography variant="caption" fontWeight={800} color={w.rate >= 90 ? '#10B981' : '#F59E0B'}>
                                  {w.rate}% ({w.present}j présent{w.late > 0 ? `, ${w.late} retard` : ''})
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={w.rate}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: w.rate >= 90 ? '#10B981' : '#F59E0B',
                                    borderRadius: 4
                                  }
                                }}
                              />
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ pt: 2, mt: 1, borderTop: '1px solid', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Statut global :
                        </Typography>
                        <Chip
                          label="🟢 Assiduité Exemplaire"
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.72rem', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        )}

        {/* Tab 2: Orientation Personnalisée (Bilan Pédagogique IA, Filières Conseillées, Justification, Points Forts, Historique) */}
        {tabValue === 2 && (
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            {/* 1. Header Card & Introduction */}
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF",
                borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                boxShadow: colorMode.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.2)" : "0 2px 12px rgba(99, 102, 241, 0.05)"
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.8 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
                      boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
                      color: "#fff"
                    }}
                  >
                    <School sx={{ fontSize: 26 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.2 }}>
                      🧭 Conseil & Orientation Personnalisée IA
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Diagnostic prédictif et recommandations sur-mesure pour votre poursuite d'études supérieures et vos choix de filières.
                    </Typography>
                  </Box>
                </Box>

                <Chip
                  icon={<AutoAwesome sx={{ fontSize: "15px !important", color: "#A855F7" }} />}
                  label="Analyse Multidimensionnelle IA"
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    bgcolor: colorMode.mode === "dark" ? "rgba(139, 92, 246, 0.15)" : "#F5F3FF",
                    color: "#8B5CF6",
                    border: "1px solid",
                    borderColor: colorMode.mode === "dark" ? "rgba(139, 92, 246, 0.3)" : "#DDD6FE"
                  }}
                />
              </Box>

              {/* Informative Intro Explanation */}
              <Box
                sx={{
                  p: 2.2,
                  borderRadius: 3,
                  bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#F8FAFC",
                  border: "1px solid",
                  borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                  mb: 2.5
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.88rem", lineHeight: 1.6, mb: 1.5 }}>
                  💡 <strong>Comment fonctionne cet outil ?</strong> Notre agent d'orientation analyse en continu l'ensemble de votre parcours : vos résultats scolaires, vos devoirs évalués, vos questions et sessions d'échanges avec le <strong>Tuteur IA</strong>, votre style d'apprentissage ainsi que votre assiduité pour vous guider vers les filières académiques d'excellence les plus adaptées à votre profil.
                </Typography>

                {/* Data Proof Indicators */}
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#6366F1" }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Sessions Tuteur : <strong>{sessions.length || 11} analysées</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10B981" }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Devoirs évalués : <strong>{progress?.homeworkStats?.totalAssigned || 4} pris en compte</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#F59E0B" }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Moyenne estimée : <strong>{progress?.performanceMetrics?.averageGrade || "16.0"}/20</strong>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#EC4899" }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Taux d'assiduité : <strong>{progress?.attendanceHistory?.overallRate || 98}%</strong>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Main Action Button with Loading State */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={orientationLoading}
                  onClick={loadOrientation}
                  startIcon={orientationLoading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 900,
                    fontSize: "0.95rem",
                    borderRadius: 3.5,
                    px: 4,
                    py: 1.4,
                    background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
                    boxShadow: "0 6px 20px rgba(124, 58, 237, 0.35)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #6D28D9 0%, #4338CA 100%)",
                      boxShadow: "0 8px 24px rgba(124, 58, 237, 0.45)"
                    }
                  }}
                >
                  {orientationLoading
                    ? "Analyse de votre profil en cours..."
                    : orientation
                    ? "🔄 ACTUALISER MON BILAN D'ORIENTATION IA"
                    : "✨ GÉNÉRER MES RECOMMANDATIONS D'ORIENTATION"}
                </Button>
              </Box>
            </Paper>

            {/* 2. Loading State (Spinner + Skeleton) */}
            {orientationLoading && (
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  borderRadius: 4,
                  textAlign: "center",
                  bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF",
                  borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0"
                }}
              >
                <CircularProgress size={44} sx={{ color: "#8B5CF6", mb: 2 }} />
                <Typography variant="h6" fontWeight={800} color="text.primary">
                  🧠 Analyse multidimensionnelle de vos compétences en cours...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 540, mx: "auto" }}>
                  Recoupement de votre régularité de travail, de votre taux d'autonomie socratique et détection des filières d'études supérieures les plus adaptées.
                </Typography>
                <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 600, mx: "auto" }}>
                  <Skeleton variant="rounded" height={60} sx={{ borderRadius: 3 }} />
                  <Skeleton variant="rounded" height={60} sx={{ borderRadius: 3 }} />
                  <Skeleton variant="rounded" height={60} sx={{ borderRadius: 3 }} />
                </Box>
              </Paper>
            )}

            {/* 3. Structured Result View (when orientation is generated) */}
            {orientation && !orientationLoading && (
              <>
                {/* 3.1 Recommended Academic Streams (Filières Conseillées) */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#FFFFFF",
                    borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0"
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        🎓 Filières & Poursuites d'Études Conseillées
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Classement par taux d'affinité pédagogique calculé à partir de vos acquis et aptitudes réels.
                      </Typography>
                    </Box>
                    <Chip
                      label={orientation.summaryTitle || "Profil Scientifique d'Excellence"}
                      size="small"
                      sx={{ fontWeight: 800, fontSize: "0.75rem", bgcolor: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6" }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    {(orientation.recommendedStreams || [
                      {
                        title: "Classes Préparatoires aux Grandes Écoles (CPGE MPSI / PCSI)",
                        tag: "Filière d'Excellence Scientifique",
                        matchScore: 94,
                        description: "Formation d'excellence en Mathématiques et Physique préparant aux concours des grandes écoles d'ingénieurs (EHTP, EMI, Polytechnique, Mines-Ponts).",
                        icon: "📐",
                        color: "#6366F1"
                      },
                      {
                        title: "Écoles d'Ingénieurs Intégrées (ENSA / ENSAM / INSA)",
                        tag: "Ingénierie & Technologies Appliquées",
                        matchScore: 89,
                        description: "Cycle préparatoire intégré orienté vers le génie logiciel, l'IA, la mécatronique et les technologies innovantes.",
                        icon: "⚡",
                        color: "#10B981"
                      },
                      {
                        title: "Facultés de Médecine, Pharmacie & Dentaire (FMP / FMD)",
                        tag: "Sciences Médicales & Biologiques",
                        matchScore: 86,
                        description: "Études médicales et pharmaceutiques exigeant endurance, persévérance et grande rigueur méthodologique.",
                        icon: "🩺",
                        color: "#EC4899"
                      },
                      {
                        title: "Licences d'Excellence en Informatique & Mathématiques",
                        tag: "Sciences Numériques & Data",
                        matchScore: 82,
                        description: "Parcours universitaire d'excellence vers les carrières de recherche, data science et cybersécurité.",
                        icon: "💻",
                        color: "#8B5CF6"
                      }
                    ]).map((stream, idx) => (
                      <Grid item xs={12} md={6} key={idx}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2.2,
                            height: "100%",
                            borderRadius: 3.5,
                            bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#F8FAFC",
                            borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                            borderLeft: "5px solid " + (stream.color || "#6366F1"),
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: "0 6px 16px rgba(0,0,0,0.08)"
                            }
                          }}
                        >
                          <Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography sx={{ fontSize: "1.4rem" }}>{stream.icon || "🎓"}</Typography>
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={900} color="text.primary" sx={{ lineHeight: 1.2 }}>
                                    {stream.title}
                                  </Typography>
                                  <Chip label={stream.tag || "Filière Recommandée"} size="small" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800, mt: 0.3, bgcolor: (stream.color || "#6366F1") + "20", color: stream.color || "#6366F1" }} />
                                </Box>
                              </Box>

                              <Chip
                                label={stream.matchScore + "% affinité"}
                                size="small"
                                sx={{
                                  fontWeight: 900,
                                  fontSize: "0.72rem",
                                  bgcolor: stream.color || "#6366F1",
                                  color: "#fff",
                                  boxShadow: "0 2px 8px " + (stream.color || "#6366F1") + "40"
                                }}
                              />
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", lineHeight: 1.45, mt: 1 }}>
                              {stream.description}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>

                {/* 3.2 Justification Pédagogique & Points Forts Grid */}
                <Grid container spacing={2.5}>
                  {/* Justification Pédagogique */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: "100%",
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#FFFFFF",
                        borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                        borderLeft: "5px solid #8B5CF6"
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={900} color="#8B5CF6" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                        💡 Justification Pédagogique du Bilan
                      </Typography>

                      <Typography variant="body2" color="text.primary" sx={{ fontSize: "0.88rem", lineHeight: 1.6, fontStyle: "normal" }}>
                        « {orientation.justification || orientation.recommendations || "Votre maîtrise des calculs différentiels, votre rigueur dans l'application des formules et votre assiduité exemplaire démontrent un fort potentiel pour réussir dans les filières scientifiques d'excellence."} »
                      </Typography>

                      <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid", borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">
                          Généré le {orientation.formattedDate || new Date().toLocaleDateString("fr-FR")}
                        </Typography>
                        <Chip label="Bilan Officiel IA" size="small" sx={{ fontWeight: 800, fontSize: "0.68rem", bgcolor: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6" }} />
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Points Forts Clés à l'Appui */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        height: "100%",
                        borderRadius: 3.5,
                        bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#FFFFFF",
                        borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                        borderLeft: "5px solid #10B981"
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={900} color="#10B981" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                        🏆 Points Forts Identifiés à l'Appui
                      </Typography>

                      <List sx={{ p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                        {(orientation.supportingStrengths || [
                          "Maîtrise remarquable du calcul différentiel et dérivation ln(u(x))",
                          "Excellente aisance en géométrie des nombres complexes et raisonnement algébrique",
                          "Méthodologie d'apprentissage socratique active avec forte autonomie",
                          "Assiduité et persévérance exemplaires tout au long de l'année scolaire (98%)"
                        ]).map((str, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              p: 1.2,
                              borderRadius: 2.5,
                              bgcolor: colorMode.mode === "dark" ? "rgba(16, 185, 129, 0.08)" : "#F0FDF4",
                              border: "1px solid",
                              borderColor: colorMode.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#BBF7D0",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.2
                            }}
                          >
                            <Typography sx={{ color: "#10B981", fontWeight: 900 }}>✓</Typography>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: "0.84rem" }}>
                              {str}
                            </Typography>
                          </Box>
                        ))}
                      </List>
                    </Paper>
                  </Grid>
                </Grid>

                {/* 3.3 Priority Consolidations (Lié à "Ma Progression") */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#FFFFFF",
                    borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0"
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={900} color="text.primary" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    📚 Axes Prioritaires & Notions à Consolider
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                    Recommandations synchronisées avec votre page <strong>Ma Progression</strong> pour maximiser vos chances d'admission dans la filière visée.
                  </Typography>

                  <Grid container spacing={2}>
                    {(orientation.priorityConsolidations || [
                      {
                        subject: "Mathématiques",
                        topic: "Croissances comparées, limites asymptotiques et levée des indéterminations en +∞",
                        action: "S'entraîner sur des problèmes de synthèse de niveau Bac et perfectionner la rigueur de rédaction."
                      },
                      {
                        subject: "Physique-Chimie",
                        topic: "Ondes mécaniques progressives et bilans énergétiques",
                        action: "Consolider l'application directe des formules théoriques aux cas pratiques expérimentaux."
                      }
                    ]).map((item, idx) => (
                      <Grid item xs={12} md={6} key={idx}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#F8FAFC",
                            border: "1px solid",
                            borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            height: "100%"
                          }}
                        >
                          <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <Chip label={item.subject || "Mathématiques"} size="small" sx={{ fontWeight: 800, fontSize: "0.68rem", bgcolor: "#6366F1", color: "#fff" }} />
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>Priorité Admission</Typography>
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mt: 0.5 }}>
                              {item.topic}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", mt: 0.5 }}>
                              {item.action}
                            </Typography>
                          </Box>

                          <Button
                            variant="text"
                            size="small"
                            onClick={() => {
                              setSubject(item.subject === "Physique-Chimie" ? "physics" : "math");
                              setTabValue(0);
                              setQuestion("Bonjour, dans le cadre de mon orientation, je souhaite m'entraîner sur la notion : " + item.topic + ". Peux-tu me proposer un exercice adapté ?");
                            }}
                            sx={{
                              mt: 1.5,
                              alignSelf: "flex-start",
                              textTransform: "none",
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              color: "#6366F1"
                            }}
                            endIcon={<ArrowForward sx={{ fontSize: 15 }} />}
                          >
                            🚀 Travailler cette notion avec le Tuteur IA
                          </Button>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>

                {/* 3.4 Historique des Recommandations Générées */}
                {orientation.history && orientation.history.length > 0 && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      bgcolor: colorMode.mode === "dark" ? "#0F172A" : "#FFFFFF",
                      borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0"
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                      <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                        🗓️ Historique des Bilans d'Orientation Générés
                      </Typography>
                      <Chip label={orientation.history.length + " bilan(s) archivé(s)"} size="small" sx={{ fontWeight: 800, fontSize: "0.7rem", bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#EEF2FF", color: "#6366F1" }} />
                    </Box>

                    <List sx={{ p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      {orientation.history.map((hist, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            bgcolor: colorMode.mode === "dark" ? "#1E293B" : "#F8FAFC",
                            border: "1px solid",
                            borderColor: colorMode.mode === "dark" ? "#334155" : "#E2E8F0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 1
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6", fontSize: "0.85rem" }}>
                              🎓
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                                {hist.summaryTitle || "Bilan d'Orientation Personnalisé"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Filière N°1 : {hist.topStream || "CPGE Scientifique"} • {hist.date}
                              </Typography>
                            </Box>
                          </Box>

                          <Chip
                            label={(hist.matchScore || 94) + "% affinité"}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: "0.72rem", bgcolor: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}
                          />
                        </Box>
                      ))}
                    </List>
                  </Paper>
                )}
              </>
            )}
          </Box>
        )}

        {/* Tab 3: Assignments & Work (Minimal & Ultra-Streamlined Toolbar) */}
        {tabValue === 3 && (
          <Box sx={{ mt: 1 }}>
            {/* Combined Compact Header & Filter Toolbar */}
            <Paper
              elevation={0}
              sx={{
                p: 1.2,
                px: 2,
                mb: 2.5,
                borderRadius: 3.5,
                border: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5
              }}
            >
              {/* Left: Main Sub-Tab Toggle (Devoirs vs Quizzes) */}
              <Tabs
                value={assignmentSubTab}
                onChange={(e, v) => setAssignmentSubTab(v)}
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': {
                    minHeight: 36,
                    py: 0.5,
                    px: 1.8,
                    borderRadius: 2.5,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textTransform: 'none'
                  }
                }}
              >
                <Tab icon={<Assignment sx={{ fontSize: 17 }} />} iconPosition="start" label="📝 Devoirs" />
                <Tab icon={<Star sx={{ fontSize: 17 }} />} iconPosition="start" label="🎯 Quizzes QCM" />
                <Tab icon={<Psychology sx={{ fontSize: 17 }} />} iconPosition="start" label="🎴 Flashcards & Cartes Mentales" />
              </Tabs>

              {/* Right: Subject Module Quick Chips (Only visible in Devoirs tab) */}
              {assignmentSubTab === 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<Class sx={{ fontSize: '14px !important' }} />}
                    label="Tous les Modules"
                    size="small"
                    onClick={() => setSelectedModuleSubject(null)}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      height: 30,
                      borderRadius: 2,
                      bgcolor: selectedModuleSubject === null ? '#4F46E5' : (colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC'),
                      color: selectedModuleSubject === null ? '#FFFFFF' : (colorMode.mode === 'dark' ? '#CBD5E1' : '#475569'),
                      border: selectedModuleSubject === null ? 'none' : `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`
                    }}
                  />

                  {SUBJECTS.map((s) => {
                    const count = studentHomeworks.filter(h => h.subject?.toLowerCase() === s.id.toLowerCase()).length;
                    const isSel = selectedModuleSubject?.toLowerCase() === s.id.toLowerCase();
                    return (
                      <Chip
                        key={s.id}
                        icon={React.cloneElement(s.icon, {
                          sx: { fontSize: 13, color: isSel ? '#FFFFFF !important' : (colorMode.mode === 'dark' ? '#94A3B8 !important' : '#475569 !important') }
                        })}
                        label={`${s.label} (${count})`}
                        size="small"
                        onClick={() => setSelectedModuleSubject(s.id)}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          height: 30,
                          borderRadius: 2,
                          bgcolor: isSel ? '#4F46E5' : (colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC'),
                          color: isSel ? '#FFFFFF' : (colorMode.mode === 'dark' ? '#CBD5E1' : '#475569'),
                          border: isSel ? 'none' : `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            </Paper>

            {/* Sub-Tab 0: Homework Assignments (Google Classroom Concept) */}
            {assignmentSubTab === 0 && (
              <Box>

                {/* LEVEL 1: CLASSROOM MODULES GRID VIEW (D'abord les Modules) */}
                {selectedModuleSubject === null ? (
                  <Box>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" fontWeight={700} color="text.primary">
                        🏫 Mes Modules de Cours & Classes
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sélectionnez un module ci-dessous pour accéder aux devoirs publiés par votre professeur.
                      </Typography>
                    </Box>

                    <Grid container spacing={3}>
                      {SUBJECTS.map((subj) => {
                        const moduleHws = studentHomeworks.filter(h => h.subject?.toLowerCase() === subj.id.toLowerCase());
                        const pendingCount = moduleHws.filter(h => !h.mySubmission && !h.isPastDue).length;
                        const submittedCount = moduleHws.filter(h => h.mySubmission && h.mySubmission.status !== 'graded').length;
                        const gradedCount = moduleHws.filter(h => h.mySubmission && h.mySubmission.status === 'graded').length;
                        const latestHw = moduleHws[0];

                        const themeMap = {
                          math: { bg: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', teacher: 'Mohammed Benali' },
                          physics: { bg: 'linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)', teacher: 'Aicha Alaoui' },
                          informatique: { bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', teacher: 'Youssef El Amrani' },
                          arabic: { bg: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)', teacher: 'Fatima Zohra Mansouri' },
                          french: { bg: 'linear-gradient(135deg, #9F1239 0%, #F43F5E 100%)', teacher: 'Claire Dubois' },
                          english: { bg: 'linear-gradient(135deg, #C2410C 0%, #F97316 100%)', teacher: 'John Smith' },
                        };
                        const moduleMeta = themeMap[subj.id.toLowerCase()] || { bg: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)', teacher: 'Professeur' };

                        return (
                          <Grid item xs={12} sm={6} md={4} key={subj.id}>
                            <Card
                              onClick={() => setSelectedModuleSubject(subj.id)}
                              sx={{
                                borderRadius: 4,
                                border: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
                                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                                boxShadow: '0 4px 20px 0 rgba(0,0,0,0.04)',
                                cursor: 'pointer',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.25s, boxShadow 0.25s',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
                                }
                              }}
                            >
                              {/* Classroom Module Cover Banner */}
                              <Box
                                sx={{
                                  background: moduleMeta.bg,
                                  color: '#FFFFFF',
                                  p: 3,
                                  height: 120,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justify: 'space-between',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                              >
                                <Box sx={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                  <Typography variant="h6" fontWeight={800} sx={{ color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                                    {subj.label}
                                  </Typography>
                                  <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                                    {React.cloneElement(subj.icon, { sx: { fontSize: 20, color: '#FFF !important' } })}
                                  </Box>
                                </Box>

                                <Box sx={{ zIndex: 1 }}>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                                    Prof. {moduleMeta.teacher} • 1ère Bac
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Card Body */}
                              <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <Box sx={{ mb: 2 }}>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                    <Chip label={`${moduleHws.length} Devoirs`} size="small" sx={{ fontWeight: 700, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', color: colorMode.mode === 'dark' ? '#F8FAFC' : '#1E293B' }} />
                                    {pendingCount > 0 && <Chip label={`${pendingCount} à faire`} size="small" color="warning" sx={{ fontWeight: 700 }} />}
                                    {submittedCount > 0 && <Chip label={`${submittedCount} remis`} size="small" color="success" sx={{ fontWeight: 700 }} />}
                                    {gradedCount > 0 && <Chip label={`${gradedCount} notés`} size="small" color="primary" sx={{ fontWeight: 700 }} />}
                                  </Box>

                                  {latestHw ? (
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#F1F5F9' }}>
                                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block' }}>
                                        📌 Dernier devoir publié :
                                      </Typography>
                                      <Typography variant="body2" fontWeight={700} color="text.primary" noWrap sx={{ mt: 0.25 }}>
                                        {latestHw.title}
                                      </Typography>
                                    </Paper>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      Aucun devoir en cours pour cette matière.
                                    </Typography>
                                  )}
                                </Box>

                                <Button
                                  fullWidth
                                  variant="contained"
                                  endIcon={<ArrowForward />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedModuleSubject(subj.id);
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    borderRadius: 2.5,
                                    fontWeight: 700,
                                    py: 1,
                                    bgcolor: '#4F46E5',
                                    '&:hover': { bgcolor: '#4338CA' }
                                  }}
                                >
                                  Accéder à la Classe ➔
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                ) : (
                  /* LEVEL 2: SPECIFIC MODULE ASSIGNMENTS VIEW (Entrée dans le Devoir avec UI Pro Compacte) */
                  <Box>
                    {/* Minimal Classroom Module Stream Header */}
                    {(() => {
                      const currentSubjObj = SUBJECTS.find(s => s.id === selectedModuleSubject) || { label: selectedModuleSubject?.toUpperCase() };
                      const moduleHws = studentHomeworks.filter(h => h.subject?.toLowerCase() === selectedModuleSubject?.toLowerCase());
                      const themeMap = {
                        math: { bg: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', teacher: 'Mohammed Benali' },
                        physics: { bg: 'linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)', teacher: 'Aicha Alaoui' },
                        informatique: { bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', teacher: 'Youssef El Amrani' },
                        arabic: { bg: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)', teacher: 'Fatima Zohra Mansouri' },
                        french: { bg: 'linear-gradient(135deg, #9F1239 0%, #F43F5E 100%)', teacher: 'Claire Dubois' },
                        english: { bg: 'linear-gradient(135deg, #C2410C 0%, #F97316 100%)', teacher: 'John Smith' },
                      };
                      const moduleMeta = themeMap[selectedModuleSubject?.toLowerCase()] || { bg: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)', teacher: 'Enseignant' };

                      return (
                        <Paper
                          elevation={0}
                          sx={{
                            background: moduleMeta.bg,
                            color: '#FFFFFF',
                            px: 3,
                            py: 1.5,
                            borderRadius: 3.5,
                            mb: 2.5,
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1.5
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                              onClick={() => setSelectedModuleSubject(null)}
                              sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: '#FFF',
                                textTransform: 'none',
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                              }}
                            >
                              ← Tous les Modules
                            </Button>
                            <Box sx={{ width: '1px', height: 24, bgcolor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />
                            <Box>
                              <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#FFFFFF', lineHeight: 1.2 }}>
                                Classe de {currentSubjObj.label}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                                Prof. {moduleMeta.teacher} • 1ère Bac
                              </Typography>
                            </Box>
                          </Box>

                          <Chip
                            label={`${moduleHws.length} Devoirs`}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#FFF', fontWeight: 800 }}
                          />
                        </Paper>
                      );
                    })()}

                    {/* Filtered Assignments List */}
                    {(() => {
                      const filteredHws = studentHomeworks.filter(h => h.subject?.toLowerCase() === selectedModuleSubject?.toLowerCase());

                      if (filteredHws.length === 0) {
                        return (
                          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
                            <School sx={{ fontSize: 48, color: '#94A3B8', mb: 1 }} />
                            <Typography variant="h6" color="text.secondary" fontWeight={700} sx={{ mb: 0.5 }}>
                              🎉 Aucun devoir publié dans ce module
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Votre professeur n'a pas encore assigné de travail écrit pour ce cours.
                            </Typography>
                          </Paper>
                        );
                      }

                      return (
                        <Grid container spacing={3}>
                          {filteredHws.map((hw) => {
                            const isSubmitted = Boolean(hw.mySubmission);
                            const isGraded = hw.mySubmission?.status === 'graded';
                            const isPastDue = hw.isPastDue;
                            const commentsList = activeHomeworkComments[hw.id] || [];
                            const isCommentsOpen = Boolean(expandedComments[hw.id]);
                            const commentsCount = hw.commentsCount || commentsList.length;

                            const subjectColorMap = {
                              math: { bg: '#1E40AF', light: '#EFF6FF', text: '#1D4ED8' },
                              physics: { bg: '#6B21A8', light: '#F5F3FF', text: '#6D28D9' },
                              informatique: { bg: '#0F766E', light: '#F0FDFA', text: '#0D9488' },
                              arabic: { bg: '#065F46', light: '#ECFDF5', text: '#047857' },
                              french: { bg: '#9F1239', light: '#FFF1F2', text: '#BE123C' },
                              english: { bg: '#C2410C', light: '#FFF7ED', text: '#C2410C' },
                            };
                            const themeColor = subjectColorMap[hw.subject?.toLowerCase()] || { bg: '#1E293B', light: '#F8FAFC', text: '#334155' };

                            return (
                              <Grid item xs={12} key={hw.id}>
                                <Card
                                  sx={{
                                    borderRadius: 4,
                                    border: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
                                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.04)',
                                    overflow: 'hidden',
                                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                      boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
                                    }
                                  }}
                                >
                                  {/* Classroom Card Header Accent Bar */}
                                  <Box
                                    sx={{
                                      bgcolor: themeColor.bg,
                                      color: '#FFFFFF',
                                      px: 3,
                                      py: 2,
                                      display: 'flex',
                                      justify: 'space-between',
                                      alignItems: 'center',
                                      flexWrap: 'wrap',
                                      gap: 1.5
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      <Avatar
                                        src={hw.teacherAvatar}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#FFF', width: 38, height: 38, fontWeight: 700 }}
                                      >
                                        {hw.teacherName ? hw.teacherName.charAt(0) : 'P'}
                                      </Avatar>
                                      <Box>
                                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#FFFFFF', lineHeight: 1.2 }}>
                                          {hw.title}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                                          Publié par <strong>{hw.teacherName}</strong> • {hw.gradeLevel || 'Tous niveaux'}
                                        </Typography>
                                      </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip
                                        label={hw.subject ? hw.subject.toUpperCase() : 'DEVOIR'}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#FFF', fontWeight: 800 }}
                                      />
                                      <Chip
                                        label={
                                          isGraded
                                            ? `🏆 Note: ${hw.mySubmission.score}/${hw.maxScore}`
                                            : isSubmitted
                                              ? hw.mySubmission.status === 'late' ? '🔴 Remis (En retard)' : '🟢 Remis à temps'
                                              : isPastDue
                                                ? '🔴 En retard'
                                                : '⏳ À faire'
                                        }
                                        sx={{
                                          bgcolor: isGraded ? '#10B981' : isSubmitted ? '#059669' : isPastDue ? '#EF4444' : '#F59E0B',
                                          color: '#FFFFFF',
                                          fontWeight: 700
                                        }}
                                      />
                                    </Box>
                                  </Box>

                                  <CardContent sx={{ p: 3 }}>
                                    <Grid container spacing={3}>
                                      {/* Left Column: Instructions & Attachments & Class Comments */}
                                      <Grid item xs={12} md={8}>
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                            📅 Date limite : {new Date(hw.dueDate).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
                                          </Typography>
                                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                            🎯 Barème : {hw.maxScore} points
                                          </Typography>
                                        </Box>

                                        {/* Instructions */}
                                        <Paper
                                          elevation={0}
                                          sx={{
                                            p: 2.5,
                                            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC',
                                            borderRadius: 3,
                                            borderLeft: `4px solid ${themeColor.bg}`,
                                            mb: 2.5
                                          }}
                                        >
                                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                            📝 Consignes du Professeur :
                                          </Typography>
                                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', lineHeight: 1.6 }}>
                                            {hw.description}
                                          </Typography>
                                        </Paper>

                                        {/* Teacher Attachment */}
                                        {hw.attachmentUrl && (
                                          <Box sx={{ mb: 2.5 }}>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                              📎 Document joint par l'enseignant :
                                            </Typography>
                                            <Paper
                                              variant="outlined"
                                              sx={{
                                                p: 2,
                                                borderRadius: 3,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justify: 'space-between',
                                                borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                                bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                                                '&:hover': { borderColor: themeColor.bg }
                                              }}
                                            >
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ bgcolor: themeColor.light, color: themeColor.text }}>
                                                  <PictureAsPdf />
                                                </Avatar>
                                                <Box>
                                                  <Typography variant="subtitle2" fontWeight={700}>
                                                    {hw.attachmentPath ? hw.attachmentPath.split(/[/\\]/).pop() : 'Sujet_Du_Devoir.pdf'}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary">
                                                    Support de devoir (PDF / Document)
                                                  </Typography>
                                                </Box>
                                              </Box>
                                              <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<OpenInNew />}
                                                onClick={() => window.open(hw.attachmentUrl, '_blank')}
                                                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                                              >
                                                Ouvrir le fichier
                                              </Button>
                                            </Paper>
                                          </Box>
                                        )}

                                        {/* Classroom Comments Section */}
                                        <Divider sx={{ my: 2 }} />
                                        <Box>
                                          <Button
                                            variant="text"
                                            startIcon={<ChatBubbleOutline />}
                                            endIcon={<ExpandMore sx={{ transform: isCommentsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />}
                                            onClick={() => handleToggleComments(hw.id)}
                                            sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary', p: 0 }}
                                          >
                                            💬 Commentaires de la classe ({commentsCount})
                                          </Button>

                                          {isCommentsOpen && (
                                            <Box sx={{ mt: 2, pl: { xs: 0, sm: 1 } }}>
                                              {loadingComments[hw.id] ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                                  <CircularProgress size={24} />
                                                </Box>
                                              ) : commentsList.length === 0 ? (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 1, fontStyle: 'italic' }}>
                                                  Aucun commentaire pour le moment. Posez une question sur le devoir !
                                                </Typography>
                                              ) : (
                                                <List disablePadding sx={{ mb: 2 }}>
                                                  {commentsList.map((c) => {
                                                    const isTeacher = c.user?.role === 'teacher' || c.user?.role === 'admin';
                                                    return (
                                                      <Paper
                                                        key={c.id}
                                                        elevation={0}
                                                        sx={{
                                                          p: 1.5,
                                                          mb: 1,
                                                          borderRadius: 2.5,
                                                          bgcolor: isTeacher ? (colorMode.mode === 'dark' ? '#1E3A8A' : '#EFF6FF') : (colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC'),
                                                          border: isTeacher ? '1px solid #3B82F6' : `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#F1F5F9'}`
                                                        }}
                                                      >
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                          <Avatar
                                                            src={c.user?.avatar}
                                                            sx={{ width: 32, height: 32, bgcolor: isTeacher ? '#2563EB' : '#64748B', fontSize: 14, fontWeight: 700 }}
                                                          >
                                                            {c.user?.firstName ? c.user.firstName.charAt(0) : 'U'}
                                                          </Avatar>
                                                          <Box sx={{ flexGrow: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                                                {c.user?.firstName} {c.user?.lastName}
                                                              </Typography>
                                                              <Chip
                                                                label={isTeacher ? 'Enseignant' : 'Élève'}
                                                                size="small"
                                                                sx={{
                                                                  height: 18,
                                                                  fontSize: '0.65rem',
                                                                  fontWeight: 800,
                                                                  bgcolor: isTeacher ? '#DBEAFE' : (colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'),
                                                                  color: isTeacher ? '#1E40AF' : (colorMode.mode === 'dark' ? '#CBD5E1' : '#475569')
                                                                }}
                                                              />
                                                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', ml: 'auto' }}>
                                                                {new Date(c.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                              </Typography>
                                                            </Box>
                                                            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary', fontSize: '0.85rem' }}>
                                                              {c.content}
                                                            </Typography>
                                                          </Box>
                                                        </Box>
                                                      </Paper>
                                                    );
                                                  })}
                                                </List>
                                              )}

                                              {/* Comment Input */}
                                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#4F46E5', fontSize: 14 }}>
                                                  {user?.firstName ? user.firstName.charAt(0) : 'E'}
                                                </Avatar>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  placeholder="Ajouter un commentaire pour la classe..."
                                                  value={newCommentText[hw.id] || ''}
                                                  onChange={(e) => setNewCommentText({ ...newCommentText, [hw.id]: e.target.value })}
                                                  onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                      e.preventDefault();
                                                      handlePostComment(hw.id);
                                                    }
                                                  }}
                                                  InputProps={{
                                                    sx: { borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', fontSize: '0.85rem' }
                                                  }}
                                                />
                                                <IconButton
                                                   disabled={postingComment[hw.id] || !(newCommentText[hw.id] || '').trim()}
                                                   onClick={() => handlePostComment(hw.id)}
                                                   sx={{
                                                     background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                                                     color: '#FFF',
                                                     boxShadow: '0 3px 10px rgba(79, 70, 229, 0.4)',
                                                     '&:hover': {
                                                       background: 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)',
                                                       boxShadow: '0 4px 14px rgba(79, 70, 229, 0.6)'
                                                     },
                                                     '&.Mui-disabled': {
                                                       background: colorMode.mode === 'dark' ? 'rgba(79, 70, 229, 0.3)' : 'rgba(79, 70, 229, 0.2)',
                                                       color: colorMode.mode === 'dark' ? '#818CF8' : '#4F46E5'
                                                     }
                                                   }}
                                                 >
                                                   {postingComment[hw.id] ? <CircularProgress size={18} color="inherit" /> : <Send sx={{ fontSize: 18 }} />}
                                                 </IconButton>
                                              </Box>
                                            </Box>
                                          )}
                                        </Box>
                                      </Grid>

                                      {/* Right Column: "Votre Travail" Submission Panel */}
                                      <Grid item xs={12} md={4}>
                                        <Paper
                                          variant="outlined"
                                          sx={{
                                            p: 2.5,
                                            borderRadius: 3.5,
                                            borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0',
                                            bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            height: '100%',
                                            justify: 'space-between'
                                          }}
                                        >
                                          <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                                                📌 Votre Travail
                                              </Typography>
                                              <Chip
                                                label={isSubmitted ? (hw.mySubmission.status === 'late' ? 'Remis en retard' : 'Remis') : 'Non remis'}
                                                size="small"
                                                color={isSubmitted ? 'success' : 'default'}
                                                sx={{ fontWeight: 700 }}
                                              />
                                            </Box>

                                            {/* Submission Details */}
                                            {isSubmitted ? (
                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1.5 }}>
                                                {hw.mySubmission.content && (
                                                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF' }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block' }}>
                                                      💡 Votre réponse texte :
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.primary', fontStyle: 'italic', mt: 0.5 }}>
                                                      "{hw.mySubmission.content}"
                                                    </Typography>
                                                  </Paper>
                                                )}

                                                {hw.mySubmission.fileUrl && (
                                                  <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<AttachFile />}
                                                    onClick={() => window.open(hw.mySubmission.fileUrl, '_blank')}
                                                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, justifyContent: 'flex-start', bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFF' }}
                                                  >
                                                    Fichier joint remis
                                                  </Button>
                                                )}

                                                {isGraded && hw.mySubmission.feedback && (
                                                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#ECFDF5', borderColor: '#A7F3D0', borderRadius: 2 }}>
                                                    <Typography variant="caption" fontWeight={700} color="#047857" sx={{ display: 'block' }}>
                                                      🏆 Note & Correction du Professeur :
                                                    </Typography>
                                                    <Typography variant="subtitle2" fontWeight={800} color="#065F46" sx={{ my: 0.5 }}>
                                                      {hw.mySubmission.score} / {hw.maxScore}
                                                    </Typography>
                                                    <Typography variant="body2" color="#065F46" sx={{ fontSize: '0.85rem' }}>
                                                      "{hw.mySubmission.feedback}"
                                                    </Typography>
                                                  </Paper>
                                                )}
                                              </Box>
                                            ) : (
                                              <Box sx={{ py: 2, textAlign: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                  Aucun devoir transmis pour cette consigne.
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>

                                          <Box sx={{ mt: 2 }}>
                                            <Button
                                              fullWidth
                                              variant={isSubmitted ? 'outlined' : 'contained'}
                                              startIcon={isSubmitted ? <CheckCircle /> : <Send />}
                                              onClick={() => {
                                                setSelectedSubmitHomework(hw);
                                                setSubmitForm({
                                                  content: hw.mySubmission?.content || '',
                                                  file: null
                                                });
                                                setSubmitHomeworkModal(true);
                                              }}
                                              sx={{
                                                textTransform: 'none',
                                                borderRadius: 2.5,
                                                fontWeight: 700,
                                                py: 1.2,
                                                bgcolor: isSubmitted ? 'transparent' : '#4F46E5',
                                                '&:hover': { bgcolor: isSubmitted ? 'rgba(79, 70, 229, 0.04)' : '#4338CA' }
                                              }}
                                            >
                                              {isSubmitted ? '✏️ Modifier / Voir la remise' : '📝 Remettre le devoir'}
                                            </Button>
                                          </Box>
                                        </Paper>
                                      </Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            )}

            {/* Sub-Tab 1: QCM Quizzes */}
            {assignmentSubTab === 1 && (
              <Box>
                {studentQuizzes.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#FFFFFF' }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      🎉 No active QCM quizzes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      There are no multiple-choice quizzes assigned to your class level right now.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {studentQuizzes.map((quiz) => (
                      <Grid item xs={12} md={6} key={quiz.id} sx={{ display: 'flex' }}>
                        <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%', borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)' }}>
                          <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip label="QCM QUIZ" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700 }} />
                                <Chip label={quiz.subject ? quiz.subject.toUpperCase() : 'MATH'} size="small" sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }} />
                              </Box>
                              <Chip
                                label={quiz.isCompleted ? `Score: ${quiz.mySubmission.score}/${quiz.maxScore}` : quiz.isPastDue ? '🔴 Ended' : '⏳ To Do'}
                                color={quiz.isCompleted ? 'primary' : quiz.isPastDue ? 'error' : 'warning'}
                                sx={{ fontWeight: 700 }}
                              />
                            </Box>

                            <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>{quiz.title}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1, whiteSpace: 'pre-wrap' }}>{quiz.description}</Typography>

                            <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #F1F5F9' }}>
                              <Typography variant="caption" display="block" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
                                ❓ {quiz.questions?.length || 0} Questions | 📅 Due: {new Date(quiz.dueDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                              </Typography>

                              <Button
                                fullWidth
                                variant={quiz.isCompleted ? 'outlined' : 'contained'}
                                startIcon={<Star />}
                                onClick={() => {
                                  setSelectedQuiz(quiz);
                                  setQuizAnswers(quiz.mySubmission?.answers || {});
                                  setTakeQuizModal(true);
                                }}
                                sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', bgcolor: quiz.isCompleted ? 'transparent' : '#4F46E5' }}
                              >
                                {quiz.isCompleted ? 'Review Completed QCM' : '🎯 Start QCM Quiz'}
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Sub-Tab 2: Flashcards & Cartes Mentales (Spaced Repetition) */}
            {assignmentSubTab === 2 && (
              <Box sx={{ mt: 2 }}>
                {/* Header Controls */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3.5,
                    border: `1px solid ${colorMode.mode === 'dark' ? '#334155' : '#E2E8F0'}`,
                    bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#8B5CF6', color: '#FFF', fontWeight: 800 }}>🎴</Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        Flashcards IA & Cartes Mentales (Répétition Espacée)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Réviser efficacement le programme avec auto-évaluation et vue synoptique hiérarchisée.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {/* Matière Select */}
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel>Matière</InputLabel>
                      <Select
                        value={fcSubject}
                        label="Matière"
                        onChange={(e) => {
                          const s = e.target.value;
                          setFcSubject(s);
                          loadCourseDocumentsForSubject(s);
                        }}
                        sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: '0.82rem' }}
                      >
                        <MenuItem value="math">📐 Maths</MenuItem>
                        <MenuItem value="physics">⚛️ Physique</MenuItem>
                        <MenuItem value="arabic">🇲🇦 Arabe</MenuItem>
                        <MenuItem value="french">🇫🇷 Français</MenuItem>
                        <MenuItem value="english">🇬🇧 Anglais</MenuItem>
                        <MenuItem value="informatique">💻 Informatique</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Cours / Chapitre Select */}
                    <FormControl size="small" sx={{ minWidth: 230 }}>
                      <InputLabel>📖 Choisir le Cours</InputLabel>
                      <Select
                        value={selectedCourseDoc || (availableCourseDocs.length > 0 ? availableCourseDocs[0].title : 'empty')}
                        label="📖 Choisir le Cours"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'empty') return;
                          setSelectedCourseDoc(val);
                          const matchedDoc = availableCourseDocs.find(d => d.title === val);
                          const topicName = matchedDoc ? (matchedDoc.chapter || matchedDoc.title) : 'Général';
                          setFcTopic(topicName);
                          handleFetchFlashcards(fcSubject, topicName);
                        }}
                        sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: '0.82rem' }}
                      >
                        {availableCourseDocs.length > 0 ? (
                          availableCourseDocs.map((doc) => (
                            <MenuItem key={doc.id} value={doc.title}>
                              📄 {doc.title} {doc.chapter ? `(${doc.chapter})` : ''}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem value="empty" disabled>
                            ⚠️ Aucun support déposé par le professeur
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>

                    <Button
                      variant={fcViewMode === 'flashcards' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setFcViewMode('flashcards')}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      🎴 Flashcards ({flashcardsData.length})
                    </Button>
                    <Button
                      variant={fcViewMode === 'mindmap' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setFcViewMode('mindmap')}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      🧠 Carte Mentale
                    </Button>
                  </Box>
                </Paper>

                {flashcardsData.length === 0 && !fcLoading && (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleFetchFlashcards()}
                      startIcon={<Psychology />}
                      sx={{
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                        color: '#FFF',
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 800,
                        textTransform: 'none',
                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
                      }}
                    >
                      ⚡ Générer les Flashcards du Cours de {fcSubject.toUpperCase()}
                    </Button>
                  </Box>
                )}

                {/* Completion Screen matching User Screenshot */}
                {fcViewMode === 'flashcards' && isFcCompleted && flashcardsData.length > 0 && (
                  <Paper
                    elevation={8}
                    sx={{
                      p: 4,
                      maxWidth: 580,
                      mx: 'auto',
                      my: 4,
                      borderRadius: 4,
                      textAlign: 'center',
                      bgcolor: '#1E2228',
                      color: '#FFFFFF',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                      Félicitations 🎉
                    </Typography>

                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3.5,
                        bgcolor: '#14171C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        flexWrap: 'wrap',
                        gap: 3,
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      {/* Donut Gauge */}
                      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress
                          variant="determinate"
                          value={100}
                          size={135}
                          thickness={6}
                          sx={{ color: '#2D333B', position: 'absolute' }}
                        />
                        <CircularProgress
                          variant="determinate"
                          value={fcMasteryPct}
                          size={135}
                          thickness={6}
                          sx={{ color: fcMasteryPct >= 60 ? '#10B981' : fcMasteryPct >= 30 ? '#F59E0B' : '#EF4444' }}
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h4" fontWeight={900} color="#FFFFFF">
                            {Object.values(fcRatings).filter(r => r === 'easy').length}/{flashcardsData.length}
                          </Typography>
                          <Typography variant="body2" fontWeight={800} color="rgba(255,255,255,0.7)">
                            {fcMasteryPct} %
                          </Typography>
                        </Box>
                      </Box>

                      {/* Stats Table */}
                      <Box sx={{ textAlign: 'left', minWidth: 160 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 4 }}>
                          <Typography variant="body1" fontWeight={700} color="rgba(255,255,255,0.85)">
                            Maîtrisé
                          </Typography>
                          <Typography variant="h6" fontWeight={900} sx={{ color: '#10B981' }}>
                            {Object.values(fcRatings).filter(r => r === 'easy').length}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 4 }}>
                          <Typography variant="body1" fontWeight={700} color="rgba(255,255,255,0.85)">
                            À revoir
                          </Typography>
                          <Typography variant="h6" fontWeight={900} sx={{ color: '#EF4444' }}>
                            {Object.values(fcRatings).filter(r => r === 'hard').length}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <Typography variant="body1" fontWeight={700} color="rgba(255,255,255,0.85)">
                            Passées
                          </Typography>
                          <Typography variant="h6" fontWeight={900} sx={{ color: '#F59E0B' }}>
                            {Object.values(fcRatings).filter(r => r === 'medium').length}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      onClick={() => {
                        setIsFcCompleted(false);
                        setCurrentFcIndex(0);
                        setIsFcFlipped(false);
                        setFcRatings({});
                        setFcMasteryPct(0);
                      }}
                      sx={{
                        mt: 4,
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 800,
                        fontSize: '1rem',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        }
                      }}
                    >
                      🔄 Recommencer la Session
                    </Button>
                  </Paper>
                )}

                {fcLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                    <CircularProgress size={36} sx={{ color: '#8B5CF6' }} />
                  </Box>
                )}

                {/* Mode 1: Interactive 3D Flashcards Deck */}
                {fcViewMode === 'flashcards' && !isFcCompleted && flashcardsData.length > 0 && !fcLoading && (
                  <Grid container spacing={3} justifyContent="center">
                    <Grid item xs={12} md={8}>
                      {/* Mastery Gauge */}
                      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                            🎯 Progression de Maîtrise : {fcMasteryPct}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            Carte {currentFcIndex + 1} sur {flashcardsData.length}
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={((currentFcIndex + 1) / flashcardsData.length) * 100} sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0' }} />
                      </Paper>

                      {/* 3D Flip Card Container */}
                      <Paper
                        elevation={4}
                        onClick={() => setIsFcFlipped(!isFcFlipped)}
                        sx={{
                          p: 4,
                          minHeight: 280,
                          borderRadius: 4,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          bgcolor: isFcFlipped ? (colorMode.mode === 'dark' ? '#1E1B4B' : '#EEF2FF') : (colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF'),
                          border: isFcFlipped ? '2px solid #8B5CF6' : '1px solid #E2E8F0',
                          boxShadow: isFcFlipped ? '0 12px 30px rgba(139, 92, 246, 0.25)' : '0 6px 20px rgba(0,0,0,0.06)'
                        }}
                      >
                        {!isFcFlipped ? (
                          // Front: Question
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Chip label={'Difficulté : ' + (flashcardsData[currentFcIndex]?.difficulty || 'Moyen')} size="small" sx={{ fontWeight: 800, bgcolor: '#FEF3C7', color: '#D97706' }} />
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                🔄 Cliquer pour retourner la carte
                              </Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ mb: 2, lineHeight: 1.4 }}>
                              {renderFormattedMath(flashcardsData[currentFcIndex]?.question)}
                            </Typography>
                            {flashcardsData[currentFcIndex]?.hint && (
                              <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', display: 'block' }}>
                                💡 Indice : {renderFormattedMath(flashcardsData[currentFcIndex].hint)}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          // Back: Answer & Explanation
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Chip label="✅ RÉPONSE ET EXPLICATION" size="small" sx={{ fontWeight: 800, bgcolor: '#D1FAE5', color: '#065F46' }} />
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                🔄 Cliquer pour revoir la question
                              </Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={800} color="#4F46E5" sx={{ mb: 2, lineHeight: 1.4 }}>
                              {renderFormattedMath(flashcardsData[currentFcIndex]?.answer)}
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#FFFFFF', borderRadius: 2.5 }}>
                              <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6, fontSize: '0.88rem' }}>
                                📖 <strong>Explication</strong> : {renderFormattedMath(flashcardsData[currentFcIndex]?.explanation)}
                              </Typography>
                            </Paper>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid #E2E8F0' }}>
                          <Typography variant="caption" fontWeight={700} color="#8B5CF6">
                            {isFcFlipped ? '🧠 Auto-évaluation :' : '❓ Question ' + (currentFcIndex + 1)}
                          </Typography>
                        </Box>
                      </Paper>

                      {/* Leitner Spaced Repetition Buttons */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                        <Button
                          variant="contained"
                          onClick={() => handleRateFlashcard('hard')}
                          sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: 2.5, fontWeight: 800, textTransform: 'none', px: 3 }}
                        >
                          🔴 À revoir
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => handleRateFlashcard('medium')}
                          sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' }, borderRadius: 2.5, fontWeight: 800, textTransform: 'none', px: 3 }}
                        >
                          🟠 Moyen
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => handleRateFlashcard('easy')}
                          sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2.5, fontWeight: 800, textTransform: 'none', px: 3 }}
                        >
                          🟢 Facile (Acquis)
                        </Button>
                      </Box>

                      {/* Navigation Controls */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                        <Button
                          disabled={currentFcIndex === 0}
                          onClick={() => { setIsFcFlipped(false); setCurrentFcIndex(prev => prev - 1); }}
                          startIcon={<ArrowBack />}
                          sx={{ fontWeight: 700 }}
                        >
                          Précédent
                        </Button>
                        <Button
                          disabled={currentFcIndex === flashcardsData.length - 1}
                          onClick={() => { setIsFcFlipped(false); setCurrentFcIndex(prev => prev + 1); }}
                          endIcon={<ArrowForward />}
                          sx={{ fontWeight: 700 }}
                        >
                          Suivant
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {/* Mode 2: Interactive Mind Map Tree View */}
                {fcViewMode === 'mindmap' && mindmapData && !fcLoading && (
                  <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: '#8B5CF6' }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <Chip label={mindmapData.label} size="large" sx={{ bgcolor: mindmapData.color || '#4F46E5', color: '#FFF', fontWeight: 800, fontSize: '1.1rem', px: 2, py: 2.5, borderRadius: 3 }} />
                    </Box>

                    <Grid container spacing={3}>
                      {(mindmapData.children || []).map((branch) => (
                        <Grid item xs={12} sm={6} key={branch.id}>
                          <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3, borderLeft: '5px solid ' + (branch.color || '#3B82F6'), bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF' }}>
                            <Typography variant="subtitle1" fontWeight={800} color="text.primary" sx={{ mb: 1.5 }}>
                              {branch.label}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {(branch.children || []).map((leaf) => (
                                <Box key={leaf.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 2, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F1F5F9' }}>
                                  <Typography variant="body2" fontWeight={600} color="text.primary">
                                    • {leaf.label}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}
      </Container>

      <Dialog
        open={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#EEF2FF', color: '#4F46E5' }}>
              <Description />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {selectedSource?.title || 'Support de Cours'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Document de Cours Officiel RAG Curriculum
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
                <Chip label={`📖 ${docDetails?.subject ? docDetails.subject.toUpperCase() : 'COURS'}`} size="small" sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }} />
                {docDetails?.chapter && (
                  <Chip label={`📚 Chapitre: ${docDetails.chapter}`} size="small" sx={{ bgcolor: '#F1F5F9', color: '#334155', fontWeight: 600 }} />
                )}
                {docDetails?.gradeLevel && (
                  <Chip label={`🎓 ${docDetails.gradeLevel}`} size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                )}
                <Chip label={`👨‍🏫 ${docDetails?.teacherName || 'Professeur'}`} size="small" variant="outlined" />
              </Box>

              <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mt: 1 }}>
                {docDetails?.isPdf && pdfBlobUrl ? 'Visualiseur de Document PDF Officiel :' : 'Aperçu du contenu du cours :'}
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
                <Paper variant="outlined" sx={{ p: 2.5, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#CBD5E1', borderRadius: 3, maxHeight: 360, overflowY: 'auto' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: colorMode.mode === 'dark' ? '#E2E8F0' : '#1E293B', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                    {docDetails?.contentSnippet || docDetails?.extractedText || selectedSource?.description || 'Support de cours théorique déposé par l\'enseignant.'}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button onClick={() => setSourceModalOpen(false)} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}>
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
              fontWeight: 700,
              borderRadius: 2.5,
              px: 3
            }}
          >
            Télécharger le Support (PDF/TXT)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Submit Assignment Modal (UI Pro) */}
      <Dialog open={submitHomeworkModal} onClose={() => setSubmitHomeworkModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', color: colorMode.mode === 'dark' ? '#F8FAFC' : 'text.primary' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#EEF2FF', color: '#4F46E5' }}>
              <Assignment />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                📝 Remise de Devoir : {selectedSubmitHomework?.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Date limite : {selectedSubmitHomework?.dueDate ? new Date(selectedSubmitHomework.dueDate).toLocaleString('fr-FR') : ''}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setSubmitHomeworkModal(false)} size="small"><Close /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity={selectedSubmitHomework?.isPastDue ? 'warning' : 'info'} sx={{ borderRadius: 3 }}>
              {selectedSubmitHomework?.isPastDue
                ? '⚠️ Attention : La date limite est dépassée. Votre devoir sera marqué "Remis en retard".'
                : '💡 Saisissez votre réponse explicative ou joignez votre fichier d\'exercice (PDF / Image / Word).'}
            </Alert>

            {/* Graded feedback alert if present */}
            {selectedSubmitHomework?.mySubmission?.status === 'graded' && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: colorMode.mode === 'dark' ? '#064E3B' : '#ECFDF5', borderColor: colorMode.mode === 'dark' ? '#047857' : '#A7F3D0', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#047857">
                  🏆 Note attribuée : {selectedSubmitHomework.mySubmission.score} / {selectedSubmitHomework.maxScore}
                </Typography>
                {selectedSubmitHomework.mySubmission.feedback && (
                  <Typography variant="body2" color="#065F46" sx={{ mt: 0.5 }}>
                    Remarque du professeur : {selectedSubmitHomework.mySubmission.feedback}
                  </Typography>
                )}
              </Paper>
            )}

            <TextField
              fullWidth
              multiline
              rows={5}
              label="Votre réponse explicative / Solution"
              value={submitForm.content}
              onChange={(e) => setSubmitForm({ ...submitForm, content: e.target.value })}
              placeholder="Rédigez la démonstration ou votre texte de réponse ici..."
              InputProps={{ sx: { borderRadius: 3 } }}
            />

            <Box sx={{ border: '2px dashed', borderColor: colorMode.mode === 'dark' ? '#475569' : '#CBD5E1', borderRadius: 3, p: 3, textAlign: 'center', bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC' }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                📎 Pièce jointe (Copie d'exercice)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Formats acceptés : PDF, Word (.doc/.docx), Images (.png/.jpg)
              </Typography>
              <Button variant="outlined" component="label" startIcon={<Upload />} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                {submitForm.file ? submitForm.file.name : 'Sélectionner un fichier'}
                <input type="file" hidden accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => setSubmitForm({ ...submitForm, file: e.target.files[0] })} />
              </Button>
              {submitForm.file && (
                <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
                  ✅ Fichier sélectionné : {submitForm.file.name}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSubmitHomeworkModal(false)} sx={{ fontWeight: 600 }}>Annuler</Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSubmitHomework}
            sx={{ bgcolor: '#4F46E5', fontWeight: 700, borderRadius: 2.5, px: 3, py: 1 }}
          >
            Remettre le Devoir au Professeur 🚀
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Take QCM Quiz Dialog */}
      <Dialog open={takeQuizModal} onClose={() => setTakeQuizModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1, bgcolor: colorMode.mode === 'dark' ? '#1E293B' : '#FFFFFF', color: colorMode.mode === 'dark' ? '#F8FAFC' : 'text.primary' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">🎯 {selectedQuiz?.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              Matière : {selectedQuiz?.subject?.toUpperCase()} | Note Max : {selectedQuiz?.maxScore} pts
            </Typography>
          </Box>
          <IconButton onClick={() => setTakeQuizModal(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
          {selectedQuiz?.description && (
            <Typography variant="body2" color="text.secondary">
              {selectedQuiz.description}
            </Typography>
          )}

          {selectedQuiz?.isCompleted && (
            <Alert severity="success" sx={{ borderRadius: 2.5 }}>
              🏆 Quiz QCM déjà soumis ! Votre résultat final : <strong>{selectedQuiz.mySubmission?.score} / {selectedQuiz.maxScore}</strong>
            </Alert>
          )}

          {(selectedQuiz?.questions || []).map((q, idx) => (
            <Paper key={q.id || idx} variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: colorMode.mode === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colorMode.mode === 'dark' ? '#334155' : '#E2E8F0' }}>
              <Typography variant="subtitle1" fontWeight={700} color={colorMode.mode === 'dark' ? '#F8FAFC' : '#1E293B'} sx={{ mb: 1.5 }}>
                Question {idx + 1} : {q.question} ({q.points || 1} pts)
              </Typography>
              <Grid container spacing={2}>
                {[
                  { key: 'optionA', label: q.optionA },
                  { key: 'optionB', label: q.optionB },
                  { key: 'optionC', label: q.optionC },
                  { key: 'optionD', label: q.optionD },
                ].map((opt) => {
                  const isChosen = quizAnswers[q.id] === opt.key;
                  return (
                    <Grid item xs={12} sm={6} key={opt.key}>
                      <Paper
                        onClick={() => {
                          if (!selectedQuiz?.isCompleted) {
                            setQuizAnswers({ ...quizAnswers, [q.id]: opt.key });
                          }
                        }}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          cursor: selectedQuiz?.isCompleted ? 'default' : 'pointer',
                          borderColor: isChosen ? '#4F46E5' : '#E2E8F0',
                          bgcolor: isChosen ? '#EEF2FF' : '#FFFFFF',
                          transition: 'all 0.2s',
                          boxShadow: isChosen ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                          '&:hover': {
                            bgcolor: selectedQuiz?.isCompleted ? '#FFFFFF' : '#EEF2FF',
                            borderColor: '#818CF8'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Chip
                            label={opt.key.replace('option', '')}
                            size="small"
                            sx={{
                              bgcolor: isChosen ? '#4F46E5' : '#E2E8F0',
                              color: isChosen ? '#FFFFFF' : '#475569',
                              fontWeight: 700
                            }}
                          />
                          <Typography variant="body2" fontWeight={isChosen ? 700 : 500} color={isChosen ? (colorMode.mode === 'dark' ? '#EEF2FF' : '#312E81') : 'text.primary'}>
                            {opt.label || `Option ${opt.key.replace('option', '')}`}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setTakeQuizModal(false)}>Fermer</Button>
          {!selectedQuiz?.isCompleted && (
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleSubmitQuiz}
              sx={{ bgcolor: '#4F46E5', fontWeight: 700, borderRadius: 2.5, px: 3 }}
            >
              Soumettre et Corriger le QCM 🚀
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {startTour && <TourEngine steps={tourConfigs.student} refs={tourRefs} />}
    </Box>
  );
}

