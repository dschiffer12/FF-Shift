import React, { useState, useEffect } from 'react';

import { Building2, MapPin, Clock } from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';

const Stations = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/stations');
      setStations(response.data.stations || []);
    } catch (err) {
      setError('Failed to load stations');
      console.error('Error fetching stations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchStations} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fire Stations</h1>
          <p className="mt-2 text-gray-600">
            View all available fire stations and their current staffing
          </p>
        </div>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => (
          <div key={station._id} className="card hover:shadow-lg transition-shadow">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="w-6 h-6 text-primary-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Station {station.number}
                  </h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  station.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {station.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="card-body">
              <h4 className="font-medium text-gray-900 mb-2">{station.name}</h4>
              
              {station.address && (
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>
                    {station.address.street}, {station.address.city}
                  </span>
                </div>
              )}
              
              {station.description && (
                <p className="text-sm text-gray-600 mb-4">{station.description}</p>
              )}

              {/* Capacity by Shift */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Capacity by Shift:</h5>
                <div className="grid grid-cols-3 gap-2">
                  {['A', 'B', 'C'].map((shift) => {
                    const capacity = station.shiftCapacity?.[shift] || 0;
                    const current = station.currentAssignments?.[shift]?.length || 0;
                    const available = capacity - current;
                    
                    return (
                      <div key={shift} className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm font-medium text-gray-900">Shift {shift}</div>
                        <div className="text-xs text-gray-600">
                          {current}/{capacity} filled
                        </div>
                        <div className={`text-xs font-medium ${
                          available > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {available} available
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Staff */}
              {station.currentAssignments && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Current Staff:</h5>
                  <div className="space-y-1">
                    {['A', 'B', 'C'].map((shift) => {
                      const assignments = station.currentAssignments[shift] || [];
                      return (
                        <div key={shift} className="flex items-center text-sm">
                          <Clock className="w-3 h-3 text-gray-400 mr-2" />
                          <span className="text-gray-600 mr-2">Shift {shift}:</span>
                          <span className="text-gray-900">
                            {assignments.length} assigned
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {stations.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Stations Found</h3>
          <p className="text-gray-600">There are no stations available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default Stations;
