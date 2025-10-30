import React, { useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../../config';
import { toast } from 'react-toastify';

const RequestItem = ({ token, shopId }) => {
  const [form, setForm] = useState({ type: '', model: '', quantity: 1, furnitureType: 'chair', optional: false });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const requester = (() => { try { const u = localStorage.getItem('user'); return u ? JSON.parse(u).username || JSON.parse(u)._id : 'unknown'; } catch { return 'unknown'; } })();
      await axios.post(`${backendUrl}/api/items/request`, { ...form, requester }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Item request submitted');
      setForm({ type: '', model: '', quantity: 1, furnitureType: 'chair', optional: false });
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 bg-white rounded shadow">
      <h3 className="text-xl font-semibold mb-4">Request New Item</h3>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 max-w-md">
        <label className="flex flex-col">
          <span className="text-sm text-gray-700">Type (e.g., back, arm, mechanism)</span>
          <input required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border rounded px-2 py-1" />
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-gray-700">Model (optional, for backs)</span>
          <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="border rounded px-2 py-1" />
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-gray-700">Quantity</span>
          <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="border rounded px-2 py-1" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.optional} onChange={e => setForm({ ...form, optional: e.target.checked })} />
          <span className="text-sm">Optional part</span>
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-3 py-1 bg-indigo-600 text-white rounded">Submit Request</button>
          <button type="button" onClick={() => setForm({ type: '', model: '', quantity: 1, furnitureType: 'chair', optional: false })} className="px-3 py-1 bg-gray-200 rounded">Reset</button>
        </div>
      </form>
    </div>
  );
};

export default RequestItem;
