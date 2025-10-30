import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { backendUrl } from '../../config';
import { toast } from 'react-toastify';
import sanitizeMessage from '../../utils/sanitizeMessage';
import { Search, Plus, Edit, Trash2, Users as UsersIcon, Filter, X } from 'lucide-react';

const Users = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
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
    <div className="bg-white rounded-lg p-3 mb-2 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selected.includes(user._id)}
            onChange={() => {
              if (selected.includes(user._id)) setSelected((prev) => prev.filter((id) => id !== user._id));
              else setSelected((prev) => [...prev, user._id]);
            }}
            className="h-3 w-3 text-indigo-600"
          />
          <div>
            <h3 className="font-medium text-gray-900 text-sm">{user.name}</h3>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
            user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {user.isActive ? 'Active' : 'Disabled'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs mb-2">
        <div className="flex items-center">
          <span className="text-gray-500 mr-1">Role:</span>
          <span className="capitalize text-gray-700">{user.role}</span>
        </div>
        <div className="flex items-center">
          <span className="text-gray-500 mr-1">Phone:</span>
          <span className="text-gray-700">{user.phone || '-'}</span>
        </div>
        <div className="col-span-2 flex items-center">
          <span className="text-gray-500 mr-1">Shop:</span>
          <span className="text-gray-700">{user.shopId?.name || '-'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <select
          value={user.isActive ? 'active' : 'disabled'}
          onChange={(e) => toggleStatus(user._id, e.target.value === 'active')}
          className="p-1 rounded border border-gray-300 text-xs flex-1 min-w-20"
        >
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        {user.role === 'shopkeeper' && (
          <select
            value={user.shopId?._id || ''}
            onChange={(e) => assignShop(user._id, e.target.value)}
            className="p-1 rounded border border-gray-300 text-xs flex-1 min-w-20"
          >
            <option value="">Select Shop</option>
            {shops.map((shop) => (
              <option key={shop._id} value={shop._id}>
                {shop.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-1 flex-1 justify-end">
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
            className="p-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={() => deleteUser(user._id)}
            className="p-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );

  // Create/Edit Modal
  const UserModal = ({ isEdit = false }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {isEdit ? 'Edit User' : 'Create User'}
          </h3>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEditUser(null);
              setFormData({ name: '', email: '', role: 'shopkeeper', phone: '', shopId: '', password: '' });
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              placeholder={isEdit ? 'Enter new password' : 'Enter password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="shopkeeper">Shopkeeper</option>
              <option value="factory">Factory Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {formData.role === 'shopkeeper' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Shop</label>
              <select
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Shop</option>
                {shops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setEditUser(null);
              setFormData({ name: '', email: '', role: 'shopkeeper', phone: '', shopId: '', password: '' });
            }}
            className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={isEdit ? editUserHandler : createUser}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <UsersIcon className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              <p className="text-xs text-gray-500">Manage user accounts and permissions</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Create User
          </button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-auto"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selected.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-blue-800 font-medium text-xs">
                {selected.length} user{selected.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-1 w-full sm:w-auto">
                <select
                  id="bulkStatus"
                  className="p-1.5 text-xs rounded border border-gray-300 bg-white flex-1 sm:flex-none"
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
                  className="px-2 py-1.5 bg-indigo-600 text-white rounded text-xs disabled:opacity-50 hover:bg-indigo-700 transition-colors flex-1 sm:flex-none"
                >
                  {bulkLoading ? 'Applying...' : 'Apply'}
                </button>
                <button
                  onClick={() => setSelected([])}
                  className="px-2 py-1.5 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
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
        <div>
          {loading ? (
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">Loading users...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
              <UsersIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No users found</p>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="mt-1 text-indigo-600 hover:text-indigo-800 text-xs"
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => {
                      if (isAllSelected) setSelected([]);
                      else setSelected(filtered.map((u) => u._id));
                    }}
                    className="h-3 w-3 text-indigo-600"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-1">Loading users...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center">
                    <UsersIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No users found</p>
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        className="mt-1 text-indigo-600 hover:text-indigo-800 text-xs"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(u._id)}
                        onChange={() => {
                          if (selected.includes(u._id))
                            setSelected((prev) => prev.filter((id) => id !== u._id));
                          else setSelected((prev) => [...prev, u._id]);
                        }}
                        className="h-3 w-3 text-indigo-600"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{u.name}</td>
                    <td className="px-3 py-2 text-gray-600">{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={u.isActive ? 'active' : 'disabled'}
                        onChange={(e) => toggleStatus(u._id, e.target.value === 'active')}
                        className="p-1 text-xs rounded border border-gray-300 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{u.phone || '-'}</td>
                    <td className="px-3 py-2">
                      {u.role === 'shopkeeper' ? (
                        <select
                          value={u.shopId?._id || ''}
                          onChange={(e) => assignShop(u._id, e.target.value)}
                          className="p-1 text-xs rounded border border-gray-300 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Select Shop</option>
                          {shops.map((shop) => (
                            <option key={shop._id} value={shop._id}>
                              {shop.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditUser(u);
                            setFormData({
                              name: u.name,
                              email: u.email,
                              role: u.role,
                              phone: u.phone || '',
                              shopId: u.shopId?._id || '',
                              password: '',
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          title="Edit user"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteUser(u._id)}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
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