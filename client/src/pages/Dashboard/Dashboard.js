import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Building2, 
  Clock, 
  Award, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Button from '../../components/UI/Button';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Years of Service',
      value: user?.yearsOfService || 0,
      icon: Award,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Current Station',
      value: user?.currentStation?.name || 'Unassigned',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Current Shift',
      value: user?.currentShift || 'N/A',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Bid Priority',
      value: user?.bidPriority || 0,
      icon: User,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="mt-2 text-primary-100">
                {user?.rank} • {user?.position} • Employee #{user?.employeeId}
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Bid Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Current Bid Status</h3>
          </div>
          <div className="card-body">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">No active bid session</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              When a bid session is active, you'll see your position in the queue and time remaining to bid.
            </p>
            <div className="mt-4">
              <Button variant="primary" size="sm">
                View Available Sessions
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Profile Updated</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Login</p>
                  <p className="text-xs text-gray-500">Today at 8:30 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="secondary" className="h-20 flex-col">
              <User className="w-6 h-6 mb-2" />
              <span>Update Profile</span>
            </Button>
            <Button variant="secondary" className="h-20 flex-col">
              <Building2 className="w-6 h-6 mb-2" />
              <span>View Stations</span>
            </Button>
            <Button variant="secondary" className="h-20 flex-col">
              <Calendar className="w-6 h-6 mb-2" />
              <span>Bid History</span>
            </Button>
            <Button variant="secondary" className="h-20 flex-col">
              <Award className="w-6 h-6 mb-2" />
              <span>Seniority Info</span>
            </Button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Bidding System</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Real-time Updates</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Database</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
