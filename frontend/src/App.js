import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import ProfilesList from './components/Profiles/ProfilesList';
import NewProfile from './components/Profiles/NewProfile';
import KPIReview from './components/Profiles/KPIReview';
import BenchmarkPage from './components/Benchmark/BenchmarkPage';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import LoadingSpinner from './components/UI/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    );
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 ml-64 mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Routes>
                <Route 
                  path="/" 
                  element={
                    user?.role === 'admin' ? <Dashboard /> : <Navigate to="/profiles" replace />
                  } 
                />
                <Route path="/profiles" element={<ProfilesList />} />
                <Route path="/profiles/new" element={<NewProfile />} />
                <Route path="/profiles/:profileId/review-kpis" element={<KPIReview />} />
                <Route path="/benchmark" element={<BenchmarkPage />} />
                <Route 
                  path="*" 
                  element={
                    <Navigate to={user?.role === 'admin' ? "/" : "/profiles"} replace />
                  } 
                />
              </Routes>
            </motion.div>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
