import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Award, 
  Clock, 
  User, 
  Star,
  Download,
  RefreshCw,
  Users,
  Calendar,
  Building2,
  Eye,
  Edit3,
  X,
  Save,
  Plus,
  Minus,
  MapPin
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SeniorityManagement = () => {
  // eslint-disable-next-line no-unused-vars
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('seniority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [isEditingSeniority, setIsEditingSeniority] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    yearsOfService: 0,
    rank: '',
    position: '',
    manualSeniorityScore: 0
  });
  const [showStationAssignment, setShowStationAssignment] = useState(false);
  const [stationAssignmentForm, setStationAssignmentForm] = useState({
    stationId: '',
    shift: 'A'
  });

  // Calculate seniority score for display
  const calculateSeniorityScore = (user) => {
    if (!user) return 0;
    
    // If user has a manual seniority score, use that
    if (user.manualSeniorityScore && user.manualSeniorityScore > 0) {
      return user.manualSeniorityScore;
    }
    
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

  const getRankColor = (rank) => {
    const colors = {
      'Firefighter': 'text-gray-600',
      'Engineer': 'text-blue-600',
      'Lieutenant': 'text-green-600',
      'Captain': 'text-purple-600',
      'Battalion Chief': 'text-orange-600',
      'Deputy Chief': 'text-red-600',
      'Chief': 'text-indigo-600'
    };
    return colors[rank] || 'text-gray-600';
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
      const response = await api.get('/stations');
      setStations(response.data.stations || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load stations');
    }
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
      case 'senior':
        filtered = filtered.filter(user => (user.yearsOfService || 0) >= 15);
        break;
      case 'experienced':
        filtered = filtered.filter(user => (user.yearsOfService || 0) >= 10 && (user.yearsOfService || 0) < 15);
        break;
      case 'mid-level':
        filtered = filtered.filter(user => (user.yearsOfService || 0) >= 5 && (user.yearsOfService || 0) < 10);
        break;
      case 'junior':
        filtered = filtered.filter(user => (user.yearsOfService || 0) < 5);
        break;
      case 'admin':
        filtered = filtered.filter(user => user.isAdmin);
        break;
      case 'manual':
        filtered = filtered.filter(user => user.manualSeniorityScore && user.manualSeniorityScore > 0);
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
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
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'position':
          aValue = a.position || '';
          bValue = b.position || '';
          break;
        default:
          aValue = calculateSeniorityScore(a);
          bValue = calculateSeniorityScore(b);
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  // eslint-disable-next-line no-unused-vars
  const handleEditUser = (user) => {
    // Navigate to user management for editing
    window.location.href = `/admin/users?edit=${user._id}`;
  };

  const handleEditSeniority = (user) => {
    setEditingUser(user);
    setEditForm({
      yearsOfService: user.yearsOfService || 0,
      rank: user.rank || '',
      position: user.position || '',
      manualSeniorityScore: user.manualSeniorityScore || 0
    });
    setIsEditingSeniority(true);
  };

  const handleSaveSeniority = async () => {
    try {
      const response = await api.put(`/admin/users/${editingUser._id}`, {
        yearsOfService: editForm.yearsOfService,
        rank: editForm.rank,
        position: editForm.position,
        manualSeniorityScore: editForm.manualSeniorityScore
      });

      // Update the user in the local state
      setUsers(users.map(user => 
        user._id === editingUser._id ? response.data.user : user
      ));

      setIsEditingSeniority(false);
      setEditingUser(null);
      setEditForm({
        yearsOfService: 0,
        rank: '',
        position: '',
        manualSeniorityScore: 0
      });

      toast.success('Seniority updated successfully');
    } catch (error) {
      console.error('Error updating seniority:', error);
      toast.error(error.response?.data?.error || 'Failed to update seniority');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingSeniority(false);
    setEditingUser(null);
    setEditForm({
      yearsOfService: 0,
      rank: '',
      position: '',
      manualSeniorityScore: 0
    });
  };

  const handleQuickAdjust = async (user, adjustment) => {
    try {
      const newYearsOfService = Math.max(0, (user.yearsOfService || 0) + adjustment);
      const response = await api.put(`/admin/users/${user._id}`, {
        yearsOfService: newYearsOfService
      });

      setUsers(users.map(u => 
        u._id === user._id ? response.data.user : u
      ));

      toast.success(`Years of service ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`);
    } catch (error) {
      console.error('Error adjusting seniority:', error);
      toast.error('Failed to adjust seniority');
    }
  };

  const handleAssignStation = async (user) => {
    setEditingUser(user);
    setStationAssignmentForm({
      stationId: user.currentStation?._id || '',
      shift: user.currentShift || 'A'
    });
    setShowStationAssignment(true);
  };

  const handleSaveStationAssignment = async () => {
    try {
      const response = await api.put(`/admin/users/${editingUser._id}/station`, {
        stationId: stationAssignmentForm.stationId,
        shift: stationAssignmentForm.shift
      });

      setUsers(users.map(user => 
        user._id === editingUser._id ? response.data.user : user
      ));

      setShowStationAssignment(false);
      setEditingUser(null);
      setStationAssignmentForm({
        stationId: '',
        shift: 'A'
      });

      toast.success('Station assigned successfully');
    } catch (error) {
      console.error('Error assigning station:', error);
      toast.error(error.response?.data?.error || 'Failed to assign station');
    }
  };

  const handleCancelStationAssignment = () => {
    setShowStationAssignment(false);
    setEditingUser(null);
    setStationAssignmentForm({
      stationId: '',
      shift: 'A'
    });
  };

  const exportSeniorityList = () => {
    const csvContent = [
      ['Rank', 'Name', 'Employee ID', 'Rank', 'Position', 'Years of Service', 'Seniority Score', 'Seniority Level', 'Station', 'Manual Score'],
      ...filteredUsers.map((user, index) => [
        index + 1,
        `${user.firstName} ${user.lastName}`,
        user.employeeId,
        user.rank,
        user.position,
        user.yearsOfService || 0,
        calculateSeniorityScore(user),
        getSeniorityLevel(user.yearsOfService || 0),
        user.currentStation?.name || 'Unassigned',
        user.manualSeniorityScore || 'Auto-calculated'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seniority-list.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Seniority list exported successfully');
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
          <h1 className="text-3xl font-bold text-gray-900">Seniority Management</h1>
          <p className="mt-3 text-gray-600">
            View and manage seniority rankings for all users
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
            onClick={exportSeniorityList}
            variant="primary"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export List
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Senior (15+ years)</p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredUsers.filter(u => (u.yearsOfService || 0) >= 15).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Manual Adjustments</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredUsers.filter(u => u.manualSeniorityScore && u.manualSeniorityScore > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredUsers.length > 0 
                    ? Math.round(filteredUsers.reduce((sum, user) => sum + calculateSeniorityScore(user), 0) / filteredUsers.length)
                    : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
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
                <option value="senior">Senior (15+ years)</option>
                <option value="experienced">Experienced (10-14 years)</option>
                <option value="mid-level">Mid-level (5-9 years)</option>
                <option value="junior">Junior (&lt;5 years)</option>
                <option value="admin">Admins</option>
                <option value="manual">Manual Adjustments</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Seniority List */}
      <div className="card">
        <div className="px-6 py-5 border-b border-rigroster-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium text-gray-900">
              Seniority Rankings ({filteredUsers.length})
            </h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="input text-sm"
              >
                <option value="seniority">Seniority Score</option>
                <option value="yearsOfService">Years of Service</option>
                <option value="rank">Rank</option>
                <option value="name">Name</option>
                <option value="position">Position</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seniority
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
                {filteredUsers.map((user, index) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">#{index + 1}</div>
                        <div className="text-xs text-gray-500">
                          {user.isAdmin && <span className="text-purple-600">Admin</span>}
                          {user.manualSeniorityScore && user.manualSeniorityScore > 0 && (
                            <span className="text-orange-600 ml-1">Manual</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
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
                      <div className="text-sm text-gray-900">
                        <span className={`font-medium ${getRankColor(user.rank)}`}>
                          {user.rank}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">{user.position}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">
                          {calculateSeniorityScore(user)}
                          {user.manualSeniorityScore && user.manualSeniorityScore > 0 && (
                            <span className="text-orange-600 ml-1">*</span>
                          )}
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
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                      {user.currentStation?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleViewUser(user)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditSeniority(user)}
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:text-orange-800"
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
                        <Button
                          onClick={() => handleQuickAdjust(user, 1)}
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-800"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleQuickAdjust(user, -1)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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

      {/* Edit Seniority Modal */}
      {isEditingSeniority && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Seniority</h3>
              <Button
                onClick={handleCancelEdit}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {editingUser.firstName} {editingUser.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">ID: {editingUser.employeeId}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Service
                  </label>
                  <input
                    type="number"
                    value={editForm.yearsOfService}
                    onChange={(e) => setEditForm({...editForm, yearsOfService: parseInt(e.target.value) || 0})}
                    className="input"
                    min="0"
                    max="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rank
                  </label>
                  <select
                    value={editForm.rank}
                    onChange={(e) => setEditForm({...editForm, rank: e.target.value})}
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
                    value={editForm.position}
                    onChange={(e) => setEditForm({...editForm, position: e.target.value})}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manual Seniority Score (0 = Auto-calculated)
                  </label>
                  <input
                    type="number"
                    value={editForm.manualSeniorityScore}
                    onChange={(e) => setEditForm({...editForm, manualSeniorityScore: parseInt(e.target.value) || 0})}
                    className="input"
                    min="0"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set to 0 to use auto-calculated score based on years, rank, and position
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Current Score:</strong> {calculateSeniorityScore(editingUser)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Seniority Level:</strong> {getSeniorityLevel(editingUser.yearsOfService || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  onClick={handleCancelEdit}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSeniority}
                  variant="primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Station Assignment Modal */}
      {showStationAssignment && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Station</h3>
              <Button
                onClick={handleCancelStationAssignment}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> After assigning a station, you may need to refresh the Station Management tab to see the updated assignments.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {editingUser.firstName} {editingUser.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">ID: {editingUser.employeeId}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Station
                  </label>
                  <select
                    value={stationAssignmentForm.stationId}
                    onChange={(e) => setStationAssignmentForm({...stationAssignmentForm, stationId: e.target.value})}
                    className="input"
                  >
                    <option value="">Select Station</option>
                    {stations.map(station => (
                      <option key={station._id} value={station._id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift
                  </label>
                  <select
                    value={stationAssignmentForm.shift}
                    onChange={(e) => setStationAssignmentForm({...stationAssignmentForm, shift: e.target.value})}
                    className="input"
                  >
                    <option value="A">A Shift</option>
                    <option value="B">B Shift</option>
                    <option value="C">C Shift</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  onClick={handleCancelStationAssignment}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveStationAssignment}
                  variant="primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Assignment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Seniority Details</h3>
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
                  <User className="w-6 h-6 text-primary-600" />
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
                  <Award className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Rank:</span>
                  <span className="ml-auto font-medium text-gray-900">{selectedUser.rank}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Star className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Position:</span>
                  <span className="ml-auto font-medium text-gray-900">{selectedUser.position}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Years of Service:</span>
                  <span className="ml-auto font-medium text-gray-900">{selectedUser.yearsOfService || 0}</span>
                </div>
                <div className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Seniority Score:</span>
                  <span className="ml-auto font-medium text-gray-900">
                    {calculateSeniorityScore(selectedUser)}
                    {selectedUser.manualSeniorityScore && selectedUser.manualSeniorityScore > 0 && (
                      <span className="text-orange-600 ml-1">*</span>
                    )}
                  </span>
                </div>
                {selectedUser.manualSeniorityScore && selectedUser.manualSeniorityScore > 0 && (
                  <div className="flex items-center text-sm">
                    <Edit3 className="w-4 h-4 text-orange-400 mr-2" />
                    <span className="text-gray-600">Manual Score:</span>
                    <span className="ml-auto font-medium text-orange-600">{selectedUser.manualSeniorityScore}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeniorityColor(selectedUser.yearsOfService || 0)}`}>
                    {getSeniorityLevel(selectedUser.yearsOfService || 0)} Level
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Current Station:</span>
                  <span className="ml-auto font-medium text-gray-900">
                    {selectedUser.currentStation?.name || 'Unassigned'}
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
                    handleEditSeniority(selectedUser);
                  }}
                  variant="primary"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Seniority
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeniorityManagement;
