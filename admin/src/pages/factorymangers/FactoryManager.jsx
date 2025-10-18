import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../config';
import { toast } from 'react-toastify';
import { 
  Package, 
  Truck, 
  Warehouse, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Users,
  BarChart3,
  RefreshCw,
  Filter
} from 'lucide-react';

const FactoryManager = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch all orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) setOrders(res.data.orders || res.data);
    } catch (err) {
      console.error('Failed to load orders', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch factory stock
  const fetchStock = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/factory/stock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStock(res.data.stock || []);
    } catch (err) {
      console.error('Failed to load stock', err);
      toast.error('Failed to load stock');
    }
  };

  useEffect(() => { 
    fetchOrders();
    fetchStock();
  }, []);

  // Accept order from shopkeeper
  const acceptOrder = async (orderId) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/orders/${orderId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: 'Pending Approval' } : order
        ));
        toast.success('Order accepted and sent for admin approval');
      }
    } catch (err) {
      console.error('Failed to accept order', err);
      toast.error(err.response?.data?.message || 'Failed to accept order');
    }
  };

  // Assign driver after admin approval
  const assignDriver = async (orderId, driverName) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/orders/${orderId}/assign-driver`,
        { driver: driverName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: 'Out for Delivery', driver: driverName } : order
        ));
        
        // Auto-deduct components from factory stock
        deductComponentsFromStock(orderId);
        toast.success(`Driver ${driverName} assigned to order`);
      }
    } catch (err) {
      console.error('Failed to assign driver', err);
      toast.error(err.response?.data?.message || 'Failed to assign driver');
    }
  };

  // Simulate component deduction from factory stock
  const deductComponentsFromStock = (orderId) => {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;

    // Component requirements for different chair types
    const componentRequirements = {
      'chair_with_headrest': {
        back: 1, seat: 1, arms: 2, mechanism: 1, gaslift: 1, castor: 5, headrest: 1
      },
      'chair_no_headrest': {
        back: 1, seat: 1, arms: 2, mechanism: 1, gaslift: 1, castor: 5, headrest: 0
      }
    };

    const requirements = componentRequirements[order.chairType] || componentRequirements['chair_no_headrest'];
    
    setStock(prev => prev.map(item => {
      const quantityUsed = requirements[item.componentType] * order.quantity;
      if (quantityUsed > 0 && item.componentType in requirements) {
        return {
          ...item,
          quantity: Math.max(0, item.quantity - quantityUsed)
        };
      }
      return item;
    }));
  };

  // Add stock for accessories
  const addStock = async (componentType, quantity) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/factory/stock`,
        { componentType, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        await fetchStock();
        toast.success(`Added ${quantity} ${componentType} to factory stock`);
      }
    } catch (err) {
      console.error('Failed to add stock', err);
      toast.error(err.response?.data?.message || 'Failed to add stock');
    }
  };

  // Filter orders by status
  const filteredOrders = orders.filter(order => 
    filterStatus === 'all' || order.status === filterStatus
  );

  // Statistics
  const stats = {
    totalOrders: orders.length,
    pendingApproval: orders.filter(o => o.status === 'Pending Approval').length,
    inProduction: orders.filter(o => o.status === 'Processing').length,
    outForDelivery: orders.filter(o => o.status === 'Out for Delivery').length,
    lowStock: stock.filter(item => item.quantity < 10).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Warehouse className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Factory Manager Dashboard</h1>
                <p className="text-gray-600">Manage orders, production, and component stock</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchOrders}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingApproval}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Production</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProduction}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Out for Delivery</p>
                <p className="text-2xl font-bold text-purple-600">{stats.outForDelivery}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowStock}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b">
            {[
              { id: 'orders', name: 'Orders', icon: Package },
              { id: 'stock', name: 'Component Stock', icon: Warehouse },
              { id: 'production', name: 'Production', icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 flex-1 py-4 px-6 text-center font-medium capitalize transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'orders' && (
            <OrdersTab 
              orders={filteredOrders}
              loading={loading}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              acceptOrder={acceptOrder}
              assignDriver={assignDriver}
            />
          )}

          {activeTab === 'stock' && (
            <StockTab 
              stock={stock}
              loading={loading}
              addStock={addStock}
              fetchStock={fetchStock}
            />
          )}

          {activeTab === 'production' && (
            <ProductionTab 
              orders={orders}
              stock={stock}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Orders Management Tab
const OrdersTab = ({ orders, loading, filterStatus, setFilterStatus, acceptOrder, assignDriver }) => {
  const [driverAssignments, setDriverAssignments] = useState({});

  const handleAssignDriver = (orderId) => {
    const driverName = driverAssignments[orderId] || '';
    if (!driverName.trim()) {
      toast.error('Please enter driver name');
      return;
    }
    assignDriver(orderId, driverName);
    setDriverAssignments(prev => ({ ...prev, [orderId]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Order Management</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Processing">Processing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No orders found</p>
            <p className="text-gray-400">Orders from shopkeepers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Pending Approval' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Order #{order._id?.slice(-8)}</h3>
                      <p className="text-sm text-gray-500">
                        From Shop: {order.shopId} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'Pending Approval' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Product Type</p>
                    <p className="text-gray-900 capitalize">{order.chairType?.replace('_', ' ') || 'Standard Chair'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quantity</p>
                    <p className="text-gray-900">{order.quantity} chairs</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Components Required</p>
                    <p className="text-gray-900">
                      {order.chairType?.includes('headrest') ? 'With Headrest' : 'No Headrest'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    {order.status === 'Pending' && (
                      <button
                        onClick={() => acceptOrder(order._id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Accept Order</span>
                      </button>
                    )}

                    {order.status === 'Pending Approval' && (
                      <span className="text-sm text-orange-600">
                        Waiting for admin approval...
                      </span>
                    )}

                    {order.status === 'Processing' && (
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          placeholder="Driver name"
                          value={driverAssignments[order._id] || ''}
                          onChange={(e) => setDriverAssignments(prev => ({
                            ...prev,
                            [order._id]: e.target.value
                          }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleAssignDriver(order._id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Truck className="h-4 w-4" />
                          <span>Assign Driver</span>
                        </button>
                      </div>
                    )}

                    {order.status === 'Out for Delivery' && (
                      <div className="flex items-center space-x-2 text-sm text-purple-600">
                        <Truck className="h-4 w-4" />
                        <span>Driver: {order.driver}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-sm text-gray-500">
                    <p>Created: {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Component Stock Management Tab
const StockTab = ({ stock, loading, addStock, fetchStock }) => {
  const [newStock, setNewStock] = useState({ componentType: '', quantity: '' });

  const handleAddStock = () => {
    if (!newStock.componentType || !newStock.quantity) {
      toast.error('Please select component type and enter quantity');
      return;
    }
    addStock(newStock.componentType, parseInt(newStock.quantity));
    setNewStock({ componentType: '', quantity: '' });
  };

  const componentTypes = [
    'back', 'seat', 'arms', 'mechanism', 'gaslift', 'castor', 'chrome', 'headrest'
  ];

  const lowStockItems = stock.filter(item => item.quantity < 10);

  return (
    <div className="space-y-6">
      {/* Add Stock Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Component Stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Component Type
            </label>
            <select
              value={newStock.componentType}
              onChange={(e) => setNewStock({ ...newStock, componentType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select component</option>
              {componentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={newStock.quantity}
              onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleAddStock}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add to Stock
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Low Stock Alerts</h3>
                <p className="text-red-700">
                  {lowStockItems.length} components are running low and need replenishment
                </p>
              </div>
            </div>
            <button 
              onClick={fetchStock}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Stock
            </button>
          </div>
        </div>
      )}

      {/* Stock Levels */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Component Stock Levels</h2>
          <button 
            onClick={fetchStock}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : stock.length === 0 ? (
          <div className="text-center py-12">
            <Warehouse className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No stock data available</p>
            <p className="text-gray-400">Add components to see stock levels</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stock.map(item => (
              <div key={item._id} className={`border rounded-lg p-4 ${
                item.quantity < 10 ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {item.componentType}
                  </h3>
                  <Warehouse className={`h-5 w-5 ${
                    item.quantity < 10 ? 'text-red-600' : 'text-green-600'
                  }`} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-900">{item.quantity}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.quantity < 10 ? 'bg-red-100 text-red-800' :
                      item.quantity < 20 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.quantity < 10 ? 'Low' : item.quantity < 20 ? 'Medium' : 'Good'}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        item.quantity < 10 ? 'bg-red-500' :
                        item.quantity < 20 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (item.quantity / 50) * 100)}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Production Overview Tab
const ProductionTab = ({ orders, stock }) => {
  const productionStats = {
    chairsInProduction: orders.filter(o => o.status === 'Processing').reduce((sum, o) => sum + o.quantity, 0),
    chairsDeliveredThisMonth: orders.filter(o => 
      o.status === 'Delivered' && 
      new Date(o.updatedAt).getMonth() === new Date().getMonth()
    ).reduce((sum, o) => sum + o.quantity, 0),
    componentsUsed: stock.reduce((sum, item) => sum + (item.initialQuantity - item.quantity), 0)
  };

  return (
    <div className="space-y-6">
      {/* Production Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chairs in Production</p>
              <p className="text-2xl font-bold text-blue-600">{productionStats.chairsInProduction}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delivered This Month</p>
              <p className="text-2xl font-bold text-green-600">{productionStats.chairsDeliveredThisMonth}</p>
            </div>
            <Truck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Components Used</p>
              <p className="text-2xl font-bold text-purple-600">{productionStats.componentsUsed}</p>
            </div>
            <Warehouse className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Production Chart Placeholder */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Overview</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>Production analytics dashboard</p>
            <p className="text-sm">Charts and graphs showing production metrics</p>
          </div>
        </div>
      </div>

      {/* Recent Production Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Production Activity</h2>
        <div className="space-y-3">
          {orders
            .filter(order => order.status === 'Processing' || order.status === 'Out for Delivery')
            .slice(0, 5)
            .map(order => (
              <div key={order._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    order.status === 'Processing' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    {order.status === 'Processing' ? <Package className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Order #{order._id?.slice(-8)} - {order.quantity} chairs
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.chairType?.replace('_', ' ')} • Shop: {order.shopId}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default FactoryManager;