import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../../config';
import { Users, CheckCircle, Trash2 } from 'lucide-react';

const Drivers = ({ token = null }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [creating, setCreating] = useState(false);

  const fetchDrivers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrivers(res.data.drivers || res.data || []);
    } catch (err) {
      console.error('Failed to load drivers', err);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

 

  useEffect(() => {
    fetchDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createDriver = async (e) => {
    e.preventDefault();
    if (!form.name || form.name.trim() === '') {
      toast.error('Driver name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/drivers`,
        { name: form.name.trim(), phone: form.phone || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newDriver = res.data.driver || res.data;
      setDrivers((prev) => [newDriver, ...prev]);
      setForm({ name: '', phone: '' });
      toast.success('Driver created');
    } catch (err) {
      console.error('Failed to create driver', err);
      toast.error(err.response?.data?.message || 'Failed to create driver');
    } finally {
      setCreating(false);
    }
  };

  const updateDriver = async (id, patch) => {
    try {
      const res = await axios.put(`${backendUrl}/api/drivers/${id}`, patch, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = res.data.driver || res.data;
      setDrivers((prev) => prev.map((d) => (d._id === id ? updated : d)));
      toast.success('Driver updated');
    } catch (err) {
      console.error('Failed to update driver', err);
      toast.error(err.response?.data?.message || 'Failed to update driver');
    }
  };

  const removeDriver = async (id) => {
    if (!confirm('Delete driver? This action cannot be undone.')) return;
    try {
      await axios.delete(`${backendUrl}/api/drivers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrivers((prev) => prev.filter((d) => d._id !== id));
      toast.success('Driver removed');
    } catch (err) {
      console.error('Failed to remove driver', err);
      toast.error(err.response?.data?.message || 'Failed to remove driver');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header and Create Driver Form */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Users className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Drivers</h2>
            <p className="text-xs text-gray-500">Create and manage delivery drivers</p>
          </div>
        </div>

        <form onSubmit={createDriver} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Driver Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Driver name"
              className="w-full border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              aria-label="Driver name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              aria-label="Driver phone"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              type="submit"
              disabled={creating}
              className={`px-4 py-1 rounded-lg text-white text-xs shadow-sm hover:shadow-md transition-all duration-200 ${
                creating ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              aria-label="Create driver"
            >
              {creating ? 'Creating...' : 'Create Driver'}
            </button>
            <button
              type="button"
              onClick={() => setForm({ name: '', phone: '' })}
              className="px-4 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Clear form"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Drivers List */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-base font-bold text-gray-900 mb-3">All Drivers</h3>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg" />
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-600">No drivers yet</p>
            <p className="text-xs text-gray-400">Add drivers to manage deliveries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drivers.map((d) => (
              <div
                key={d._id}
                className="flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-full ${
                      d.status === 'Approved'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-yellow-100 text-yellow-600'
                    }`}
                  >
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                    <p className="text-xs text-gray-500">
                      {d.phone || 'No phone'} • {d.status || 'Pending'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {d.status !== 'Approved' && (
                    <button
                      onClick={() => updateDriver(d._id, { status: 'Approved' })}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-green-600 text-white text-xs shadow-sm hover:shadow-md hover:bg-green-700 transition-all duration-200"
                      aria-label={`Approve driver ${d.name}`}
                    >
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Approve</span>
                    </button>
                  )}
                  <button
                    onClick={() => updateDriver(d._id, { available: !d.available })}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs shadow-sm hover:shadow-md transition-all duration-200 ${
                      d.available
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label={`Set ${d.name} as ${d.available ? 'unavailable' : 'available'}`}
                  >
                    {d.available ? 'Set Unavailable' : 'Set Available'}
                  </button>
                  <button
                    onClick={() => removeDriver(d._id)}
                    className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs shadow-sm hover:shadow-md hover:bg-red-100 transition-all duration-200"
                    aria-label={`Delete driver ${d.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Drivers;