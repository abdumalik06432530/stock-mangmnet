/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { backendUrl } from '../../config';
import { toast } from 'react-toastify';
import { Package, Search, Eye, CheckCircle2, User, Store } from 'lucide-react';
import sanitizeMessage from '../../utils/sanitizeMessage';

const PendingOrders = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all'); // all | shop | other
  const [preview, setPreview] = useState(null);

  const fetchPending = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Pull a reasonable batch and filter client-side
      const { data } = await axios.get(`${backendUrl}/api/orders?limit=300`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success && Array.isArray(data.orders)) {
        // Pending-like statuses: requested, pending, factory_accepted (awaiting admin approval)
        const pending = data.orders.filter(o => ['requested','pending','factory_accepted'].includes(String(o.status || '').toLowerCase()));
        setOrders(pending);
      } else {
        setError(sanitizeMessage(data.message) || 'Failed to load orders');
        toast.error(sanitizeMessage(data.message) || 'Failed to load orders');
      }
    } catch (e) {
      console.error('Fetch pending orders failed', e);
      setError(sanitizeMessage(e.response?.data?.message) || 'Failed to fetch orders');
      toast.error(sanitizeMessage(e.response?.data?.message) || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(o => {
      if (source === 'shop' && !o.shop) return false;
      if (source === 'other' && o.shop) return false;
      if (!q) return true;
      const id = o._id || '';
      const number = o.orderNumber || '';
      const shop = o.shop || '';
      const ft = o.furnitureType || o.type || '';
      return [id, number, shop, ft].join(' ').toLowerCase().includes(q);
    });
  }, [orders, source, query]);

  const approve = async (order) => {
    try {
      const res = await axios.put(`${backendUrl}/api/orders/${order._id}/admin-approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success('Order approved');
        fetchPending();
      } else {
        toast.error(sanitizeMessage(res.data.message) || 'Approve failed');
      }
    } catch (e) {
      toast.error(sanitizeMessage(e.response?.data?.message) || 'Approve failed');
    }
  };

  const Detail = ({ o }) => {
    if (!o) return null;
    const addr = o.address || {};
    const totalQty = (o.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0) || o.quantity || 0;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold">Order #{String(o._id || '').slice(-8)}</h3>
            </div>
            <button onClick={() => setPreview(null)} className="text-xs text-gray-600 hover:text-gray-800">Close</button>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold mb-1">Details</p>
                <p>Number: {o.orderNumber || '-'}</p>
                <p>Type: {o.furnitureType || o.type || '-'}</p>
                <p>Quantity: {totalQty}</p>
                <p>Status: {o.status}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold mb-1">Customer</p>
                <p>{[addr.firstName, addr.lastName].filter(Boolean).join(' ') || '-'}</p>
                <p>{addr.city || ''} {addr.state ? ', ' + addr.state : ''}</p>
                <p>{addr.country || ''} {addr.zipcode || ''}</p>
                <p>{addr.phone || ''}</p>
              </div>
            </div>
            {(o.items || []).length > 0 && (
              <div>
                <p className="font-semibold mb-1">Line items</p>
                <div className="space-y-1">
                  {(o.items || []).map((it, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="font-medium">{it.name || it.model || it.type}</span>
                      <span>×{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-3 border-t flex items-center justify-end gap-2">
            <button onClick={() => setPreview(null)} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Close</button>
            <button onClick={async () => { await approve(o); setPreview(null); }} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">Approve</button>
          </div>
        </div>
      </div>
    );
  };

  Detail.propTypes = { o: PropTypes.object };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
          <h3 className="text-base font-bold text-gray-900">Unauthorized</h3>
          <p className="text-xs text-gray-600 mt-2">Please log in to access Pending Orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4 md:p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg"><Package className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Pending Orders</h2>
              <p className="text-xs text-gray-500">Review, see details, and approve</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pending..." className="w-full pl-8 pr-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <select value={source} onChange={e => setSource(e.target.value)} className="px-2 py-1 text-xs border rounded bg-white">
              <option value="all">All sources</option>
              <option value="shop">Shop orders</option>
              <option value="other">Other</option>
            </select>
            <button onClick={fetchPending} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">Refresh</button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-3">Loading pending orders...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <p className="text-sm text-gray-600">No pending orders</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((o) => {
              const isShop = !!o.shop;
              const totalQty = (o.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0) || o.quantity || 0;
              return (
                <div key={o._id} className="p-3 bg-white rounded-lg border hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isShop ? <Store className="h-4 w-4 text-indigo-600" /> : <User className="h-4 w-4 text-gray-500" />}
                      <div>
                        <p className="text-sm font-semibold">#{String(o._id || '').slice(-8)} • {o.furnitureType || o.type || 'order'}</p>
                        <p className="text-[11px] text-gray-500">Qty: {totalQty} • Status: {o.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPreview(o)} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1"><Eye className="h-3 w-3" /> View</button>
                      <button onClick={() => approve(o)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approve</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && <Detail o={preview} />}
    </div>
  );
};

PendingOrders.propTypes = { token: PropTypes.string };

export default PendingOrders;
