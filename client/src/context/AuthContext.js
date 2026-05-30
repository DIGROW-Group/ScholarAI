import React, { createContext, useState, useContext, useEffect } from 'react';
import api, { setAuthFailureHandler } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });

    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          await api.post('/auth/refresh');
          const meResponse = await api.get('/auth/me');
          setUser(meResponse.data.user);
        } catch (refreshError) {
          setUser(null);
        }
      } else {
        console.error('Auth check failed:', error);
        setUser(null);
      }
    }

    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      const { user } = response.data;
      setUser(user);
      console.log('Login successful for:', email);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      console.error('Error message:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        status: error.response?.status,
        details: error.response?.data?.details
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user } = response.data;
      setUser(user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
        status: error.response?.status,
        details: error.response?.data?.details
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    setUser(null);
  };

  const completeOnboarding = async () => {
    try {
      await api.post('/auth/onboarding-complete');
      setUser((prevUser) => (prevUser ? { ...prevUser, onboardingCompleted: true } : prevUser));
      return { success: true };
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to complete onboarding'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

