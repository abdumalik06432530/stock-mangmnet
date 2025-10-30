import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, User, MapPin, Phone, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { backendUrl } from '../../config';
import shopkeeperSim from '../../utils/shopkeeperSim';
import sanitizeMessage from '../../utils/sanitizeMessage';

const SalesManagement = ({ token, shopId }) => {
  if (!token) {
    toast.error('You are not authorized to access this page. Please log in.');
    return null;
  }

  // State for form
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [type, setType] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    email: '',
  });
  const [showSaleForm, setShowSaleForm] = useState(false);
  // State for sales history
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Predefined categories
  const predefinedCategories = ['Chair', 'Table', 'Shelf', 'Others'];

  // Fetch products and sales history
  const fetchProducts = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`${backendUrl}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data.products || []);
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to fetch products'
      );
    } finally {
      setIsFetching(false);
    }
  }, [token]);

  const fetchSalesHistory = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`${backendUrl}/api/shops/${shopId}/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalesHistory(response.data.sales || []);
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to fetch sales history'
      );
    } finally {
      setIsFetching(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    fetchProducts();
    fetchSalesHistory();
  }, [fetchProducts, fetchSalesHistory]);

  // Update form fields when a product is selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p._id === selectedProductId);
      if (product) {
        setCategory(product.category);
        setSubCategory(product.subCategory);
        setType(product.type || '');
        setIsCustomCategory(product.category === 'Others');
      }
    } else {
      setCategory('');
      setSubCategory('');
      setType('');
      setIsCustomCategory(false);
    }
  }, [selectedProductId, products]);

  // Reset type when category changes
  useEffect(() => {
    if (category === 'Chair') {
      setType('');
    }
    if (category !== 'Others') {
      setIsCustomCategory(false);
    }
  }, [category]);

  const submitSale = async (e) => {
    e.preventDefault();

    if (!selectedProductId && !isCustomCategory) {
      toast.info('Please select a product or specify a custom item');
      return;
    }
    if (!category || (!subCategory && !isCustomCategory) || quantity < 1) {
      toast.info('Please fill all required fields and set a valid quantity');
      return;
    }
    if (!customerDetails.firstName || !customerDetails.phone) {
      toast.error('Customer first name and phone are required');
      return;
    }

    setLoading(true);
    try {
      const product = selectedProductId
        ? products.find((p) => p._id === selectedProductId)
        : null;

      const payload = {
        shopId,
        customer: customerDetails,
        items: [
          {
            productId: selectedProductId || undefined,
            name: product ? product.name : 'Custom Item',
            description: product ? product.description : '',
            furnitureType: isCustomCategory ? subCategory : product?.subCategory || subCategory,
            category: isCustomCategory ? category : product?.category || category,
            quantity: parseInt(quantity, 10),
            type: category !== 'Chair' && !isCustomCategory ? type : undefined,
          },
        ],
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };

      const response = await axios.post(`${backendUrl}/api/sales`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        toast.success('Sale recorded successfully');
        setSelectedProductId('');
        setQuantity(1);
        setCategory('');
        setSubCategory('');
        setType('');
        setIsCustomCategory(false);
        setCustomerDetails({
          firstName: '',
          lastName: '',
          address: '',
          phone: '',
          email: '',
        });
        setShowSaleForm(false);
        fetchSalesHistory();
      } else {
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Unauthorized: Please log in again');
      } else if (error.response?.status === 400 && error.response.data?.message.includes('stock')) {
        toast.error('Sale rejected by factory: Insufficient stock');
      } else {
        try {
          const simSale = shopkeeperSim.recordSale(shopId, {
            customer: customerDetails,
            items: [
              {
                productId: selectedProductId || undefined,
                name: products.find((p) => p._id === selectedProductId)?.name || 'Custom Item',
                furnitureType: isCustomCategory ? subCategory : subCategory,
                category: isCustomCategory ? category : category,
                quantity: parseInt(quantity, 10),
                type: category !== 'Chair' && !isCustomCategory ? type : undefined,
              },
            ],
          });
          toast.success(`Sale recorded (sim): ${simSale._id}`);
          setSelectedProductId('');
          setQuantity(1);
          setCategory('');
          setSubCategory('');
          setType('');
          setIsCustomCategory(false);
          setCustomerDetails({
            firstName: '',
            lastName: '',
            address: '',
            phone: '',
            email: '',
          });
          setShowSaleForm(false);
          setSalesHistory((prev) => [simSale, ...prev]);
        } catch (simErr) {
          console.error(simErr);
          toast.error(sanitizeMessage(simErr.message) || 'Failed to record sale');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelSale = async (saleId) => {
    setLoading(true);
    try {
      await axios.delete(`${backendUrl}/api/sales/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Sale canceled successfully');
      fetchSalesHistory();
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to cancel sale'
      );
    } finally {
      setLoading(false);
    }
  };

  // Group products by category for dropdown
  const categories = [...new Set(products.map((p) => p.category)), 'Others'];
  const subcategories = selectedProductId
    ? [products.find((p) => p._id === selectedProductId)?.subCategory]
    : category && !isCustomCategory
    ? [...new Set(products.filter((p) => p.category === category).map((p) => p.subCategory))]
    : [];

  const pendingSales = salesHistory.filter((sale) => (sale.status || '').toLowerCase() === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-2 md:p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-2 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Sales Management</h2>
            <p className="text-gray-600 text-[11px]">Record and track customer sales</p>
          </div>
          <div className="flex items-center space-x-2">
            {pendingSales.length > 0 && (
              <div className="bg-orange-50 px-1.5 py-0.25 rounded-lg flex items-center space-x-1">
                <AlertTriangle className="h-2.5 w-2.5 text-orange-600" />
                <span className="text-orange-800 text-[11px] font-medium">
                  {pendingSales.length} Pending Sales
                </span>
              </div>
            )}
            <button
              onClick={() => fetchSalesHistory()}
              className="px-1.5 py-0.25 bg-indigo-600 text-white text-[11px] rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              aria-label="Refresh sales"
            >
              Refresh Sales
            </button>
            <button
              onClick={() => setShowSaleForm(true)}
              className="px-1.5 py-0.25 bg-green-600 text-white text-[11px] rounded-lg hover:bg-green-700 transition-colors duration-200"
              aria-label="Show record sale form"
            >
              Record Sale
            </button>
          </div>
        </div>
      </div>

      {isFetching && (
        <div className="text-center py-1.5">
          <svg
            className="animate-spin h-4 w-4 text-indigo-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-gray-500 text-[11px]">Loading data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* Main Content (Recent Sales) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm p-2">
            <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5">Recent Sales</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Sale ID
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesHistory.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-3 py-1.5 text-center text-gray-500 text-[10px]">
                        No recent sales
                      </td>
                    </tr>
                  )}
                  {salesHistory.slice(0, 4).map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] font-medium text-gray-900">
                        #{sale._id.slice(-6)}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-500">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-500">
                        {sale.customer.firstName} {sale.customer.lastName}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-500">
                        {sale.items[0].furnitureType} ({sale.items[0].type || sale.items[0].category})
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-500">
                        {sale.items[0].quantity}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span
                          className={`px-1 py-0.25 rounded-full text-[10px] font-medium ${
                            sale.status === 'Delivered'
                              ? 'bg-green-100 text-green-800'
                              : sale.status === 'Processing'
                              ? 'bg-blue-100 text-blue-800'
                              : sale.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px]">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-indigo-600 hover:text-indigo-700 transition-colors duration-200 mr-2"
                          aria-label={`View details for sale ${sale._id}`}
                        >
                          Details
                        </button>
                        {(sale.status || '').toLowerCase() === 'pending' && (
                          <button
                            onClick={() => cancelSale(sale._id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 transition-colors duration-200 disabled:opacity-50"
                            aria-label={`Cancel sale ${sale._id}`}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar (Pending Sales Alert) */}
        <div className="lg:col-span-1">
          {pendingSales.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-2">
              <h3 className="text-[11px] font-semibold text-gray-900 mb-1 flex items-center">
                <AlertTriangle className="h-2.5 w-2.5 text-orange-600 mr-1" />
                Pending Sales
              </h3>
              <div className="space-y-1">
                {pendingSales.map((sale) => (
                  <div key={sale._id} className="flex items-center justify-between p-1 bg-orange-50 border border-orange-200 rounded-lg">
                    <div>
                      <p className="font-medium text-orange-900 text-[11px]">
                        Sale #{sale._id.slice(-6)}
                      </p>
                      <p className="text-[10px] text-orange-700">
                        {sale.items[0].furnitureType} (Qty: {sale.items[0].quantity})
                      </p>
                    </div>
                    <button
                      onClick={() => cancelSale(sale._id)}
                      className="px-1.5 py-0.25 bg-red-600 text-white text-[10px] rounded-lg hover:bg-red-700 transition-colors duration-200"
                      aria-label={`Cancel sale ${sale._id}`}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Sale Modal */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-2 max-w-md w-full">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-gray-900">Record Sale</h3>
              <button
                onClick={() => setShowSaleForm(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Close sale form"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <form onSubmit={submitSale} className="space-y-2">
              {/* Customer Details */}
              <div>
                <h4 className="text-[11px] font-semibold text-gray-900 mb-1 flex items-center">
                  <User className="h-2.5 w-2.5 text-gray-400 mr-0.5" />
                  Customer Information
                </h4>
                <div className="space-y-1">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={customerDetails.firstName}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, firstName: e.target.value })
                      }
                      className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="John"
                      required
                      aria-label="Customer first name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={customerDetails.lastName}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, lastName: e.target.value })
                      }
                      className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Doe"
                      aria-label="Customer last name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 flex items-center">
                      <MapPin className="h-2 w-2 mr-0.5" />
                      Address
                    </label>
                    <input
                      type="text"
                      value={customerDetails.address}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, address: e.target.value })
                      }
                      className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="123 Main Street"
                      aria-label="Customer address"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 flex items-center">
                      <Phone className="h-2 w-2 mr-0.5" />
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={customerDetails.phone}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, phone: e.target.value })
                      }
                      className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="+1 (555) 123-4567"
                      required
                      aria-label="Customer phone"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerDetails.email}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, email: e.target.value })
                      }
                      className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="john.doe@example.com"
                      aria-label="Customer email"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <label htmlFor="product" className="block mb-0.5 text-[10px] font-semibold text-gray-700">
                  Select Product
                </label>
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Select product"
                >
                  <option value="">Select a product or custom item</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.category}: {product.subCategory})
                    </option>
                  ))}
                  <option value="custom">Custom Item (Others)</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block mb-0.5 text-[10px] font-semibold text-gray-700">
                  Category *
                </label>
                {isCustomCategory ? (
                  <input
                    id="category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Enter custom category"
                    required
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Custom category"
                  />
                ) : (
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setIsCustomCategory(e.target.value === 'Others');
                    }}
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Select category"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subcategory */}
              <div>
                <label htmlFor="subcategory" className="block mb-0.5 text-[10px] font-semibold text-gray-700">
                  Subcategory *
                </label>
                {isCustomCategory ? (
                  <input
                    id="subcategory"
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="Enter custom subcategory"
                    required
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Custom subcategory"
                  />
                ) : (
                  <select
                    id="subcategory"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Select subcategory"
                  >
                    <option value="">Select Subcategory</option>
                    {subcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block mb-0.5 text-[10px] font-semibold text-gray-700">
                  Quantity *
                </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="1"
                  required
                  className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Sale quantity"
                />
              </div>

              {/* Type for Non-Chair */}
              {category && category !== 'Chair' && !isCustomCategory && (
                <div>
                  <label htmlFor="type" className="block mb-0.5 text-[10px] font-semibold text-gray-700">
                    Type
                  </label>
                  <input
                    id="type"
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="Enter type"
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Item type"
                  />
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold py-1 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Record sale"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-3 w-3 mr-1 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Recording Sale...
                    </span>
                  ) : (
                    <>
                      <span>➕</span> Record Sale
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaleForm(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white text-[11px] font-semibold py-1 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                  aria-label="Cancel sale"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-1.5 max-w-xs w-full">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-semibold">Sale #{selectedSale._id.slice(-6)}</h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Close sale details"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-[9px]">
                <strong>Customer:</strong> {selectedSale.customer.firstName}{' '}
                {selectedSale.customer.lastName}
              </p>
              {selectedSale.customer.phone && (
                <p className="text-[9px]">
                  <strong>Phone:</strong> {selectedSale.customer.phone}
                </p>
              )}
              {selectedSale.customer.email && (
                <p className="text-[9px]">
                  <strong>Email:</strong> {selectedSale.customer.email}
                </p>
              )}
              {selectedSale.customer.address && (
                <p className="text-[9px]">
                  <strong>Address:</strong> {selectedSale.customer.address}
                </p>
              )}
              <p className="text-[9px]">
                <strong>Status:</strong> {selectedSale.status}
              </p>
              <p className="text-[9px]">
                <strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleDateString()}
              </p>
              <p className="text-[9px]">
                <strong>Items:</strong>
              </p>
              <ul className="list-disc pl-2 text-[9px]">
                {selectedSale.items.map((item, index) => (
                  <li key={index}>
                    {item.name} ({item.furnitureType}, Qty: {item.quantity})
                    {item.type && <span>, Type: {item.type}</span>}
                  </li>
                ))}
              </ul>
              {selectedSale.status === 'Rejected' && selectedSale.rejectionReason && (
                <p className="text-[9px]">
                  <strong>Rejection Reason:</strong> {selectedSale.rejectionReason}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedSale(null)}
              className="mt-1 w-full py-1 bg-indigo-600 text-white text-[11px] rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              aria-label="Close sale details"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;