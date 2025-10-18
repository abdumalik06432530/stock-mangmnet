import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { backendUrl } from '../../config';
import { toast } from 'react-toastify';
import sanitizeMessage from '../../utils/sanitizeMessage';

const Users = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]); // New state for shops
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'shopkeeper',
    phone: '',
    shopId: '',
    password: '',
  });

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/user/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setUsers(res.data.users || []);
      } else {
        toast.error(sanitizeMessage(res.data.message));
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch shops
  const fetchShops = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/shops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setShops(res.data.shops || []);
      } else {
        toast.error(sanitizeMessage(res.data.message));
      }
    } catch (err) {
      console.error('Failed to fetch shops', err);
      toast.error(err.message || 'Failed to fetch shops');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchShops();
    }
  }, [token, fetchUsers, fetchShops]);

  // Create user
  const createUser = async () => {
    try {
      setLoading(true);
      const payload = {
        username: formData.email || formData.name,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        shopId: formData.shopId,
      };
      const res = await axios.post(`${backendUrl}/api/user/create`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success('User created successfully');
        setShowCreateModal(false);
        setFormData({ name: '', email: '', role: 'shopkeeper', phone: '', shopId: '' });
          setFormData({ name: '', email: '', role: 'shopkeeper', phone: '', shopId: '', password: '' });
        fetchUsers();
      } else {
        toast.error(sanitizeMessage(res.data.message));
      }
    } catch (err) {
      console.error('Failed to create user', err);
      toast.error(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Edit user
  const editUserHandler = async () => {
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        password: formData.password || undefined,
        shopId: formData.shopId,
      };
      const res = await axios.put(`${backendUrl}/api/user/${editUser._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setEditUser(null);
  setFormData({ name: '', email: '', role: 'shopkeeper', phone: '', shopId: '', password: '' });
        fetchUsers();
      } else {
        toast.error(sanitizeMessage(res.data.message));
      }
    } catch (err) {
      console.error('Failed to update user', err);
      toast.error(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      setLoading(true);
      const res = await axios.delete(`${backendUrl}/api/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(sanitizeMessage(res.data.message));
      }
    } catch (err) {
      console.error('Failed to delete user', err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user status
  const toggleStatus = async (userId, isActive) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${backendUrl}/api/user/${userId}/status`,
        { isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success('User status updated');
        fetchUsers();
      } else {
        toast.error(sanitizeMessage(res.data.message));
      }
    } catch (err) {
      console.error('Failed to update status', err);
      toast.error(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Bulk toggle status
  const bulkToggleStatus = async (isActive) => {
    if (selected.length === 0) return;
    try {
      setBulkLoading(true);
      await Promise.all(
        selected.map((id) =>
          axios.post(
            `${backendUrl}/api/user/${id}/status`,
            { isActive },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      toast.success('Bulk update completed');
      setSelected([]);
      fetchUsers();
    } catch (err) {
      console.error('Bulk update failed', err);
      toast.error(err.message || 'Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Assign shop to shopkeeper
  const assignShop = async (userId, shopId) => {
    try {
      setLoading(true);
      const res = await axios.post(`${backendUrl}/api/user/${userId}/assign-shop`, { shopId }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success('Shop assigned successfully');
        fetchUsers();
      } else {
        toast.error(sanitizeMessage(res.data.message));
      }
    } catch (err) {
      console.error('Failed to assign shop', err);
      toast.error(err.message || 'Failed to assign shop');
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesQuery = `${u.name} ${u.email} ${u.role} ${u.phone} ${u.shopId?.name || ''}`.toLowerCase().includes(
      query.toLowerCase()
    );
    if (!matchesQuery) return false;
    if (filter === 'all') return true;
    if (filter === 'active') return u.isActive;
    if (filter === 'disabled') return !u.isActive;
    return true;
  });

  const isAllSelected = filtered.length > 0 && selected.length === filtered.length;

  // User Card for Mobile View
  const UserCard = ({ user }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selected.includes(user._id)}
            onChange={() => {
              if (selected.includes(user._id)) setSelected((prev) => prev.filter((id) => id !== user._id));
              else setSelected((prev) => [...prev, user._id]);
            }}
            className="h-4 w-4"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {user.isActive ? 'Active' : 'Disabled'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-500">Role:</span>
          <span className="ml-1 capitalize">{user.role}</span>
        </div>
        <div>
          <span className="text-gray-500">Phone:</span>
          <span className="ml-1">{user.phone || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Shop:</span>
          <span className="ml-1">{user.shopId?.name || '-'}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Created:</span>
          <span className="ml-1">{new Date(user.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <select
          value={user.isActive ? 'active' : 'disabled'}
          onChange={(e) => toggleStatus(user._id, e.target.value === 'active')}
          className="p-2 rounded-md border border-gray-300 text-sm flex-1 mr-2"
        >
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        {user.role === 'shopkeeper' && (
          <select
            value={user.shopId?._id || ''}
            onChange={(e) => assignShop(user._id, e.target.value)}
            className="p-2 rounded-md border border-gray-300 text-sm flex-1 mr-2"
          >
            <option value="">Select Shop</option>
            {shops.map((shop) => (
              <option key={shop._id} value={shop._id}>
                {shop.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditUser(user);
              setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || '',
                shopId: user.shopId?._id || '',
                password: '',
              });
              setShowEditModal(true);
            }}
            className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
          >
            Edit
          </button>
          <button
            onClick={() => deleteUser(user._id)}
            className="px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  // Create/Edit Modal
  const UserModal = ({ isEdit = false }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{isEdit ? 'Edit User' : 'Create User'}</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <input
            type="email"
            placeholder="Email (used as username)"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <input
            type="password"
            placeholder={isEdit ? 'Leave blank to keep current password' : 'Password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="shopkeeper">Shopkeeper</option>
            <option value="factory">Factory Manager</option>
            <option value="admin">Admin</option>
          </select>
          <input
            type="text"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          {formData.role === 'shopkeeper' && (
            <select
              value={formData.shopId}
              onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Shop</option>
              {shops.map((shop) => (
                <option key={shop._id} value={shop._id}>
                  {shop.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEditUser(null);
              setFormData({ name: '', email: '', role: 'shopkeeper', phone: '', shopId: '' });
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={isEdit ? editUserHandler : createUser}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            👥 Users
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          >
            Create User
          </button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full p-3 rounded-lg border border-gray-200 bg-white text-sm shadow-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-3 rounded-lg border border-gray-200 bg-white text-sm w-full sm:w-auto"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selected.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span className="text-blue-800 font-medium text-sm">
                {selected.length} user{selected.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  id="bulkStatus"
                  className="p-2 rounded-lg border border-gray-200 bg-white text-sm flex-1 sm:flex-none"
                >
                  <option value="activate">Activate</option>
                  <option value="deactivate">Deactivate</option>
                </select>
                <button
                  disabled={bulkLoading}
                  onClick={() => {
                    const sel = document.getElementById('bulkStatus')?.value;
                    if (sel === 'activate') bulkToggleStatus(true);
                    else bulkToggleStatus(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm disabled:opacity-50 hover:bg-indigo-700 flex-1 sm:flex-none"
                >
                  {bulkLoading ? 'Applying...' : 'Apply'}
                </button>
                <button
                  onClick={() => setSelected([])}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && <UserModal />}
      {showEditModal && <UserModal isEdit />}

      {/* Users List */}
      {isMobile ? (
        <div className="bg-transparent">
          {loading ? (
            <div className="text-center p-8 bg-white rounded-xl shadow-sm">
              <div className="animate-pulse">Loading users...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">No users found</p>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((user) => (
                <UserCard key={user._id} user={user} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => {
                      if (isAllSelected) setSelected([]);
                      else setSelected(filtered.map((u) => u._id));
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center">
                    <div className="animate-pulse">Loading users...</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center">
                    <p className="text-gray-500">No users found</p>
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(u._id)}
                        onChange={() => {
                          if (selected.includes(u._id))
                            setSelected((prev) => prev.filter((id) => id !== u._id));
                          else setSelected((prev) => [...prev, u._id]);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.isActive ? 'active' : 'disabled'}
                        onChange={(e) => toggleStatus(u._id, e.target.value === 'active')}
                        className="p-2 rounded-md border border-gray-300 text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      {u.role === 'shopkeeper' ? (
                        <select
                          value={u.shopId?._id || ''}
                          onChange={(e) => assignShop(u._id, e.target.value)}
                          className="p-2 rounded-md border border-gray-300 text-sm"
                        >
                          <option value="">Select Shop</option>
                          {shops.map((shop) => (
                            <option key={shop._id} value={shop._id}>
                              {shop.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">{new Date(u.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => {
                          setEditUser(u);
                          setFormData({
                            name: u.name,
                            email: u.email,
                            role: u.role,
                            phone: u.phone || '',
                            shopId: u.shopId?._id || '',
                          });
                          setShowEditModal(true);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(u._id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;