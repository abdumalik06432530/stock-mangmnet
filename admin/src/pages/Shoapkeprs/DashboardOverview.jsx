import React, { useState, useEffect } from 'react';
import { Package, Users, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import shopkeeperSim from '../../utils/shopkeeperSim';

const DashboardOverview = ({ token, shopId }) => {
  const [stats, setStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [shopId]);

  const fetchDashboardData = async () => {
    try {
      try {
        // Placeholder for backend API (commented out as per original)
        // const response = await axios.get(`/api/shops/${shopId}/dashboard`);
        // setStats(response.data.stats);
        // setRecentActivity(response.data.recentActivity);
        throw new Error('force-sim');
      } catch (e) {
        const summary = shopkeeperSim.getSummary(shopId);
        setStats({
          totalOrders: summary.totalOrders,
          pendingOrders: summary.pendingOrders,
          customerCount: summary.customerCount,
          lowStockItems: summary.lowStockItems,
        });
        setRecentActivity((summary.recentActivity || []).map(({ amount, ...rest }) => rest));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data');
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, color, gradient }) => (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-2 hover:shadow-md transition-all duration-200">
      <div className="flex items-center">
        <div className={`p-1.5 rounded-lg ${gradient} bg-opacity-10`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="ml-2">
          <p className="text-[10px] font-medium text-gray-600">{title}</p>
          <p className="text-base font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-[10px] ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-2 md:p-4 space-y-2">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Welcome back!</h1>
            <p className="text-gray-600 text-[11px]">Here's what's happening in your shop today.</p>
          </div>
          <div className="text-[10px] text-gray-500">
            Shop: {shopId} • {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          icon={Package}
          title="Total Orders"
          value={stats.totalOrders || 0}
          change={12}
          color="text-blue-600"
          gradient="bg-gradient-to-br from-blue-100 to-blue-50"
        />
        <StatCard
          icon={Package}
          title="Pending Orders"
          value={stats.pendingOrders || 0}
          change={8}
          color="text-indigo-600"
          gradient="bg-gradient-to-br from-indigo-100 to-indigo-50"
        />
        <StatCard
          icon={Users}
          title="Customers"
          value={stats.customerCount || 0}
          change={5}
          color="text-purple-600"
          gradient="bg-gradient-to-br from-purple-100 to-purple-50"
        />
        <StatCard
          icon={AlertTriangle}
          title="Low Stock Items"
          value={stats.lowStockItems || 0}
          color="text-orange-600"
          gradient="bg-gradient-to-br from-orange-100 to-orange-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-2">
          <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5">Recent Activity</h3>
          <div className="space-y-1">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 p-1 border border-gray-200 rounded-lg hover:bg-gradient-to-r from-gray-50 to-gray-100 transition-all duration-200"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    activity.type === 'sale'
                      ? 'bg-green-100 text-green-600'
                      : activity.type === 'order'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  <Package className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-[11px]">{activity.description}</p>
                  <p className="text-[10px] text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-2">
          <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5">Quick Actions</h3>
          <div className="space-y-1">
            <button className="w-full flex items-center justify-between p-1.5 border border-gray-200 rounded-lg hover:bg-gradient-to-r from-indigo-50 to-blue-50 transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Package className="h-3 w-3 text-blue-600" />
                <span className="font-medium text-gray-900 text-[11px]">Place New Order</span>
              </div>
              <span className="text-gray-400 text-[10px]">→</span>
            </button>
            <button className="w-full flex items-center justify-between p-1.5 border border-gray-200 rounded-lg hover:bg-gradient-to-r from-green-50 to-green-100 transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Package className="h-3 w-3 text-green-600" />
                <span className="font-medium text-gray-900 text-[11px]">Record Sale</span>
              </div>
              <span className="text-gray-400 text-[10px]">→</span>
            </button>
            <button className="w-full flex items-center justify-between p-1.5 border border-gray-200 rounded-lg hover:bg-gradient-to-r from-purple-50 to-purple-100 transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3 text-purple-600" />
                <span className="font-medium text-gray-900 text-[11px]">Manage Customers</span>
              </div>
              <span className="text-gray-400 text-[10px]">→</span>
            </button>
            <button className="w-full flex items-center justify-between p-1.5 border border-gray-200 rounded-lg hover:bg-gradient-to-r from-orange-50 to-orange-100 transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Package className="h-3 w-3 text-orange-600" />
                <span className="font-medium text-gray-900 text-[11px]">View Reports</span>
              </div>
              <span className="text-gray-400 text-[10px]">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stock Alert */}
      {stats.lowStockItems > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-3 w-3 text-orange-600" />
              <div>
                <h3 className="text-[11px] font-semibold text-orange-900">Low Stock Alert</h3>
                <p className="text-[10px] text-orange-700">
                  You have {stats.lowStockItems} items running low on stock. Consider placing new orders.
                </p>
              </div>
            </div>
            <button className="px-1.5 py-0.25 bg-orange-600 text-white text-[10px] rounded-lg hover:bg-orange-700 transition-all duration-200">
              View Stock
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;