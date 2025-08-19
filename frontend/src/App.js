import React, { useState, useEffect } from 'react';
import { Plus, Eye, TrendingUp, Calculator, BarChart3 } from 'lucide-react';

// API base URL
const API_BASE = 'http://localhost:3001/api';

// API utility function
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Main App Component
const OptionThetaIQApp = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/base-positions');
      setPositions(data);
    } catch (error) {
      console.error('Failed to load positions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dashboard Component
  const Dashboard = () => {
    const [overview, setOverview] = useState({});

    useEffect(() => {
      const loadOverview = async () => {
        try {
          const data = await apiCall('/dashboard/overview');
          setOverview(data);
        } catch (error) {
          console.error('Failed to load overview:', error);
        }
      };
      loadOverview();
    }, []);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
          <button
            onClick={() => setActiveView('new-position')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            New Position
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Positions</p>
                <p className="text-2xl font-bold">{overview.total_positions || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Positions</p>
                <p className="text-2xl font-bold text-green-600">{overview.open_positions || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">
                  ${parseFloat(overview.total_credits || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">+</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Value</p>
                <p className={`text-2xl font-bold ${
                  parseFloat(overview.total_net_value || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${parseFloat(overview.total_net_value || 0).toLocaleString()}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Positions List */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Positions</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">Loading positions...</div>
            ) : (
              <PositionsList positions={positions} onViewPosition={(pos) => {
                setSelectedPosition(pos);
                setActiveView('position-detail');
              }} />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Positions List Component
  const PositionsList = ({ positions, onViewPosition }) => {
    if (!positions.length) {
      return (
        <div className="p-8 text-center text-gray-500">
          No positions found. Create your first position to get started.
        </div>
      );
    }

    return (
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Value</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {positions.map((position) => (
            <tr key={position.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{position.symbol}</div>
                <div className="text-sm text-gray-500">${position.underlying_price}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="capitalize">{position.strategy_type.replace('_', ' ')}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  position.position_status === 'open' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {position.position_status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-green-600">
                ${parseFloat(position.total_credits || 0).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={parseFloat(position.net_position_value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${parseFloat(position.net_position_value || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onViewPosition(position)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // New Position Form
  const NewPositionForm = () => {
    const [formData, setFormData] = useState({
      symbol: '',
      strategy_type: 'covered_call',
      underlying_price: '',
      notes: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        await apiCall('/base-positions', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setActiveView('dashboard');
        loadPositions();
      } catch (error) {
        alert('Failed to create position: ' + error.message);
      }
    };

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-2xl font-bold mb-6">Create New Position</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Strategy Type</label>
              <select
                value={formData.strategy_type}
                onChange={(e) => setFormData({...formData, strategy_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="covered_call">Covered Call</option>
                <option value="pmcc">Poor Man's Covered Call</option>
                <option value="cash_secured_put">Cash Secured Put</option>
                <option value="iron_condor">Iron Condor</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Underlying Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.underlying_price}
                onChange={(e) => setFormData({...formData, underlying_price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Position
              </button>
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Position Detail Component (simplified for now)
  const PositionDetail = ({ position }) => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <button
              onClick={() => setActiveView('dashboard')}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{position.position_name}</h1>
            <p className="text-gray-600">{position.symbol} - {position.strategy_type.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium mb-4">Position Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Symbol</p>
              <p className="font-semibold">{position.symbol}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Strategy</p>
              <p className="font-semibold capitalize">{position.strategy_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Underlying Price</p>
              <p className="font-semibold">${position.underlying_price}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold capitalize">{position.position_status}</p>
            </div>
          </div>
          {position.notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Notes</p>
              <p className="font-semibold">{position.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Option Theta IQ</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('calculators')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'calculators'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Calculators
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'new-position' && <NewPositionForm />}
        {activeView === 'position-detail' && <PositionDetail position={selectedPosition} />}
        {activeView === 'calculators' && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Calculators & Analytics</h2>
            <p className="text-gray-600">Advanced calculators and analytics tools coming soon!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default OptionThetaIQApp;