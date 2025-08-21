import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Award, TrendingUp, Clock, User, Star } from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';

const Seniority = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSeniorityData();
  }, []);

  const fetchSeniorityData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/seniority');
      // Store any additional seniority data if needed
      console.log('Seniority data loaded:', response.data);
    } catch (err) {
      setError('Failed to load seniority information');
      console.error('Error fetching seniority data:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const calculateSeniorityScore = () => {
    if (!user) return 0;
    
    let score = user.yearsOfService * 10;
    score *= (rankMultipliers[user.rank] || 1);
    score *= (positionMultipliers[user.position] || 1);
    
    return Math.round(score);
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
        <Button onClick={fetchSeniorityData} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }

  const seniorityScore = calculateSeniorityScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seniority Information</h1>
          <p className="mt-2 text-gray-600">
            Your seniority ranking and bid priority details
          </p>
        </div>
      </div>

      {/* Seniority Score Card */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-2xl font-bold mb-2">Seniority Score</h2>
              <p className="text-primary-100">
                This score determines your position in the bidding queue
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">
                {seniorityScore}
              </div>
              <div className="text-primary-100 text-sm">Points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seniority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-600">Name</span>
              </div>
              <span className="font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Award className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-600">Rank</span>
              </div>
              <span className={`font-medium ${getRankColor(user?.rank)}`}>
                {user?.rank}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-600">Position</span>
              </div>
              <span className="font-medium text-gray-900">
                {user?.position}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-600">Years of Service</span>
              </div>
              <span className="font-medium text-gray-900">
                {user?.yearsOfService} years
              </span>
            </div>
          </div>
        </div>

        {/* Score Calculation */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Score Calculation</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Base Score (Years × 10)</span>
              <span className="font-medium text-gray-900">
                {(user?.yearsOfService || 0) * 10}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Rank Multiplier</span>
              <span className="font-medium text-gray-900">
                × {rankMultipliers[user?.rank] || 1}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Position Multiplier</span>
              <span className="font-medium text-gray-900">
                × {positionMultipliers[user?.position] || 1}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-900">Total Score</span>
                <span className="text-lg font-bold text-primary-600">
                  {seniorityScore}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multiplier Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rank Multipliers */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Rank Multipliers</h3>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {Object.entries(rankMultipliers).map(([rank, multiplier]) => (
                <div key={rank} className="flex items-center justify-between">
                  <span className={`text-sm ${getRankColor(rank)}`}>{rank}</span>
                  <span className="text-sm font-medium text-gray-900">× {multiplier}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Position Multipliers */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Position Multipliers</h3>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {Object.entries(positionMultipliers).map(([position, multiplier]) => (
                <div key={position} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{position}</span>
                  <span className="text-sm font-medium text-gray-900">× {multiplier}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bidding Priority */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Bidding Priority</h3>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-2">
                Your current bid priority determines your position in the queue during bid sessions.
              </p>
              <p className="text-sm text-gray-500">
                Higher scores = earlier bidding position
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                #{user?.bidPriority || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Queue Position</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="card-body">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            <TrendingUp className="w-5 h-5 inline mr-2" />
            How to Improve Your Seniority Score
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Gain more years of service</li>
            <li>• Advance in rank through promotions</li>
            <li>• Obtain additional certifications (Paramedic, EMT, etc.)</li>
            <li>• Take on specialized positions (Driver, Operator, Officer)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Seniority;
