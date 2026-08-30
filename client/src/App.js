import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SnackbarProvider } from './context/SnackbarContext';
import { ColorModeProvider } from './context/ColorModeContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ParentDashboard from './pages/ParentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CounselorDashboard from './pages/CounselorDashboard';

import { Box, CircularProgress, Typography, Avatar } from '@mui/material';
import { School } from '@mui/icons-material';

// Sleek full-page loader component
const FullPageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      bgcolor: '#F8FAFC'
    }}
  >
    <Avatar
      sx={{
        width: 64,
        height: 64,
        bgcolor: '#4F46E5',
        boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
        mb: 3
      }}
    >
      <School sx={{ fontSize: 36, color: '#FFFFFF' }} />
    </Avatar>
    <CircularProgress size={30} thickness={4} sx={{ color: '#4F46E5', mb: 2 }} />
    <Typography variant="subtitle1" fontWeight={700} color="#1E293B" sx={{ letterSpacing: '-0.01em' }}>
      ScholarAI
    </Typography>
    <Typography variant="caption" color="text.secondary">
      Chargement de votre espace pédagogique...
    </Typography>
  </Box>
);

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Dashboard Router based on role
const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'parent':
      return <ParentDashboard />;
    case 'counselor':
      return <CounselorDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <ColorModeProvider>
      <Router>
        <AuthProvider>
          <SnackbarProvider>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/*"
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/counselor/*"
              element={
                <ProtectedRoute allowedRoles={['counselor']}>
                  <CounselorDashboard />
                </ProtectedRoute>
              }
            />
            </Routes>
          </SnackbarProvider>
        </AuthProvider>
      </Router>
    </ColorModeProvider>
  );
}

export default App;

