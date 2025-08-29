import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_TOKEN: 'SET_TOKEN',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
};

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case AUTH_ACTIONS.SET_USER:
      return { ...state, user: action.payload, loading: false };
    case AUTH_ACTIONS.SET_TOKEN:
      return { ...state, token: action.payload };
    case AUTH_ACTIONS.LOGOUT:
      return { ...state, user: null, token: null, loading: false };
    case AUTH_ACTIONS.UPDATE_USER:
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Set auth token in API headers
  useEffect(() => {
    if (state.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      try {
        const response = await api.get('/auth/me');
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: response.data.user });
      } catch (error) {
        console.error('Auth check failed:', error);
        
        // Clear invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        // Logout user
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        
        // Don't show error toast for auth check failures
        // as this might happen on app load
      }
    };

    checkAuth();
  }, []);

  // Clear any corrupted tokens on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Check if tokens exist but are malformed
    if (token && (token.length < 10 || !token.includes('.'))) {
      console.log('Detected malformed token, clearing...');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      console.log('AuthContext: Starting login process');
      console.log('AuthContext: API base URL:', api.defaults.baseURL);
      
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      console.log('AuthContext: Making API call to /auth/login');
      const response = await api.post('/auth/login', { email, password });
      console.log('AuthContext: API response received:', response.data);
      
      const { user, token, refreshToken } = response.data;

      console.log('AuthContext: Tokens received:', {
        tokenLength: token?.length,
        refreshTokenLength: refreshToken?.length,
        tokenPreview: token?.substring(0, 20) + '...',
        refreshTokenPreview: refreshToken?.substring(0, 20) + '...'
      });

      // Store tokens
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      console.log('AuthContext: Tokens stored in localStorage');
      console.log('AuthContext: localStorage token:', localStorage.getItem('token')?.substring(0, 20) + '...');

      // Set Authorization header for subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('AuthContext: Authorization header set:', api.defaults.headers.common['Authorization']?.substring(0, 30) + '...');

      // Update state
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
      
      toast.success('Login successful!');
      navigate('/dashboard');
      
      return { success: true, user, token, refreshToken };
    } catch (error) {
      console.error('AuthContext: Login error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      toast.error(error.response?.data?.error || error.message || 'Login failed');
      return { success: false, error: error.response?.data?.error || error.message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await api.post('/auth/register', userData);
      const { user, token, refreshToken } = response.data;

      // Store tokens
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      // Update state
      dispatch({ type: AUTH_ACTIONS.SET_TOKEN, payload: token });
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });

      toast.success('Registration successful!');
      navigate('/dashboard');
      
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      
      // Handle different types of error responses
      let message = 'Registration failed';
      
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
      
      // Return a simple object, not the error object
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Clear tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    // Update state
    dispatch({ type: AUTH_ACTIONS.LOGOUT });

    // Clear API headers
    delete api.defaults.headers.common['Authorization'];

    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      // Store new tokens
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Update state
      dispatch({ type: AUTH_ACTIONS.SET_TOKEN, payload: newToken });

      return { success: true };
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, logout user
      logout();
      
      return { success: false };
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      const updatedUser = response.data.user;

      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });
      toast.success('Profile updated successfully');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Profile update failed';
      toast.error(message);
      
      return { success: false, error: message };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/users/change-password', {
        currentPassword,
        newPassword
      });

      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed';
      toast.error(message);
      
      return { success: false, error: message };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      
      toast.success('Password reset email sent');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send reset email';
      toast.error(message);
      
      return { success: false, error: message };
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      
      toast.success('Password reset successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Password reset failed';
      toast.error(message);
      
      return { success: false, error: message };
    }
  };

  // Force clear all tokens and restart auth flow
  const forceClearTokens = () => {
    console.log('Force clearing all tokens...');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    
    // Force page reload to clear any cached state
    window.location.reload();
  };

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.isAdmin || false,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    forceClearTokens,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
