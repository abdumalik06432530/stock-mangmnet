import { useEffect, useState, useCallback } from "react";
import PropTypes from 'prop-types';
import axios from "axios";
import { backendUrl } from "../../config";
import { toast } from "react-toastify";
import { Package, Search, AlertCircle, Trash2, Phone, Download, Eye } from "lucide-react";

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // (Token check moved below to ensure hooks are called in a stable order)

  const fetchAllOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${backendUrl}/api/order/list`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        const orderList = response.data.orders.reverse();
        setOrders(orderList);
        setFilteredOrders(orderList);
      } else {
        setError(response.data.message);
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError(error.message || "Failed to fetch orders");
      toast.error(error.message || "Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  

  const actionHandler = useCallback(
    async (action, order) => {
      try {
        if (action === 'approve') {
          await approveOrder(order._id);
          return;
        }

        if (action === 'assign') {
          const driverId = window.prompt('Enter driver id to assign (or driver _id):');
          if (!driverId) return toast.info('Driver assignment cancelled');
          const res = await axios.put(
            `${backendUrl}/api/orders/${order._id}/assign-driver`,
            { driverId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data.success) {
            toast.success('Driver assigned');
            await fetchAllOrders();
          } else {
            toast.error(res.data.message || 'Failed to assign driver');
          }
          return;
        }

        if (action === 'deliver') {
          // deliver will validate server-side that order is ready (admin_approved/assigned/out_for_delivery)
          const res = await axios.put(
            `${backendUrl}/api/orders/${order._id}/deliver`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data.success) {
            toast.success('Order marked as delivered');
            await fetchAllOrders();
          } else {
            toast.error(res.data.message || 'Failed to mark delivered');
          }
          return;
        }
      } catch (err) {
        console.error('Action error', err);
        toast.error(err.response?.data?.message || 'Action failed');
      }
    },
    [approveOrder, fetchAllOrders, token]
  );

  const deleteHandler = useCallback(
    async (orderId) => {
      if (!confirm("Delete order? This action cannot be undone.")) return;
      try {
        const response = await axios.post(
          `${backendUrl}/api/order/delete`,
          { orderId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          toast.success("Order deleted successfully");
          await fetchAllOrders();
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        console.error("Delete order error:", error);
        toast.error("Failed to delete order");
      }
    },
    [fetchAllOrders, token]
  );

  const getBankStatementUrl = useCallback((bankStatement) => {
    if (!bankStatement || typeof bankStatement !== "string") return null;
    if (bankStatement.startsWith("http") || bankStatement.startsWith("/")) {
      return bankStatement.startsWith("/") ? `${backendUrl}${bankStatement}` : bankStatement;
    }
    const parts = bankStatement.split(/\\|\//);
    const filename = parts[parts.length - 1];
    return `${backendUrl}/uploads/${filename}`;
  }, []);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const approveOrder = useCallback(
    async (orderId) => {
      try {
        const res = await axios.put(
          `${backendUrl}/api/orders/${orderId}/admin-approve`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success && res.data.order) {
          await fetchAllOrders();
          toast.success('Order approved');
        } else {
          toast.error(res.data.message || 'Failed to approve order');
        }
      } catch (err) {
        console.error('Approve order error', err);
        toast.error(err.response?.data?.message || 'Failed to approve order');
      }
    },
    [fetchAllOrders, token]
  );

  useEffect(() => {
    const filtered = orders.filter((order) => {
      const id = order._id || '';
      const first = order.address?.firstName || order.customer?.firstName || order.user?.firstName || '';
      const last = order.address?.lastName || order.customer?.lastName || order.user?.lastName || '';
      const city = order.address?.city || order.city || '';
      return [id, `${first} ${last}`.trim(), city].join(' ').toLowerCase().includes(searchQuery.toLowerCase());
    });
    setFilteredOrders(filtered);
  }, [searchQuery, orders]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-gray-900">Unauthorized Access</h3>
          <p className="text-xs text-gray-600 mt-2">Please log in to access the Orders.</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
            aria-label="Go to login page"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4 md:p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-0">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Package className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">All Orders</h2>
              <p className="text-xs text-gray-500">Manage your order history</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by ID, name, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              aria-label="Search orders by ID, name, or city"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-3">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchAllOrders}
              className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
              aria-label="Retry loading orders"
            >
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-600">No orders found</p>
            <p className="text-xs text-gray-400">Try adjusting your search or check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order, index) => {
              const addr = order.address || {};
              const firstName = addr.firstName || order.customer?.firstName || order.user?.firstName || 'Unknown';
              const lastName = addr.lastName || order.customer?.lastName || order.user?.lastName || '';
              const street = addr.street || '';
              const city = addr.city || '';
              const state = addr.state || '';
              const country = addr.country || '';
              const zipcode = addr.zipcode || '';
              const phone = addr.phone || order.customer?.phone || '';

              return (
              <div
                key={order._id}
                className="bg-white shadow-md rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-indigo-50 p-3 rounded-lg shadow-sm">
                      <p className="font-semibold text-sm text-gray-900">
                        {firstName} {lastName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {street}{street && city ? ', ' : ''}{city}{city && state ? ', ' : ''}{state}
                      </p>
                      <p className="text-xs text-gray-600">
                        {country} {zipcode ? `- ${zipcode}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-gray-600">{phone}</p>
                        <a
                          href={`tel:${phone}`}
                          className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label={`Call ${phone}`}
                        >
                          <Phone className="h-3 w-3 inline-block mr-1" /> Call
                        </a>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Items:</p>
                      <div className="space-y-2">
                        {(order.items || []).map((item, idx) => {
                          const displayColor = item.color || item.size || "N/A";
                          const swatchColor = item.color || item.size || "";
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-all duration-200"
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={item.image?.[0] || "https://via.placeholder.com/40?text=No+Image"}
                                  alt={item.name}
                                  className="w-8 h-8 object-cover rounded-md border border-gray-200"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-gray-800 truncate max-w-[150px] md:max-w-[200px]">
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span
                                      className="inline-block w-3 h-3 rounded-full border"
                                      style={{ backgroundColor: swatchColor || "transparent" }}
                                    />
                                    <p className="text-xs text-gray-500">
                                      Color: <span className="font-medium capitalize">{displayColor}</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-indigo-600">×{item.quantity}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {order.bankStatement && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg shadow-sm">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Bank Statement:</p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          {(() => {
                            const url = getBankStatementUrl(order.bankStatement);
                            return url ? (
                              <>
                                <img
                                  src={url}
                                  alt="Bank statement"
                                  className="w-20 h-12 object-cover rounded-md border border-gray-200 shadow-sm"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setPreviewImage(url)}
                                    className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                    aria-label="View bank statement"
                                  >
                                    <Eye className="h-3 w-3 inline-block mr-1" /> View
                                  </button>
                                  <a
                                    href={url}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                    aria-label="Download bank statement"
                                  >
                                    <Download className="h-3 w-3 inline-block mr-1" /> Download
                                  </a>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-500">No preview available</p>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-700">
                  <div>
                    <p className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-600" />
                      <span className="font-semibold">Quantity:</span>
                      <span className="font-bold text-indigo-600">
                        {(order.items || []).reduce((total, item) => total + (item.quantity || 0), 0)}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 mt-2">
                      <span className="text-indigo-600">🧾</span>
                      <span className="font-semibold">Payment:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          order.payment ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}
                      >
                        {order.payment ? "Completed" : "Pending"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2">
                      <span className="text-indigo-600">📅</span>
                      <span className="font-semibold">Date:</span>
                      <span>{new Date(order.date).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-gray-700 text-xs">Status:</label>
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          // reset select UI after action
                          e.target.value = '';
                          if (val) actionHandler(val, order);
                        }}
                        value={''}
                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 appearance-none"
                        aria-label={`Actions for order ${order._id}`}
                      >
                        <option value="">Select action...</option>
                        <option value="approve">Approve (admin)</option>
                        <option value="assign">Assign Driver</option>
                        <option value="deliver">Mark Delivered</option>
                      </select>
                    </div>
                    {order.status === 'delivered' && (
                      <button
                        onClick={() => deleteHandler(order._id)}
                        className="mt-2 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1"
                        aria-label={`Delete order ${order._id}`}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    )}
                    {order.status === 'factory_accepted' && (
                      <button
                        onClick={() => approveOrder(order._id)}
                        className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        aria-label={`Approve order ${order._id}`}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-white rounded-xl overflow-hidden max-w-[90vw] md:max-w-4xl w-full mx-4 shadow-2xl">
              <div className="flex justify-end p-3">
                <button
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1 text-gray-700 text-xs rounded-lg hover:bg-gray-100 transition-all duration-200"
                  aria-label="Close preview"
                >
                  Close
                </button>
              </div>
              <div className="p-4">
                <img
                  src={previewImage}
                  alt="Bank statement preview"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-md"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Orders.propTypes = {
  token: PropTypes.string,
};

export default Orders;