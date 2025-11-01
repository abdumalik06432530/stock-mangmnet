import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Package, Truck, CheckCircle, Filter } from 'lucide-react';
import { backendUrl } from '../../config';

const OrdersTab = ({ orders: initialOrders, setOrders, loading, drivers, token }) => {
  const [orders, setLocalOrders] = useState(initialOrders || []);
  const [filterStatus, setFilterStatus] = useState('all');
  const [driverAssignments, setDriverAssignments] = useState({});
  const [localDrivers, setLocalDrivers] = useState(drivers || []);
  const [showCreateForm, setShowCreateForm] = useState({});
  const [driverForm, setDriverForm] = useState({});

  // Sync localDrivers with parent prop
  useEffect(() => {
    setLocalDrivers(drivers || []);
  }, [drivers]);

  // Fetch orders from DB on mount or when token changes
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && Array.isArray(res.data.orders)) {
          setLocalOrders(res.data.orders);
          if (setOrders) setOrders(res.data.orders);
        }
      } catch (err) {
        console.error('Failed to fetch orders', err);
      }
    };
    if (token) fetchOrders();
  }, [token, setOrders]);

  const filteredOrders = orders.filter(
    (order) => filterStatus === 'all' || order.status === filterStatus
  );

  const acceptOrder = async (orderId) => {
    try {
      const order = orders.find((o) => o._id === orderId);
      if (!order) return;

      // Accept order in DB (status: accepted)
      const res = await axios.put(
        `${backendUrl}/api/orders/${orderId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.order) {
        setLocalOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, status: res.data.order.status || 'accepted' } : o
          )
        );
        if (setOrders) setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, status: res.data.order.status || 'accepted' } : o
          )
        );
        toast.success('Order accepted and sent for admin approval');
      } else {
        toast.error(res.data.message || 'Failed to accept order');
      }
    } catch (err) {
      console.error('Failed to accept order', err);
      toast.error(err.response?.data?.message || 'Failed to accept order');
    }
  };

  const assignDriver = async (orderId, driverId) => {
    try {
      const driver = localDrivers.find((d) => d._id === driverId);
      if (!driver) {
        toast.error('Invalid driver selected');
        return;
      }

      const res = await axios.put(
        `${backendUrl}/api/orders/${orderId}/assign-driver`,
        { driverId, driverName: driver.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.order) {
        setLocalOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? { ...o, status: res.data.order.status || 'assigned', driver: driver.name, driverId }
              : o
          )
        );
        if (setOrders) setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? { ...o, status: res.data.order.status || 'assigned', driver: driver.name, driverId }
              : o
          )
        );
        toast.success(`Driver ${driver.name} assigned to order`);
      } else {
        toast.error(res.data.message || 'Failed to assign driver');
      }
    } catch (err) {
      console.error('Failed to assign driver', err);
      toast.error(err.response?.data?.message || 'Failed to assign driver');
    }
  };

  const markAsDelivered = async (orderId) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/orders/${orderId}/deliver`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.order) {
        setLocalOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, status: res.data.order.status || 'delivered' } : o
          )
        );
        if (setOrders) setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, status: res.data.order.status || 'delivered' } : o
          )
        );
        toast.success('Order marked as delivered and stock updated');
      } else {
        toast.error(res.data.message || 'Failed to mark as delivered');
      }
    } catch (err) {
      console.error('Failed to update order status', err);
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleAssignDriver = (orderId) => {
    const driverId = driverAssignments[orderId] || '';
    if (!driverId) {
      toast.error('Please select a driver');
      return;
    }
    assignDriver(orderId, driverId);
    setDriverAssignments((prev) => ({ ...prev, [orderId]: '' }));
  };

  const handleCreateDriver = async (orderId) => {
    const form = driverForm[orderId] || {};
    if (!form.name || form.name.trim() === '') {
      toast.error('Please enter driver name');
      return;
    }
    try {
      const res = await axios.post(
        `${backendUrl}/api/drivers`,
        { name: form.name.trim(), phone: form.phone || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newDriver = res.data.driver || res.data;
      setLocalDrivers((prev) => [newDriver, ...prev]);
      setDriverAssignments((prev) => ({ ...prev, [orderId]: newDriver._id }));
      setShowCreateForm((s) => ({ ...s, [orderId]: false }));
      setDriverForm((f) => ({ ...f, [orderId]: {} }));
      toast.success('Driver created and selected');
    } catch (err) {
      console.error('Failed to create driver', err);
      toast.error(err.response?.data?.message || 'Failed to create driver');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Order Management</h2>
        <div className="flex items-center space-x-3">
          <Filter className="h-5 w-5 text-gray-500" aria-hidden="true" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            aria-label="Filter orders by status"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Processing">Processing</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-md p-4">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-blue-600"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-600">No orders found</p>
            <p className="text-xs text-gray-400">Orders from shopkeepers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-full ${
                        order.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-600'
                          : order.status === 'Pending Approval'
                          ? 'bg-orange-100 text-orange-600'
                          : order.status === 'Processing'
                          ? 'bg-blue-100 text-blue-600'
                          : order.status === 'Out for Delivery'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      <Package className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Order #{order._id?.slice(-8)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        From Shop: {order.shopId || 'N/A'} •{' '}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'Pending Approval'
                        ? 'bg-orange-100 text-orange-800'
                        : order.status === 'Processing'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'Out for Delivery'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Product Type</p>
                    <p className="text-xs text-gray-900 capitalize">
                      {order.furnitureType || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Quantity</p>
                    <p className="text-xs text-gray-900">{order.quantity} items</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Total Amount</p>
                    <p className="text-xs text-gray-900">${order.totalAmount || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-gray-200 space-y-3 sm:space-y-0 sm:space-x-3">
                  {order.status === 'Pending' && (
                    <button
                      onClick={() => acceptOrder(order._id)}
                      className="flex items-center space-x-2 px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                      aria-label={`Accept order ${order._id}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Accept Order</span>
                    </button>
                  )}
                  {order.status === 'Pending Approval' && (
                    <span className="text-orange-600 text-xs">
                      Waiting for admin approval...
                    </span>
                  )}
                  {order.status === 'Processing' && (
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                      <div className="flex flex-col space-y-2 w-full sm:w-auto">
                        <select
                          value={driverAssignments[order._id] || ''}
                          onChange={(e) =>
                            setDriverAssignments((prev) => ({
                              ...prev,
                              [order._id]: e.target.value,
                            }))
                          }
                          className="border border-gray-300 rounded-lg px-3 py-1 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                          aria-label={`Select driver for order ${order._id}`}
                        >
                          <option value="">Select Driver</option>
                          {localDrivers
                            .filter((d) => d.status === 'Approved')
                            .map((driver) => (
                              <option key={driver._id} value={driver._id}>
                                {driver.name}
                              </option>
                            ))}
                        </select>

                        <button
                          onClick={() =>
                            setShowCreateForm((s) => ({ ...s, [order._id]: !s[order._id] }))
                          }
                          className="text-xs text-blue-600 hover:text-blue-800 transition-all duration-200"
                          type="button"
                          aria-label="Toggle create driver form"
                        >
                          + Create Driver
                        </button>

                        {showCreateForm[order._id] && (
                          <div className="bg-gray-50 p-3 rounded-lg space-y-2 mt-2">
                            <input
                              type="text"
                              placeholder="Driver name"
                              value={driverForm[order._id]?.name || ''}
                              onChange={(e) =>
                                setDriverForm((f) => ({
                                  ...f,
                                  [order._id]: { ...(f[order._id] || {}), name: e.target.value },
                                }))
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Driver name"
                            />
                            <input
                              type="text"
                              placeholder="Phone (optional)"
                              value={driverForm[order._id]?.phone || ''}
                              onChange={(e) =>
                                setDriverForm((f) => ({
                                  ...f,
                                  [order._id]: { ...(f[order._id] || {}), phone: e.target.value },
                                }))
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label="Driver phone"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleCreateDriver(order._id)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-all duration-200"
                                type="button"
                                aria-label="Create driver"
                              >
                                Create
                              </button>
                              <button
                                onClick={() =>
                                  setShowCreateForm((s) => ({ ...s, [order._id]: false }))
                                }
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-all duration-200"
                                type="button"
                                aria-label="Cancel driver creation"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleAssignDriver(order._id)}
                        className="flex items-center space-x-2 px-4 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                        aria-label={`Assign driver to order ${order._id}`}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Assign Driver</span>
                      </button>
                    </div>
                  )}
                  {order.status === 'Out for Delivery' && (
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-purple-600 text-xs">
                        <Truck className="h-4 w-4" />
                        <span>Driver: {order.driver}</span>
                      </div>
                      <button
                        onClick={() => markAsDelivered(order._id)}
                        className="flex items-center space-x-2 px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
                        aria-label={`Mark jniMark order ${order._id} as delivered`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark as Delivered</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import PropTypes from 'prop-types';

OrdersTab.propTypes = {
  orders: PropTypes.array.isRequired,
  setOrders: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  drivers: PropTypes.array,
  token: PropTypes.string,
};

export default OrdersTab;