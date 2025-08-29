import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
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

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api')}/auth/refresh`,
            { refreshToken }
          );

          const { token: newToken, refreshToken: newRefreshToken } = response.data;

          // Store new tokens
          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Retry original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Ensure error is properly formatted
    if (error.response?.data && typeof error.response.data === 'object') {
      // Ensure error object has proper structure
      if (!error.response.data.error && error.response.data.message) {
        error.response.data.error = error.response.data.message;
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: (token) => `/auth/reset-password/${token}`,
  },

  // Users
  users: {
    profile: '/users/profile',
    preferences: '/users/preferences',
    changePassword: '/users/change-password',
    bidHistory: '/users/bid-history',
    bidStatus: '/users/bid-status',
    seniority: '/users/seniority',
  },

  // Stations
  stations: {
    list: '/stations',
    detail: (id) => `/stations/${id}`,
    availability: (id) => `/stations/${id}/availability`,
    positions: (id) => `/stations/${id}/positions`,
    availablePositions: '/stations/available/positions',
  },

  // Bid Sessions
  bidSessions: {
    list: '/bid-sessions',
    create: '/bid-sessions',
    current: '/bid-sessions/current',
    detail: (id) => `/bid-sessions/${id}`,
    update: (id) => `/bid-sessions/${id}`,
    delete: (id) => `/bid-sessions/${id}`,
    participants: (id) => `/bid-sessions/${id}/participants`,
    start: (id) => `/bid-sessions/${id}/start`,
    pause: (id) => `/bid-sessions/${id}/pause`,
    resume: (id) => `/bid-sessions/${id}/resume`,
    moveToBack: (id) => `/bid-sessions/${id}/move-to-back`,
    checkTimeExpiration: (id) => `/bid-sessions/${id}/check-time-expiration`,
    myParticipation: (id) => `/bid-sessions/${id}/my-participation`,
    history: (id) => `/bid-sessions-history?sessionId=${id}`,
    submitBid: '/bid-sessions/submit-bid',
  },

  // Admin
  admin: {
    users: '/admin/users',
    userDetail: (id) => `/admin/users/${id}`,
    resetPassword: (id) => `/admin/users/${id}/reset-password`,
    statistics: '/admin/statistics',
    connections: '/admin/connections',
    bulkOperations: '/admin/bulk-operations',
    exportUsers: '/admin/export/users',
  },
};

// Helper functions for common API operations
export const apiHelpers = {
  // Get request with error handling
  async get(url, config = {}) {
    try {
      const response = await api.get(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Post request with error handling
  async post(url, data = {}, config = {}) {
    try {
      const response = await api.post(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Put request with error handling
  async put(url, data = {}, config = {}) {
    try {
      const response = await api.put(url, data, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Delete request with error handling
  async delete(url, config = {}) {
    try {
      const response = await api.delete(url, config);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },
};

export default api;
