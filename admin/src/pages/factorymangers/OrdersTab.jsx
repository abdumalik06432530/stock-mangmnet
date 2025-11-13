import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import axios from 'axios';
// Icons optionally usable later; keep minimal to avoid unused warnings
import { backendUrl } from '../../config';

// Map backend status codes to display labels
const displayLabel = (raw) => {
  const k = (raw || '').toLowerCase();
  const map = {
    requested: 'Pending',
    pending: 'Pending',
    factory_accepted: 'Approved',
    admin_approved: 'Approved',
    processing: 'Processing',
    assigned: 'Processing', // show as Processing until out_for_delivery
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
  };
  return map[k] || raw || 'Unknown';
};

const badgeCls = (raw) => {
  const label = displayLabel(raw);
  return label === 'Pending'
    ? 'bg-yellow-100 text-yellow-800'
    : label === 'Approved'
    ? 'bg-blue-100 text-blue-800'
    : label === 'Processing'
    ? 'bg-purple-100 text-purple-800'
    : label === 'Out for Delivery'
    ? 'bg-indigo-100 text-indigo-800'
    : label === 'Delivered'
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-700';
};

const OrdersTab = ({ orders: initialOrders = [], setOrders, loading = false, drivers: initialDrivers = [], token = '' }) => {
  const [orders, setLocalOrders] = useState(initialOrders);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [driverAssignments, setDriverAssignments] = useState({});
  const [showCreateDriver, setShowCreateDriver] = useState({});
  const [newDriverForm, setNewDriverForm] = useState({});

  // Fetch orders if not supplied
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/orders`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success && Array.isArray(data.orders)) {
        // Enrich with shop details if available
        const ids = [...new Set(data.orders.map(o => o.shop).filter(Boolean))];
        const shopMap = {};
        if (ids.length) {
          const shopReqs = ids.map(id => axios.get(`${backendUrl}/api/shops/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null));
          const resp = await Promise.all(shopReqs);
            resp.forEach((r, i) => { if (r?.data?.shop) shopMap[ids[i]] = r.data.shop; });
        }
        const enriched = data.orders.map(o => ({ ...o, shop: shopMap[o.shop] }));
        setLocalOrders(enriched);
        setOrders?.(enriched);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch orders');
    }
  }, [token, setOrders]);

  // Fetch drivers if not supplied
  const fetchDrivers = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/drivers`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success && Array.isArray(data.drivers)) setDrivers(data.drivers);
    } catch (e) {
      console.warn('Fetch drivers failed', e.message);
    }
  }, [token]);

  useEffect(() => { if (!initialOrders.length) fetchOrders(); }, [initialOrders.length, fetchOrders]);
  useEffect(() => { if (!initialDrivers.length) fetchDrivers(); }, [initialDrivers.length, fetchDrivers]);
  useEffect(() => { setLocalOrders(initialOrders); }, [initialOrders]);
  useEffect(() => { setDrivers(initialDrivers); }, [initialDrivers]);

  // Actions
  const acceptFactory = async (id) => {
    try {
      const { data } = await axios.put(`${backendUrl}/api/orders/${id}/factory-accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setLocalOrders(o => o.map(ord => ord._id === id ? { ...ord, status: data.order.status } : ord));
        toast.success('Order accepted by factory');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Accept failed');
    }
  };

  const setProcessing = async (id) => {
    // Use factory route for processing if available
    try {
      const { data } = await axios.put(`${backendUrl}/api/factory/orders/${id}/processing`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setLocalOrders(o => o.map(ord => ord._id === id ? { ...ord, status: data.order.status } : ord));
        toast.success('Marked processing');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Processing failed');
    }
  };

  const assignDriver = async (id, driverId) => {
    const drv = drivers.find(d => d._id === driverId);
    if (!drv) return toast.error('Driver not found');
    try {
      const { data } = await axios.put(`${backendUrl}/api/orders/${id}/assign-driver`, { driverId }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setLocalOrders(o => o.map(ord => ord._id === id ? { ...ord, status: data.order.status, driver: drv.name, assignedDriver: driverId } : ord));
        toast.success('Driver assigned');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Assign failed');
    }
  };

  const markOutForDelivery = async (id, driverId) => {
    try {
      const { data } = await axios.put(`${backendUrl}/api/factory/orders/${id}/out-for-delivery`, { driverId }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setLocalOrders(o => o.map(ord => ord._id === id ? { ...ord, status: data.order.status } : ord));
        toast.success('Out for delivery');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };

  const deliverOrder = async (id) => {
    try {
      const { data } = await axios.put(`${backendUrl}/api/orders/${id}/deliver`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setLocalOrders(o => o.map(ord => ord._id === id ? { ...ord, status: data.order.status } : ord));
        toast.success('Delivered');
        window.dispatchEvent(new CustomEvent('shop:fetchStock')); // allow listeners to refresh
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delivery failed');
    }
  };

  const createDriver = async (orderId) => {
    const form = newDriverForm[orderId] || { name: '', phone: '' };
    if (!form.name.trim()) return toast.error('Name required');
    try {
      const { data } = await axios.post(`${backendUrl}/api/drivers`, { name: form.name.trim(), phone: form.phone }, { headers: { Authorization: `Bearer ${token}` } });
      const drv = data.driver; if (!drv) return toast.error('Driver create failed');
      setDrivers(d => [drv, ...d]);
      setDriverAssignments(d => ({ ...d, [orderId]: drv._id }));
      setShowCreateDriver(s => ({ ...s, [orderId]: false }));
      setNewDriverForm(f => ({ ...f, [orderId]: { name: '', phone: '' } }));
      toast.success('Driver created');
    } catch (e) { toast.error(e.response?.data?.message || 'Create failed'); }
  };

  // Filter & search inline
  const visible = orders.filter(o => {
    const label = displayLabel(o.status);
    const matchesFilter = filter === 'All' || label === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || [o._id, o.shop, o.furnitureType, label, o.driver].filter(Boolean).some(v => v.toString().toLowerCase().includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2 text-xs items-center">
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option>All</option>
          {['Pending','Approved','Processing','Out for Delivery','Delivered'].map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={fetchOrders}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          {loading && !orders.length ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : visible.length === 0 ? (
            <div className="p-4 text-center text-gray-500 border rounded-lg">No orders</div>
          ) : (
            visible.map(o => {
              const label = displayLabel(o.status);
              return (
                <div key={o._id} className="p-3 rounded-lg border-2 hover:shadow-sm transition cursor-pointer" onClick={() => setDriverAssignments(d => ({ ...d, selected: o._id }))}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-xs">#{o._id?.slice(-6)} {o.furnitureType || o.type || ''}</p>
                      <p className="text-[11px] text-gray-600">Qty: {o.quantity}</p>
                      {o.shop && <p className="text-[10px] text-gray-500">Shop: {o.shop?.name || o.shop}</p>}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${badgeCls(o.status)}`}>{label}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-[11px]">
                    {o.driver && <span className="text-green-600">Driver: {o.driver}</span>}
                    {!o.driver && ['assigned','processing'].includes((o.status||'').toLowerCase()) && <span className="text-red-600">No driver</span>}
                  </div>
                  {/* Inline actions */}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {(o.status === 'requested' || o.status === 'pending') && (
                      <button onClick={() => acceptFactory(o._id)} className="px-2 py-1 bg-green-600 text-white rounded">Accept</button>
                    )}
                    {(o.status === 'factory_accepted' || o.status === 'admin_approved') && (
                      <button onClick={() => setProcessing(o._id)} className="px-2 py-1 bg-purple-600 text-white rounded">Processing</button>
                    )}
                    {(o.status === 'processing' || o.status === 'assigned') && (
                      <>
                        <select
                          value={driverAssignments[o._id] || ''}
                          onChange={e => setDriverAssignments(d => ({ ...d, [o._id]: e.target.value }))}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="">Driver</option>
                          {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <button
                          onClick={() => driverAssignments[o._id] && assignDriver(o._id, driverAssignments[o._id])}
                          className="px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-40"
                          disabled={!driverAssignments[o._id]}
                        >Assign</button>
                        <button
                          onClick={() => driverAssignments[o._id] && markOutForDelivery(o._id, driverAssignments[o._id])}
                          className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-40"
                          disabled={!driverAssignments[o._id]}
                        >Out for Delivery</button>
                        <button
                          onClick={() => setShowCreateDriver(s => ({ ...s, [o._id]: !s[o._id] }))}
                          className="px-2 py-1 bg-gray-200 rounded"
                        >New Driver</button>
                        {showCreateDriver[o._id] && (
                          <div className="w-full flex flex-wrap gap-1">
                            <input
                              placeholder="Name"
                              value={newDriverForm[o._id]?.name || ''}
                              onChange={e => setNewDriverForm(f => ({ ...f, [o._id]: { ...(f[o._id]||{}), name: e.target.value } }))}
                              className="flex-1 px-2 py-1 border rounded"
                            />
                            <input
                              placeholder="Phone"
                              value={newDriverForm[o._id]?.phone || ''}
                              onChange={e => setNewDriverForm(f => ({ ...f, [o._id]: { ...(f[o._id]||{}), phone: e.target.value } }))}
                              className="flex-1 px-2 py-1 border rounded"
                            />
                            <button onClick={() => createDriver(o._id)} className="px-2 py-1 bg-green-600 text-white rounded">Create</button>
                          </div>
                        )}
                      </>
                    )}
                    {o.status === 'out_for_delivery' && (
                      <button onClick={() => deliverOrder(o._id)} className="px-2 py-1 bg-green-700 text-white rounded">Deliver</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Summary / Legend */}
        <div className="bg-white rounded-xl shadow-sm p-4 text-xs space-y-4">
          <h3 className="font-bold text-sm">Legend / Status Flow</h3>
          <ol className="list-decimal ml-4 space-y-1 text-[11px]">
            <li>Pending → Accept (factory)</li>
            <li>Approved (factory/admin) → Processing</li>
            <li>Processing → Assign Driver → Out for Delivery</li>
            <li>Out for Delivery → Deliver (stock updates)</li>
          </ol>
          <h3 className="font-bold text-sm mt-4">Drivers</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {drivers.length === 0 ? <p className="text-gray-500">No drivers</p> : drivers.map(d => (
              <div key={d._id} className="flex justify-between text-[11px] border-b py-1">
                <span>{d.name}</span>
                <span className={d.status === 'Approved' ? 'text-green-600' : 'text-yellow-600'}>{d.status}</span>
              </div>
            ))}
          </div>
          <button onClick={fetchDrivers} className="px-2 py-1 bg-indigo-600 text-white rounded">Refresh Drivers</button>
        </div>
      </div>
    </div>
  );
};

OrdersTab.propTypes = {
  orders: PropTypes.array,
  setOrders: PropTypes.func,
  loading: PropTypes.bool,
  drivers: PropTypes.array,
  token: PropTypes.string,
};

export default OrdersTab;