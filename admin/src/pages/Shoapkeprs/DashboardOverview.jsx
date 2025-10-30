import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from 'lucide-react';
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
      // Try backend, otherwise use simulator
      try {
        // attempt backend (if exists) - placeholder
        // const response = await axios.get(`/api/shops/${shopId}/dashboard`);
        // setStats(response.data.stats);
        // setRecentActivity(response.data.recentActivity);
        // For now, fall through to simulator
        throw new Error('force-sim');
      } catch (e) {
        const summary = shopkeeperSim.getSummary(shopId);
        setStats({
          totalOrders: summary.totalOrders,
          pendingOrders: summary.pendingOrders,
          totalSales: summary.totalSales,
          lowStockItems: summary.lowStockItems,
          customerCount: summary.customerCount
        });
        setRecentActivity(summary.recentActivity || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data');
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
            <p className="text-gray-600">Here's what's happening in your shop today.</p>
          </div>
          <div className="text-sm text-gray-500">
            Shop: {shopId} • {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          title="Total Orders"
          value={stats.totalOrders}
          change={12}
          color="text-blue-600"
        />
        <StatCard
          icon={ShoppingCart}
          title="Total Sales"
          value={`$${stats.totalSales?.toLocaleString()}`}
          change={8}
          color="text-green-600"
        />
        <StatCard
          icon={Users}
          title="Customers"
          value={stats.customerCount}
          change={5}
          color="text-purple-600"
        />
        <StatCard
          icon={AlertTriangle}
          title="Low Stock Items"
          value={stats.lowStockItems}
          color="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.type === 'sale' ? 'bg-green-100 text-green-600' :
                  activity.type === 'order' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {activity.type === 'sale' && <ShoppingCart className="h-5 w-5" />}
                  {activity.type === 'order' && <Package className="h-5 w-5" />}
                  {activity.type === 'delivery' && <TrendingUp className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
                {activity.amount && (
                  <div className="text-right">
                    <p className="font-medium text-green-600">+${activity.amount}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Place New Order</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
            <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Record Sale</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
            <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-900">Manage Customers</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
            <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-gray-900">View Reports</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stock Alert */}
      {stats.lowStockItems > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900">Low Stock Alert</h3>
                <p className="text-orange-700">
                  You have {stats.lowStockItems} items running low on stock. Consider placing new orders.
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              View Stock
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;