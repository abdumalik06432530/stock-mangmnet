import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  Truck,
  Warehouse,
  CheckCircle,
  Clock,
  AlertCircle,
  Users
} from 'lucide-react';
import { backendUrl } from '../../config';
import OrdersTab from './OrdersTab';
import StockTab from './StockTab';

const FactoryManagerDashboard = ({ token = null }) => {
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();
  const navigate = useNavigate();

  // Unauthorized access UI with reduced size
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-2">
        <div className="bg-white p-6 rounded-2xl shadow-lg max-w-md w-full text-center transform transition-all duration-300 hover:scale-105">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-gray-900">Unauthorized Access</h3>
          <p className="text-gray-600 mt-2 text-sm">Please log in to access the Factory Manager dashboard.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Fetch all data with Promise.all
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ordersRes, stockRes, driversRes] = await Promise.all([
        axios.get(`${backendUrl}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${backendUrl}/api/factory/stock`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${backendUrl}/api/drivers`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      setOrders(ordersRes.data.orders || ordersRes.data);
      setStock(stockRes.data.stock || []);
      setDrivers(driversRes.data.drivers || []);
    } catch (err) {
      console.error('Failed to load data', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update active tab based on URL path
  useEffect(() => {
    try {
      const path = location.pathname || '';
      if (path.includes('/shops/orders')) setActiveTab('orders');
      else if (path.includes('/shops/stock-management')) setActiveTab('stock');
      else setActiveTab('overview');
    } catch (e) {
      console.error('Error parsing path:', e);
    }
  }, [location.pathname]);

  const stats = {
    totalOrders: orders.length,
    pendingApproval: orders.filter((o) => o.status === 'Pending Approval').length,
    inProduction: orders.filter((o) => o.status === 'Processing').length,
    outForDelivery: orders.filter((o) => o.status === 'Out for Delivery').length,
    delivered: orders.filter((o) => o.status === 'Delivered').length,
    lowStock: stock.filter((item) => item.quantity < 10).length,
    totalProducts: stock.length,
    availableDrivers: drivers.filter((d) => d.status === 'Approved' && d.available).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white rounded-b-2xl shadow-lg p-4 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Factory Manager Dashboard</h1>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 rounded-2xl p-6 animate-fade-in">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab 
                  stats={stats} 
                  orders={orders}
                  stock={stock}
                  drivers={drivers}
                />
              )}
              {activeTab === 'orders' && (
                <OrdersTab
                  orders={orders}
                  setOrders={setOrders}
                  loading={loading}
                  stock={stock}
                  drivers={drivers}
                  token={token}
                />
              )}
              {activeTab === 'stock' && (
                <StockTab
                  stock={stock}
                  setStock={setStock}
                  loading={loading}
                  fetchStock={fetchAllData}
                  token={token}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// Overview Tab Component with Reduced Size
const OverviewTab = ({ stats, orders, stock, drivers }) => {
  const recentOrders = orders.slice(0, 5);
  const lowStockItems = stock.filter(item => item.quantity < 10);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Approval', value: stats.pendingApproval, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'In Production', value: stats.inProduction, icon: Package, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Out for Delivery', value: stats.outForDelivery, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Low Stock Items', value: stats.lowStock, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total Products', value: stats.totalProducts, icon: Warehouse, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Available Drivers', value: stats.availableDrivers, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-md p-4 hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 ${stat.bg}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 tracking-tight">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.bg} transform transition-transform duration-200 hover:scale-105`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders and Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No recent orders available</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Order #{order._id?.slice(-8)}</p>
                    <p className="text-xs text-gray-500 capitalize">{order.furnitureType} • {order.quantity} items</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Pending Approval' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Low Stock Alerts</h3>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">All stock levels are good</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200"
                >
                  <div>
                    <p className="font-semibold text-red-900 text-sm capitalize">{item.productType}</p>
                    <p className="text-xs text-red-700">Only {item.quantity} items left</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FactoryManagerDashboard;