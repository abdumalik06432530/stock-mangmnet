import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../../config';
import { toast } from 'react-toastify';
import sanitizeMessage from '../../utils/sanitizeMessage';

const ItemRequests = ({ token }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/items/requests`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.requests) setRequests(res.data.requests);
      else toast.error('Failed to load requests');
    } catch (err) {
      console.error(err);
      toast.error(sanitizeMessage(err.response?.data?.message) || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const approve = async (id) => {
    try {
      await axios.put(`${backendUrl}/api/items/requests/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Request approved');
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error(sanitizeMessage(err.response?.data?.message) || 'Failed to approve');
    }
  };

  const reject = async (id) => {
    const notes = prompt('Rejection notes (optional)');
    try {
      await axios.put(`${backendUrl}/api/items/requests/${id}/reject`, { adminNotes: notes || '' }, { headers: { Authorization: `Bearer ${token}` } });
      toast.info('Request rejected');
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error(sanitizeMessage(err.response?.data?.message) || 'Failed to reject');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-4">Pending Item Requests</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow p-4">
          {requests.length === 0 ? (
            <p className="text-gray-500">No pending requests</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2">Type</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Quantity</th>
                  <th className="py-2">Requester</th>
                  <th className="py-2">Requested At</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r._id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{r.type}</td>
                    <td className="py-2">{r.model || '-'}</td>
                    <td className="py-2">{r.quantity || 0}</td>
                    <td className="py-2">{r.requester || '-'}</td>
                    <td className="py-2">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-2 capitalize">{r.status}</td>
                    <td className="py-2">
                      {r.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => approve(r._id)} className="px-2 py-1 bg-green-600 text-white rounded">Approve</button>
                          <button onClick={() => reject(r._id)} className="px-2 py-1 bg-red-600 text-white rounded">Reject</button>
                        </div>
                      ) : (
                        <span className="text-gray-500">{r.adminNotes || r.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemRequests;
