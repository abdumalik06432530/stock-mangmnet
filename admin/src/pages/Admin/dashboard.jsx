import { useEffect, useState, useMemo, useCallback } from "react";
import PropTypes from 'prop-types';
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../../config";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { BarChart2, ShoppingCart, Package, Truck, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';

const Dashboard = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [range, setRange] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Simple Line Chart
  const SimpleLineChart = ({ data = [], height = 300 }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
          <AlertCircle className="h-6 w-6 mr-2" aria-hidden="true" />
          No data available for the selected range
        </div>
      );
    }

    const padding = 30;
    const w = 800;
    const h = height;
    const maxOrders = Math.max(...data.map(d => d.orders || 0), 1);

    const x = (i) => padding + (i * (w - padding * 2)) / (data.length - 1 || 1);
    const yForOrders = (val) => h - padding - (val / maxOrders) * (h - padding * 2);
    const pathOrders = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yForOrders(d.orders)}`).join(' ');

    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto">
        <rect x="0" y="0" width="100%" height="100%" fill="transparent" />
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => (
          <line key={idx} x1={padding} x2={w - padding} y1={padding + t * (h - padding * 2)} y2={padding + t * (h - padding * 2)} stroke="#e5e7eb" />
        ))}
        {/* Orders path */}
        <path d={pathOrders} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={yForOrders(d.orders)} r={4} fill="#4f46e5" />
        ))}
        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={h - padding + 14} fontSize={data.length > 10 ? "8" : "10"} textAnchor="middle" fill="#6b7280">{d.date}</text>
        ))}
      </svg>
    );
  };

  SimpleLineChart.propTypes = {
    data: PropTypes.array,
    height: PropTypes.number,
  };

  // Simple Bar Chart
  const SimpleBarChart = ({ data = [], height = 300 }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
          <AlertCircle className="h-6 w-6 mr-2" aria-hidden="true" />
          No product data available
        </div>
      );
    }

    const padding = 20;
    const w = 800;
    const h = height;
    const max = Math.max(...data.map(d => d.qty || 0), 1);
    const barWidth = (w - padding * 2) / data.length;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto">
        {data.map((d, i) => {
          const barH = ((d.qty || 0) / max) * (h - padding * 2);
          const x = padding + i * barWidth + 4;
          const y = h - padding - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth - 8} height={barH} fill="#4f46e5" rx="4" />
              <text x={x + (barWidth - 8) / 2} y={h - padding + 12} fontSize={data.length > 8 ? "8" : "10"} textAnchor="middle" fill="#6b7280">{d.name?.slice(0, 10)}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  SimpleBarChart.propTypes = {
    data: PropTypes.array,
    height: PropTypes.number,
  };

  // Fetch dashboard data
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productRes, orderRes] = await Promise.all([
        axios.get(`${backendUrl}/api/product/list`),
        axios.post(`${backendUrl}/api/order/list`, {}, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (productRes.data.success && orderRes.data.success) {
        setProducts(productRes.data.products || []);
        setOrders(orderRes.data.orders || []);
      } else {
        setError("Failed to fetch dashboard data");
        toast.error("Failed to fetch dashboard data");
      }
    } catch (error) {
      setError(error.message || "Error loading dashboard data");
      toast.error(error.message || "Error loading dashboard data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchStats();
  }, [fetchStats, token]);

  // Token validation
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center animate-fade-in">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-gray-900">Unauthorized Access</h3>
          <p className="text-xs text-gray-600 mt-2">Please log in to access the Dashboard.</p>
          <button
            onClick={() => (window.location.href = '/login')}
            className="mt-3 px-4 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
            aria-label="Go to login page"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const completedOrders = useMemo(() => orders.filter((o) => o.status === "Delivered").length, [orders]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status !== "Delivered").length, [orders]);

  const chartData = useMemo(() => {
    const map = new Map();
    const getKey = (date) => {
      const d = new Date(date);
      if (range === 'daily') return d.toLocaleDateString();
      if (range === 'weekly') {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        return start.toLocaleDateString();
      }
      if (range === 'monthly') return `${d.getMonth() + 1}/${d.getFullYear()}`;
      return `${d.getFullYear()}`;
    };

    orders.forEach((o) => {
      const key = getKey(o.date);
      const entry = map.get(key) || { date: key, orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += Number(o.totalAmount ?? o.total ?? 0);
      map.set(key, entry);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [orders, range]);

  const exportToExcel = useCallback(() => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const productSheet = XLSX.utils.json_to_sheet(products);
      const orderSheet = XLSX.utils.json_to_sheet(orders);
      XLSX.utils.book_append_sheet(wb, productSheet, 'Products');
      XLSX.utils.book_append_sheet(wb, orderSheet, 'Orders');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, `hf-dashboard-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
      console.error(error);
    } finally {
      setExporting(false);
    }
  }, [products, orders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BarChart2 className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Overview of your platform’s performance</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 w-full sm:w-auto"
              aria-label="Select time range for charts"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button
              onClick={fetchStats}
              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center w-full sm:w-auto"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </button>
            <button
              onClick={exportToExcel}
              disabled={exporting}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 flex items-center w-full sm:w-auto"
              aria-label="Export data to Excel"
            >
              {exporting ? (
                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white mr-1"></div>
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-3">Loading dashboard data...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-3 px-4 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
              aria-label="Retry loading dashboard data"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border-l-4 border-indigo-500 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                  <p className="text-xs font-medium text-gray-600">Total Products</p>
                </div>
                <h3 className="text-xl font-bold text-indigo-700 mt-2">{products.length}</h3>
              </div>
              <div className="bg-white border-l-4 border-purple-500 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" aria-hidden="true" />
                  <p className="text-xs font-medium text-gray-600">Total Orders</p>
                </div>
                <h3 className="text-xl font-bold text-purple-700 mt-2">{orders.length}</h3>
              </div>
              <div className="bg-white border-l-4 border-yellow-500 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                  <p className="text-xs font-medium text-gray-600">Pending Orders</p>
                </div>
                <h3 className="text-xl font-bold text-yellow-700 mt-2">{pendingOrders}</h3>
              </div>
              <div className="bg-white border-l-4 border-green-500 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                  <p className="text-xs font-medium text-gray-600">Delivered Orders</p>
                </div>
                <h3 className="text-xl font-bold text-green-700 mt-2">{completedOrders}</h3>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200">
                <h2 className="text-base font-semibold text-gray-800 mb-3">Orders ({range.charAt(0).toUpperCase() + range.slice(1)})</h2>
                <div className="overflow-x-auto">
                  <SimpleLineChart data={chartData} height={250} />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200">
                <h2 className="text-base font-semibold text-gray-800 mb-3">Product Stock</h2>
                <div className="overflow-x-auto">
                  <SimpleBarChart
                    data={products.slice(0, 10).map(p => ({ name: p.name, qty: p.quantity ?? 0 }))}
                    height={250}
                  />
                </div>
              </div>
            </div>

            {/* Recent Orders & Product Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200">
                <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Orders</h2>
                {orders.length === 0 ? (
                  <div className="flex items-center justify-center h-[150px] text-gray-500 text-sm">
                    <AlertCircle className="h-6 w-6 mr-2" aria-hidden="true" />
                    No recent orders
                  </div>
                ) : (
                  orders.slice(0, 8).map((order, index) => (
                    <div
                      key={index}
                      className="border-b py-2 text-xs text-gray-700 hover:bg-indigo-50 rounded-lg px-2 transition-all duration-200"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">
                          {order.address?.firstName} {order.address?.lastName}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            order.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.date).toLocaleDateString()} | {order.address?.city || 'N/A'}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200">
                <h2 className="text-base font-semibold text-gray-800 mb-3">Product Overview</h2>
                {products.length === 0 ? (
                  <div className="flex items-center justify-center h-[150px] text-gray-500 text-sm">
                    <AlertCircle className="h-6 w-6 mr-2" aria-hidden="true" />
                    No products available
                  </div>
                ) : (
                  products.slice(0, 8).map((product, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b text-xs text-gray-700 hover:bg-indigo-50 rounded-lg px-2 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={product.image && product.image[0] ? product.image[0] : "https://via.placeholder.com/40?text=No+Image"}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                          alt={product.name}
                        />
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.category || 'N/A'}</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          product.quantity < 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {product.quantity ?? "Out of Stock"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

Dashboard.propTypes = {
  token: PropTypes.string,
};