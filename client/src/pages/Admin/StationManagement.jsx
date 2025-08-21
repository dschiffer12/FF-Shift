import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Building2, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  MapPin, 
  Users, 
  Clock, 
  Plus,
  Save,
  X,
  RefreshCw
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const StationManagement = () => {
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedStation, setSelectedStation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showStationDetails, setShowStationDetails] = useState(false);

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

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/stations');
      setStations(response.data.stations || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  const filterStations = useCallback(() => {
    let filtered = stations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(station => 
        station.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.number?.toString().includes(searchTerm) ||
        station.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(station => station.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(station => !station.isActive);
        break;
      case 'full':
        filtered = filtered.filter(station => station.currentOccupancy >= station.capacity);
        break;
      case 'available':
        filtered = filtered.filter(station => station.currentOccupancy < station.capacity);
        break;
      default:
        break;
    }

    setFilteredStations(filtered);
  }, [stations, searchTerm, selectedFilter]);

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    filterStations();
  }, [filterStations]);

  const handleCreateStation = async (data) => {
    try {
      // Transform the data to match API expectations
      const transformedData = {
        name: data.name,
        number: data.number,
        address: data.address,
        totalCapacity: data.capacity,
        shiftCapacity: {
          A: data.shiftACapacity || 0,
          B: data.shiftBCapacity || 0,
          C: data.shiftCCapacity || 0
        }
      };
      
      const response = await api.post('/api/stations', transformedData);
      setStations([...stations, response.data.station]);
      setIsCreating(false);
      reset();
      toast.success('Station created successfully');
    } catch (error) {
      console.error('Error creating station:', error);
      toast.error(error.response?.data?.error || 'Failed to create station');
    }
  };

  const handleUpdateStation = async (data) => {
    try {
      // Transform the data to match API expectations
      const transformedData = {
        name: data.name,
        number: data.number,
        address: data.address,
        totalCapacity: data.capacity,
        shiftCapacity: {
          A: data.shiftACapacity || 0,
          B: data.shiftBCapacity || 0,
          C: data.shiftCCapacity || 0
        },
        isActive: data.isActive
      };
      
      const response = await api.put(`/api/stations/${selectedStation._id || selectedStation.id}`, transformedData);
      setStations(stations.map(station => 
        (station._id || station.id) === (selectedStation._id || selectedStation.id) ? response.data.station : station
      ));
      setIsEditing(false);
      setSelectedStation(null);
      resetEdit();
      toast.success('Station updated successfully');
    } catch (error) {
      console.error('Error updating station:', error);
      toast.error(error.response?.data?.error || 'Failed to update station');
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (!window.confirm('Are you sure you want to delete this station? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/stations/${stationId}`);
      setStations(stations.filter(station => (station._id || station.id) !== stationId));
      toast.success('Station deleted successfully');
    } catch (error) {
      console.error('Error deleting station:', error);
      toast.error(error.response?.data?.error || 'Failed to delete station');
    }
  };

  const handleEditStation = (station) => {
    setSelectedStation(station);
    setEditValue('name', station.name || '');
    setEditValue('number', station.number || '');
    setEditValue('address', station.address || '');
    setEditValue('capacity', station.capacity ? Object.values(station.capacity).reduce((sum, val) => sum + val, 0) : 0);
    setEditValue('shiftACapacity', station.capacity?.A || 0);
    setEditValue('shiftBCapacity', station.capacity?.B || 0);
    setEditValue('shiftCCapacity', station.capacity?.C || 0);
    setEditValue('isActive', station.isActive !== false);
    setIsEditing(true);
  };

  const handleViewStation = (station) => {
    setSelectedStation(station);
    setShowStationDetails(true);
  };

  const getStatusColor = (station) => {
    if (!station.isActive) return 'bg-red-100 text-red-800';
    if (station.currentOccupancy >= station.capacity) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (station) => {
    if (!station.isActive) return 'Inactive';
    if (station.currentOccupancy >= station.capacity) return 'Full';
    return 'Available';
  };

  const getOccupancyPercentage = (station) => {
    if (!station.capacity || !station.occupancy) return 0;
    const totalCapacity = Object.values(station.capacity).reduce((sum, val) => sum + val, 0);
    const totalOccupancy = Object.values(station.occupancy).reduce((sum, val) => sum + val, 0);
    return Math.round((totalOccupancy / totalCapacity) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Station Management</h1>
          <p className="mt-2 text-gray-600">
            Manage all fire stations and their capacity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => fetchStations()}
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
            <Plus className="w-4 h-4 mr-2" />
            Add Station
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stations by name, number, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Stations</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="full">Full</option>
                <option value="available">Available</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStations.map((station) => (
          <div key={station._id || station.id} className="card hover:shadow-lg transition-shadow">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{station.name}</h3>
                    <p className="text-sm text-gray-500">Station #{station.number}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(station)}`}>
                  {getStatusText(station)}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600 truncate">{station.address}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">
                    {station.occupancy ? Object.values(station.occupancy).reduce((sum, val) => sum + val, 0) : 0}/
                    {station.capacity ? Object.values(station.capacity).reduce((sum, val) => sum + val, 0) : 0}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      getOccupancyPercentage(station) >= 90 ? 'bg-red-500' :
                      getOccupancyPercentage(station) >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(getOccupancyPercentage(station), 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-blue-600">Shift A</div>
                    <div>{station.capacity?.A || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">Shift B</div>
                    <div>{station.capacity?.B || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-600">Shift C</div>
                    <div>{station.capacity?.C || 0}</div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Button
                    onClick={() => handleViewStation(station)}
                    variant="ghost"
                    size="sm"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleEditStation(station)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteStation(station._id || station.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStations.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Stations Found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filters.'
              : 'No stations have been added yet.'
            }
          </p>
        </div>
      )}

      {/* Create Station Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Station</h3>
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
            
            <form onSubmit={handleSubmit(handleCreateStation)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Name
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Station name is required' })}
                  className="input"
                  placeholder="e.g., Central Fire Station"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Number
                </label>
                <input
                  type="number"
                  {...register('number', { required: 'Station number is required', min: 1 })}
                  className="input"
                  placeholder="1"
                />
                {errors.number && (
                  <p className="mt-1 text-sm text-red-600">{errors.number.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  {...register('address', { required: 'Address is required' })}
                  className="input"
                  placeholder="123 Main St, City, State"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Capacity
                </label>
                <input
                  type="number"
                  {...register('capacity', { required: 'Capacity is required', min: 1 })}
                  className="input"
                  placeholder="20"
                />
                {errors.capacity && (
                  <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift A
                  </label>
                  <input
                    type="number"
                    {...register('shiftACapacity', { min: 0 })}
                    className="input"
                    placeholder="6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift B
                  </label>
                  <input
                    type="number"
                    {...register('shiftBCapacity', { min: 0 })}
                    className="input"
                    placeholder="6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift C
                  </label>
                  <input
                    type="number"
                    {...register('shiftCCapacity', { min: 0 })}
                    className="input"
                    placeholder="6"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
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
                  Create Station
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Station Modal */}
      {isEditing && selectedStation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Station</h3>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedStation(null);
                  resetEdit();
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleEditSubmit(handleUpdateStation)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Name
                </label>
                <input
                  type="text"
                  {...registerEdit('name', { required: 'Station name is required' })}
                  className="input"
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Number
                </label>
                <input
                  type="number"
                  {...registerEdit('number', { required: 'Station number is required', min: 1 })}
                  className="input"
                />
                {editErrors.number && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.number.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  {...registerEdit('address', { required: 'Address is required' })}
                  className="input"
                />
                {editErrors.address && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Capacity
                </label>
                <input
                  type="number"
                  {...registerEdit('capacity', { required: 'Capacity is required', min: 1 })}
                  className="input"
                />
                {editErrors.capacity && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.capacity.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift A
                  </label>
                  <input
                    type="number"
                    {...registerEdit('shiftACapacity', { min: 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift B
                  </label>
                  <input
                    type="number"
                    {...registerEdit('shiftBCapacity', { min: 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift C
                  </label>
                  <input
                    type="number"
                    {...registerEdit('shiftCCapacity', { min: 0 })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
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
                    setSelectedStation(null);
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
                  Update Station
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Station Details Modal */}
      {showStationDetails && selectedStation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Station Details</h3>
              <Button
                onClick={() => {
                  setShowStationDetails(false);
                  setSelectedStation(null);
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
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{selectedStation.name}</h4>
                  <p className="text-sm text-gray-500">Station #{selectedStation.number}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{selectedStation.address}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {selectedStation.occupancy ? Object.values(selectedStation.occupancy).reduce((sum, val) => sum + val, 0) : 0}/
                    {selectedStation.capacity ? Object.values(selectedStation.capacity).reduce((sum, val) => sum + val, 0) : 0} assigned
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {selectedStation.isActive ? 'Active Station' : 'Inactive Station'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h5 className="font-medium text-gray-900 mb-2">Shift Capacity</h5>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="font-medium text-blue-600">Shift A</div>
                    <div>{selectedStation.capacity?.A || 0}</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-medium text-green-600">Shift B</div>
                    <div>{selectedStation.capacity?.B || 0}</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="font-medium text-purple-600">Shift C</div>
                    <div>{selectedStation.capacity?.C || 0}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  onClick={() => {
                    setShowStationDetails(false);
                    setSelectedStation(null);
                  }}
                  variant="secondary"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowStationDetails(false);
                    handleEditStation(selectedStation);
                  }}
                  variant="primary"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Station
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationManagement;
