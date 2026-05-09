import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let onAuthFailure = null;
let isRetrying = false;

export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');
    const isExpiredAccessToken =
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED';

    if (isExpiredAccessToken && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      if (isRetrying) {
        return Promise.reject(error);
      }

      isRetrying = true;
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof onAuthFailure === 'function') {
          onAuthFailure();
        }
        return Promise.reject(refreshError);
      } finally {
        isRetrying = false;
      }
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

