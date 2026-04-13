import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect to login if we're already on the login page (avoid redirect loops)
    const isLoginPage = window.location.pathname === '/login';
    
    if (error.response?.status === 401 && !isLoginPage) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Log error for debugging
    if (error.config?.url?.includes('/auth/login')) {
      console.error('Login API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config.url
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;

