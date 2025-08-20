import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
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
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/refresh`,
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
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: (token) => `/api/auth/reset-password/${token}`,
  },

  // Users
  users: {
    profile: '/api/users/profile',
    preferences: '/api/users/preferences',
    changePassword: '/api/users/change-password',
    bidHistory: '/api/users/bid-history',
    bidStatus: '/api/users/bid-status',
    seniority: '/api/users/seniority',
  },

  // Stations
  stations: {
    list: '/api/stations',
    detail: (id) => `/api/stations/${id}`,
    availability: (id) => `/api/stations/${id}/availability`,
    positions: (id) => `/api/stations/${id}/positions`,
    availablePositions: '/api/stations/available/positions',
  },

  // Bid Sessions
  bidSessions: {
    list: '/api/bid-sessions',
    detail: (id) => `/api/bid-sessions/${id}`,
    participants: (id) => `/api/bid-sessions/${id}/participants`,
    start: (id) => `/api/bid-sessions/${id}/start`,
    pause: (id) => `/api/bid-sessions/${id}/pause`,
    resume: (id) => `/api/bid-sessions/${id}/resume`,
    myParticipation: (id) => `/api/bid-sessions/${id}/my-participation`,
  },

  // Admin
  admin: {
    users: '/api/admin/users',
    userDetail: (id) => `/api/admin/users/${id}`,
    resetPassword: (id) => `/api/admin/users/${id}/reset-password`,
    statistics: '/api/admin/statistics',
    connections: '/api/admin/connections',
    bulkOperations: '/api/admin/bulk-operations',
    exportUsers: '/api/admin/export/users',
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
