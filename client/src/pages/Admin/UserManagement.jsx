import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { 
  Users, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Shield, 
  Mail, 
  Phone, 
  Award, 
  Clock, 
  Building2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Download,
  RefreshCw,
  TrendingUp,
  Calendar,
  MapPin,
  Settings
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showStationAssignment, setShowStationAssignment] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [stations, setStations] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loadingStations, setLoadingStations] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEdit,
    setValue: setEditValue
  } = useForm();

  const {
    register: registerStation,
    handleSubmit: handleStationSubmit,
    formState: { errors: stationErrors },
    reset: resetStation,
    setValue: setStationValue
  } = useForm();

  // Calculate seniority score for display
  const calculateSeniorityScore = (user) => {
    let score = (user.yearsOfService || 0) * 10;
    
    const rankMultipliers = {
      'Firefighter': 1,
      'Engineer': 1.2,
      'Lieutenant': 1.5,
      'Captain': 2,
      'Battalion Chief': 3,
      'Deputy Chief': 4,
      'Chief': 5
    };
    
    const positionMultipliers = {
      'Firefighter': 1,
      'Paramedic': 1.3,
      'EMT': 1.1,
      'Driver': 1.2,
      'Operator': 1.4,
      'Officer': 1.5
    };
    
    score *= (rankMultipliers[user.rank] || 1);
    score *= (positionMultipliers[user.position] || 1);
    
    return Math.round(score);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      setLoadingStations(true);
      const response = await api.get('/stations');
      setStations(response.data.stations || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load stations');
    } finally {
      setLoadingStations(false);
    }
  };

  const handleStationAssignment = async (data) => {
    try {
      console.log('Station assignment data:', data);
      console.log('Selected user:', selectedUser);
      const response = await api.put(`/admin/users/${selectedUser._id}/station`, {
        stationId: data.stationId,
        shift: data.shift
      });
      
      setUsers(users.map(user => 
        user._id === selectedUser._id ? response.data.user : user
      ));
      
      setShowStationAssignment(false);
      setSelectedUser(null);
      resetStation();
      toast.success('Station assignment updated successfully');
    } catch (error) {
      console.error('Error updating station assignment:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to update station assignment');
    }
  };

  const handleAssignStation = (user) => {
    setSelectedUser(user);
    setStationValue('stationId', user.currentStation?._id || '');
    setStationValue('shift', user.currentShift || 'A');
    setShowStationAssignment(true);
  };

  const filterUsers = useCallback(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rank?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(user => user.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(user => !user.isActive);
        break;
      case 'admin':
        filtered = filtered.filter(user => user.isAdmin);
        break;
      case 'pending':
        filtered = filtered.filter(user => user.status === 'pending');
        break;
      case 'senior':
        filtered = filtered.filter(user => (user.yearsOfService || 0) >= 10);
        break;
      case 'junior':
        filtered = filtered.filter(user => (user.yearsOfService || 0) < 5);
        break;
      case 'assigned':
        filtered = filtered.filter(user => user.currentStation);
        break;
      case 'unassigned':
        filtered = filtered.filter(user => !user.currentStation);
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'seniority':
          aValue = calculateSeniorityScore(a);
          bValue = calculateSeniorityScore(b);
          break;
        case 'yearsOfService':
          aValue = a.yearsOfService || 0;
          bValue = b.yearsOfService || 0;
          break;
        case 'rank':
          aValue = a.rank || '';
          bValue = b.rank || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        default:
          aValue = a.firstName || '';
          bValue = b.firstName || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
    fetchStations();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleCreateUser = async (data) => {
    try {
      const response = await api.post('/admin/users', data);
      setUsers([...users, response.data.user]);
      setIsCreating(false);
      reset();
      toast.success('User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (data) => {
    try {
      const response = await api.put(`/admin/users/${selectedUser._id}`, data);
      setUsers(users.map(user => 
        user._id === selectedUser._id ? response.data.user : user
      ));
      setIsEditing(false);
      setSelectedUser(null);
      resetEdit();
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(user => user._id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditValue('firstName', user.firstName || '');
    setEditValue('lastName', user.lastName || '');
    setEditValue('email', user.email || '');
    setEditValue('phone', user.phone || '');
    setEditValue('rank', user.rank || '');
    setEditValue('position', user.position || '');
    setEditValue('yearsOfService', user.yearsOfService || 0);
    setEditValue('employeeId', user.employeeId || '');
    setEditValue('isAdmin', user.isAdmin || false);
    setEditValue('isActive', user.isActive !== false);
    setIsEditing(true);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (user) => {
    if (!user.isActive) return 'bg-red-100 text-red-800';
    if (user.isAdmin) return 'bg-purple-100 text-purple-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (user) => {
    if (!user.isActive) return 'Inactive';
    if (user.isAdmin) return 'Admin';
    return 'Active';
  };

  const getSeniorityLevel = (yearsOfService) => {
    if (yearsOfService >= 15) return 'Senior';
    if (yearsOfService >= 10) return 'Experienced';
    if (yearsOfService >= 5) return 'Mid-level';
    return 'Junior';
  };

  const getSeniorityColor = (yearsOfService) => {
    if (yearsOfService >= 15) return 'text-purple-600 bg-purple-100';
    if (yearsOfService >= 10) return 'text-blue-600 bg-blue-100';
    if (yearsOfService >= 5) return 'text-green-600 bg-green-100';
    return 'text-orange-600 bg-orange-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-3 text-gray-600">
            Manage all users in the shift bidding system
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => fetchUsers()}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreating(true)}
            variant="primary"
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="admin">Admins</option>
                <option value="pending">Pending</option>
                <option value="senior">Senior (10+ years)</option>
                <option value="junior">Junior (&lt;5 years)</option>
                <option value="assigned">Assigned to Station</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="px-6 py-5 border-b border-rigroster-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium text-gray-900">
              Users ({filteredUsers.length})
            </h3>
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      User
                      {sortBy === 'name' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rank')}
                  >
                    <div className="flex items-center">
                      Position
                      {sortBy === 'rank' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('seniority')}
                  >
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Seniority
                      {sortBy === 'seniority' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-sm text-gray-500">{user.phone}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.rank}</div>
                      <div className="text-sm text-gray-500">{user.position}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">
                          {calculateSeniorityScore(user)}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeniorityColor(user.yearsOfService || 0)}`}>
                          {getSeniorityLevel(user.yearsOfService || 0)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {user.yearsOfService || 0} years
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user)}`}>
                        {getStatusText(user)}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {user.currentStation?.name || 'Unassigned'}
                          </div>
                          {user.currentStation && user.currentShift && (
                            <div className="text-xs text-gray-500">
                              Shift {user.currentShift}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={() => handleViewUser(user)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditUser(user)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleAssignStation(user)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                          title="Assign Station"
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                        {user._id !== currentUser?._id && (
                          <Button
                            onClick={() => handleDeleteUser(user._id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'No users have been added yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  reset();
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...register('firstName', { required: 'First name is required' })}
                    className="input"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...register('lastName', { required: 'Last name is required' })}
                    className="input"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="input"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  {...register('employeeId', { required: 'Employee ID is required' })}
                  className="input"
                />
                {errors.employeeId && (
                  <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rank
                  </label>
                  <select
                    {...register('rank')}
                    className="input"
                  >
                    <option value="">Select Rank</option>
                    <option value="Firefighter">Firefighter</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Lieutenant">Lieutenant</option>
                    <option value="Captain">Captain</option>
                    <option value="Battalion Chief">Battalion Chief</option>
                    <option value="Deputy Chief">Deputy Chief</option>
                    <option value="Chief">Chief</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    {...register('position')}
                    className="input"
                  >
                    <option value="">Select Position</option>
                    <option value="Firefighter">Firefighter</option>
                    <option value="Paramedic">Paramedic</option>
                    <option value="EMT">EMT</option>
                    <option value="Driver">Driver</option>
                    <option value="Operator">Operator</option>
                    <option value="Officer">Officer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Service
                </label>
                <input
                  type="number"
                  {...register('yearsOfService', { 
                    min: { value: 0, message: 'Years must be 0 or greater' },
                    max: { value: 50, message: 'Years cannot exceed 50' }
                  })}
                  className="input"
                  min="0"
                  max="50"
                  placeholder="0"
                />
                {errors.yearsOfService && (
                  <p className="mt-1 text-sm text-red-600">{errors.yearsOfService.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isAdmin')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Admin Access</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    defaultChecked
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditing && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedUser(null);
                  resetEdit();
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleEditSubmit(handleUpdateUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...registerEdit('firstName', { required: 'First name is required' })}
                    className="input"
                  />
                  {editErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...registerEdit('lastName', { required: 'Last name is required' })}
                    className="input"
                  />
                  {editErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...registerEdit('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="input"
                />
                {editErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  {...registerEdit('phone')}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rank
                  </label>
                  <select
                    {...registerEdit('rank')}
                    className="input"
                  >
                    <option value="">Select Rank</option>
                    <option value="Firefighter">Firefighter</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Lieutenant">Lieutenant</option>
                    <option value="Captain">Captain</option>
                    <option value="Battalion Chief">Battalion Chief</option>
                    <option value="Deputy Chief">Deputy Chief</option>
                    <option value="Chief">Chief</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    {...registerEdit('position')}
                    className="input"
                  >
                    <option value="">Select Position</option>
                    <option value="Firefighter">Firefighter</option>
                    <option value="Paramedic">Paramedic</option>
                    <option value="EMT">EMT</option>
                    <option value="Driver">Driver</option>
                    <option value="Operator">Operator</option>
                    <option value="Officer">Officer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Service
                </label>
                <input
                  type="number"
                  {...registerEdit('yearsOfService', { 
                    min: { value: 0, message: 'Years must be 0 or greater' },
                    max: { value: 50, message: 'Years cannot exceed 50' }
                  })}
                  className="input"
                  min="0"
                  max="50"
                />
                {editErrors.yearsOfService && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.yearsOfService.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...registerEdit('isAdmin')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Admin Access</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...registerEdit('isActive')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedUser(null);
                    resetEdit();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Details</h3>
              <Button
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">ID: {selectedUser.employeeId}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{selectedUser.email}</span>
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{selectedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Award className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{selectedUser.rank} - {selectedUser.position}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{selectedUser.yearsOfService || 0} years of service</span>
                </div>
                <div className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Seniority Score: {calculateSeniorityScore(selectedUser)}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeniorityColor(selectedUser.yearsOfService || 0)}`}>
                    {getSeniorityLevel(selectedUser.yearsOfService || 0)} Level
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {selectedUser.currentStation?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Shield className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {selectedUser.isAdmin ? 'Administrator' : 'Standard User'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  {selectedUser.isActive ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                  )}
                  <span className="text-gray-600">
                    {selectedUser.isActive ? 'Active Account' : 'Inactive Account'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  onClick={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                  }}
                  variant="secondary"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowUserDetails(false);
                    handleAssignStation(selectedUser);
                  }}
                  variant="secondary"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Assign Station
                </Button>
                <Button
                  onClick={() => {
                    setShowUserDetails(false);
                    handleEditUser(selectedUser);
                  }}
                  variant="primary"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Station Assignment Modal */}
      {showStationAssignment && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Station</h3>
              <Button
                onClick={() => {
                  setShowStationAssignment(false);
                  setSelectedUser(null);
                  resetStation();
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedUser.rank} - {selectedUser.position}
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleStationSubmit(handleStationAssignment)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Station
                </label>
                <div className="text-sm text-gray-600 mb-2">
                  {selectedUser.currentStation?.name || 'Unassigned'}
                  {selectedUser.currentShift && ` - Shift ${selectedUser.currentShift}`}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Station
                </label>
                <select
                  {...registerStation('stationId')}
                  className="input"
                >
                  <option value="">Select Station</option>
                  {stations.map((station) => (
                    <option key={station._id} value={station._id}>
                      {station.name} (Station {station.number})
                    </option>
                  ))}
                </select>
                {stationErrors.stationId && (
                  <p className="mt-1 text-sm text-red-600">{stationErrors.stationId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift
                </label>
                <select
                  {...registerStation('shift', { required: 'Shift is required' })}
                  className="input"
                >
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                </select>
                {stationErrors.shift && (
                  <p className="mt-1 text-sm text-red-600">{stationErrors.shift.message}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Settings className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Station Assignment Rules:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• Users can only be assigned to one station at a time</li>
                      <li>• Station capacity will be checked automatically</li>
                      <li>• Previous assignments will be cleared</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowStationAssignment(false);
                    setSelectedUser(null);
                    resetStation();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Assign Station
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
