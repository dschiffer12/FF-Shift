import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Eye, 
  EyeOff, 
  Shield, 
  Mail, 
  Lock, 
  User, 
  Badge, 
  Building, 
  Calendar,
  MapPin,
  Award,
  Briefcase
} from 'lucide-react';
import Button from '../../components/UI/Button';

const Register = () => {
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Format the data for registration
      const userData = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        employeeId: data.employeeId,
        rank: data.rank,
        position: data.position,
        yearsOfService: parseInt(data.yearsOfService),
        currentShift: data.currentShift,
      };

      await registerUser(userData);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    const isValid = await trigger(['email', 'password', 'confirmPassword', 'firstName', 'lastName', 'employeeId']);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  const rankOptions = [
    'Firefighter',
    'Engineer', 
    'Lieutenant',
    'Captain',
    'Battalion Chief',
    'Deputy Chief',
    'Chief'
  ];

  const positionOptions = [
    'Firefighter',
    'Paramedic',
    'EMT',
    'Driver',
    'Operator',
    'Officer'
  ];

  const shiftOptions = ['A', 'B', 'C'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join the FF Shift Bid platform
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Account</span>
          </div>
          <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center ${currentStep >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Profile</span>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Step 1: Account Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="firstName"
                          type="text"
                          autoComplete="given-name"
                          className={`input pl-10 ${errors.firstName ? 'input-error' : ''}`}
                          placeholder="Enter your first name"
                          {...register('firstName', {
                            required: 'First name is required',
                            minLength: {
                              value: 2,
                              message: 'First name must be at least 2 characters',
                            },
                          })}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-danger-600">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="lastName"
                          type="text"
                          autoComplete="family-name"
                          className={`input pl-10 ${errors.lastName ? 'input-error' : ''}`}
                          placeholder="Enter your last name"
                          {...register('lastName', {
                            required: 'Last name is required',
                            minLength: {
                              value: 2,
                              message: 'Last name must be at least 2 characters',
                            },
                          })}
                        />
                      </div>
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-danger-600">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                        placeholder="Enter your email address"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address',
                          },
                        })}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                      Employee ID
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Badge className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="employeeId"
                        type="text"
                        className={`input pl-10 ${errors.employeeId ? 'input-error' : ''}`}
                        placeholder="Enter your employee ID"
                        {...register('employeeId', {
                          required: 'Employee ID is required',
                          minLength: {
                            value: 3,
                            message: 'Employee ID must be at least 3 characters',
                          },
                        })}
                      />
                    </div>
                    {errors.employeeId && (
                      <p className="mt-1 text-sm text-danger-600">{errors.employeeId.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                        placeholder="Create a password"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                          pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                          },
                        })}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`input pl-10 pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                        placeholder="Confirm your password"
                        {...register('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: value => value === password || 'Passwords do not match',
                        })}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={nextStep}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Professional Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="rank" className="block text-sm font-medium text-gray-700">
                        Rank
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Award className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="rank"
                          className={`input pl-10 ${errors.rank ? 'input-error' : ''}`}
                          {...register('rank', {
                            required: 'Rank is required',
                          })}
                        >
                          <option value="">Select your rank</option>
                          {rankOptions.map((rank) => (
                            <option key={rank} value={rank}>
                              {rank}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.rank && (
                        <p className="mt-1 text-sm text-danger-600">{errors.rank.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                        Position
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Briefcase className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="position"
                          className={`input pl-10 ${errors.position ? 'input-error' : ''}`}
                          {...register('position', {
                            required: 'Position is required',
                          })}
                        >
                          <option value="">Select your position</option>
                          {positionOptions.map((position) => (
                            <option key={position} value={position}>
                              {position}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.position && (
                        <p className="mt-1 text-sm text-danger-600">{errors.position.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="yearsOfService" className="block text-sm font-medium text-gray-700">
                        Years of Service
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="yearsOfService"
                          type="number"
                          min="0"
                          max="50"
                          className={`input pl-10 ${errors.yearsOfService ? 'input-error' : ''}`}
                          placeholder="Enter years of service"
                          {...register('yearsOfService', {
                            required: 'Years of service is required',
                            min: {
                              value: 0,
                              message: 'Years of service cannot be negative',
                            },
                            max: {
                              value: 50,
                              message: 'Years of service cannot exceed 50',
                            },
                          })}
                        />
                      </div>
                      {errors.yearsOfService && (
                        <p className="mt-1 text-sm text-danger-600">{errors.yearsOfService.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="currentShift" className="block text-sm font-medium text-gray-700">
                        Current Shift
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="currentShift"
                          className={`input pl-10 ${errors.currentShift ? 'input-error' : ''}`}
                          {...register('currentShift', {
                            required: 'Current shift is required',
                          })}
                        >
                          <option value="">Select your shift</option>
                          {shiftOptions.map((shift) => (
                            <option key={shift} value={shift}>
                              Shift {shift}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.currentShift && (
                        <p className="mt-1 text-sm text-danger-600">{errors.currentShift.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={prevStep}
                    >
                      Previous Step
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={isLoading}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Sign in to your account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
