import axios from 'axios';
import { useState } from 'react';
import { backendUrl } from '../config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const Register = ({ setToken }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', role: 'shopkeeper', shopId: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => setForm(s => ({ ...s, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.name || !form.email || !form.password) { toast.error('Please fill required fields'); return false; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 chars'); return false; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return false; }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const payload = {
        username: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
        phone: form.phone,
        shopId: form.shopId || undefined,
      };
      const res = await axios.post(`${backendUrl}/api/user/create`, payload);
      if (res.data.success) {
        // auto-login
        const login = await axios.post(`${backendUrl}/api/auth/login`, { username: form.email, password: form.password });
        if (login.data && login.data.token) {
          setToken(login.data.token);
          localStorage.setItem('token', login.data.token);
          try { if (login.data.user) localStorage.setItem('user', JSON.stringify(login.data.user)); } catch (e) {}
        }
        toast.success('Account created and logged in');
        const role = form.role;
        if (role === 'admin') navigate('/dashboard');
        else if (role === 'shopkeeper') navigate('/shopkeepers');
        else if (role === 'factory') navigate('/factory');
        else navigate('/');
      } else {
        toast.error(res.data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Register error', err);
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center">Create Account</h2>
        <div className="space-y-3">
          <input name="name" value={form.name} onChange={onChange} placeholder="Full name" className="w-full p-3 border rounded" />
          <input name="email" value={form.email} onChange={onChange} type="email" placeholder="Email" className="w-full p-3 border rounded" />
          <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" className="w-full p-3 border rounded" />
          <select name="role" value={form.role} onChange={onChange} className="w-full p-3 border rounded">
            <option value="shopkeeper">Shopkeeper</option>
            <option value="factory">Factory Manager</option>
            <option value="admin">Admin</option>
          </select>
          <input name="password" value={form.password} onChange={onChange} type="password" placeholder="Password" className="w-full p-3 border rounded" />
          <input name="confirm" value={form.confirm} onChange={onChange} type="password" placeholder="Confirm password" className="w-full p-3 border rounded" />
        </div>
        <button disabled={isLoading} className={`mt-4 w-full py-3 rounded text-white ${isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {isLoading ? 'Creating...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

Register.propTypes = { setToken: PropTypes.func.isRequired };

export default Register;
