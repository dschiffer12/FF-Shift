import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Button from '../../components/UI/Button';
import Logo from '../../components/UI/Logo';

const Login = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear any existing tokens first
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      console.log('Attempting login with:', { email: data.email, password: '***' });
      console.log('API base URL:', process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api'));
      
      const response = await login(data.email, data.password);
      console.log('Login response:', response);
      
      // The login function in AuthContext already handles token storage and navigation
      // No need to duplicate the logic here
      
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers
        }
      });
      
      // Handle JWT malformed error specifically
      if (error.response?.data?.error?.includes('malformed') || error.message?.includes('malformed')) {
        setError('Authentication token is invalid. Please try logging in again.');
        // Clear any corrupted tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } else {
        setError(error.response?.data?.error || error.message || 'Login failed');
      }
      
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rigroster-offWhite flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="2xl" />
          </div>
          <h2 className="text-3xl font-bold text-rigroster-text">
            Welcome to RigRoster
          </h2>
          <p className="mt-2 text-sm text-rigroster-textLight">
            Sign in to your account to continue
          </p>
        </div>
        
        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-rigroster-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-rigroster-textLight" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="input pl-10"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-danger-600">
                  {typeof errors.email === 'object' && errors.email.message 
                    ? errors.email.message 
                    : errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-rigroster-text mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-rigroster-textLight" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  className="input pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-rigroster-textLight hover:text-rigroster-text" />
                  ) : (
                    <Eye className="h-5 w-5 text-rigroster-textLight hover:text-rigroster-text" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-danger-600">
                  {typeof errors.password === 'object' && errors.password.message 
                    ? errors.password.message 
                    : errors.password}
                </p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-rigroster-textLight">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-rigroster-red hover:text-primary-600">
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
