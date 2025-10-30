import React, { useState, useEffect } from 'react';
import { Package, User, MapPin, Phone, X } from 'lucide-react';
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
  const [accessoryQuantities, setAccessoryQuantities] = useState({});
  const [type, setType] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    email: '',
  });

  // State for sales history
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Predefined categories
  const predefinedCategories = ['Chair', 'Table', 'Shelf', 'Others'];

  // Accessory options for chairs
  const accessoryOptions = [
    'Arm',
    'Mechanism',
    'Headrest',
    'Castor',
    'Chrome',
    'Gas Lift',
    'Cup Holder',
    'Chair Back',
  ];

  // Fetch products and sales history
  useEffect(() => {
    fetchProducts();
    fetchSalesHistory();
  }, [shopId]);

  const fetchProducts = async () => {
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
  };

  const fetchSalesHistory = async () => {
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
  };

  // Update form fields when a product is selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p._id === selectedProductId);
      if (product) {
        setCategory(product.category);
        setSubCategory(product.subCategory);
        setAccessoryQuantities(product.accessoryQuantities || {});
        setType(product.type || '');
        setIsCustomCategory(product.category === 'Others');
      }
    } else {
      setCategory('');
      setSubCategory('');
      setAccessoryQuantities({});
      setType('');
      setIsCustomCategory(false);
    }
  }, [selectedProductId, products]);

  // Reset accessories and type when category changes
  useEffect(() => {
    if (category !== 'Chair') {
      setAccessoryQuantities({});
    }
    if (category === 'Chair') {
      setType('');
    }
    if (category !== 'Others') {
      setIsCustomCategory(false);
    }
  }, [category]);

  const handleAccessoryChange = (acc, value) => {
    setAccessoryQuantities((prev) => ({
      ...prev,
      [acc]: value ? parseInt(value, 10) : '',
    }));
  };

  const calculateTotal = () => {
    const product = selectedProductId
      ? products.find((p) => p._id === selectedProductId)
      : null;
    const price = product ? product.price || 200 : 200; // Default price for custom items
    return price * parseInt(quantity || 1, 10);
  };

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
            price: product ? product.price || 200 : 200,
            accessories: category === 'Chair' ? accessoryQuantities : undefined,
            type: category !== 'Chair' && !isCustomCategory ? type : undefined,
          },
        ],
        total: calculateTotal(),
      };

      const response = await axios.post(`${backendUrl}/api/sales`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        toast.success('Sale recorded successfully');
        // Reset form
        setSelectedProductId('');
        setQuantity(1);
        setCategory('');
        setSubCategory('');
        setAccessoryQuantities({});
        setType('');
        setIsCustomCategory(false);
        setCustomerDetails({
          firstName: '',
          lastName: '',
          address: '',
          phone: '',
          email: '',
        });
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
                price: products.find((p) => p._id === selectedProductId)?.price || 200,
                accessories: category === 'Chair' ? accessoryQuantities : undefined,
                type: category !== 'Chair' && !isCustomCategory ? type : undefined,
              },
            ],
            total: calculateTotal(),
          });
          toast.success(`Sale recorded (sim): ${simSale._id}`);
          setSelectedProductId('');
          setQuantity(1);
          setCategory('');
          setSubCategory('');
          setAccessoryQuantities({});
          setType('');
          setIsCustomCategory(false);
          setCustomerDetails({
            firstName: '',
            lastName: '',
            address: '',
            phone: '',
            email: '',
          });
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

  const pendingSales = salesHistory.filter((sale) => sale.status === 'Pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-6 md:p-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900">Sales Management</h2>
            <p className="text-gray-600">Record and track customer sales</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <span className="text-green-800 font-medium">
                Today's Sales: $
                {salesHistory
                  .filter((sale) =>
                    new Date(sale.createdAt).toDateString() === new Date().toDateString()
                  )
                  .reduce((sum, sale) => sum + sale.total, 0)
                  .toFixed(2)}
              </span>
            </div>
            <div className="bg-orange-50 px-4 py-2 rounded-lg">
              <span className="text-orange-800 font-medium">
                {pendingSales.length} Pending Sales
              </span>
            </div>
          </div>
        </div>
      </div>

      {isFetching && (
        <div className="text-center py-4">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-gray-500">Loading data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sale Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form
            onSubmit={submitSale}
            className="max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-300"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <span className="text-indigo-600">➕</span> Record Customer Sale
            </h3>

            <div className="space-y-6">
              {/* Customer Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={customerDetails.firstName}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, firstName: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="John"
                      required
                      aria-label="Customer first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={customerDetails.lastName}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, lastName: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Doe"
                      aria-label="Customer last name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Address
                    </label>
                    <input
                      type="text"
                      value={customerDetails.address}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, address: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="123 Main Street"
                      aria-label="Customer address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={customerDetails.phone}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, phone: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="+1 (555) 123-4567"
                      required
                      aria-label="Customer phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerDetails.email}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, email: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="john.doe@example.com"
                      aria-label="Customer email"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <label htmlFor="product" className="block mb-2 text-sm font-semibold text-gray-700">
                  Select Product
                </label>
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Select product"
                >
                  <option value="">Select a product or custom item</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.category}: {product.subCategory}) - $
                      {product.price || 200}
                    </option>
                  ))}
                  <option value="custom">Custom Item (Others)</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block mb-2 text-sm font-semibold text-gray-700">
                  Category
                </label>
                {isCustomCategory ? (
                  <input
                    id="category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Enter custom category"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
                <label htmlFor="subcategory" className="block mb-2 text-sm font-semibold text-gray-700">
                  Subcategory
                </label>
                {isCustomCategory ? (
                  <input
                    id="subcategory"
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="Enter custom subcategory"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Custom subcategory"
                  />
                ) : (
                  <select
                    id="subcategory"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
                <label htmlFor="quantity" className="block mb-2 text-sm font-semibold text-gray-700">
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="1"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Sale quantity"
                />
              </div>

              {/* Chair Accessories */}
              {category === 'Chair' && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-gray-700">Chair Accessories Quantities</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accessoryOptions.map((acc) => (
                      <div key={acc}>
                        <label htmlFor={`acc-${acc}`} className="block mb-2 text-sm font-semibold text-gray-700">
                          {acc} Quantity
                        </label>
                        <input
                          id={`acc-${acc}`}
                          type="number"
                          value={accessoryQuantities[acc] || ''}
                          onChange={(e) => handleAccessoryChange(acc, e.target.value)}
                          placeholder={`Enter ${acc} quantity`}
                          min="0"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          aria-label={`${acc} quantity`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type for Non-Chair */}
              {category && category !== 'Chair' && !isCustomCategory && (
                <div>
                  <label htmlFor="type" className="block mb-2 text-sm font-semibold text-gray-700">
                    Type
                  </label>
                  <input
                    id="type"
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="Enter type"
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Item type"
                  />
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Record sale"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
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
                    <span>➕</span> Record Sale - ${calculateTotal().toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sales History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h3>
          <div className="space-y-3">
            {salesHistory.length === 0 && <p className="text-center text-gray-500">No recent sales</p>}
            {salesHistory.slice(0, 5).map((sale) => (
              <div key={sale._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Sale #{sale._id.slice(-6)}</p>
                  <p className="text-sm text-gray-500">
                    {sale.customer.firstName} {sale.customer.lastName} •{' '}
                    {new Date(sale.createdAt).toLocaleDateString()} • ${sale.total.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                  <button
                    onClick={() => setSelectedSale(sale)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                    aria-label={`View details for sale ${sale._id}`}
                  >
                    Details
                  </button>
                  {sale.status === 'Pending' && (
                    <button
                      onClick={() => cancelSale(sale._id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                      aria-label={`Cancel sale ${sale._id}`}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sale #{selectedSale._id.slice(-6)}</h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close sale details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p>
              <strong>Customer:</strong> {selectedSale.customer.firstName}{' '}
              {selectedSale.customer.lastName}
            </p>
            {selectedSale.customer.phone && (
              <p>
                <strong>Phone:</strong> {selectedSale.customer.phone}
              </p>
            )}
            {selectedSale.customer.email && (
              <p>
                <strong>Email:</strong> {selectedSale.customer.email}
              </p>
            )}
            {selectedSale.customer.address && (
              <p>
                <strong>Address:</strong> {selectedSale.customer.address}
              </p>
            )}
            <p>
              <strong>Status:</strong> {selectedSale.status}
            </p>
            <p>
              <strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleDateString()}
            </p>
            <p>
              <strong>Total:</strong> ${selectedSale.total.toFixed(2)}
            </p>
            <p>
              <strong>Items:</strong>
            </p>
            <ul className="list-disc pl-5">
              {selectedSale.items.map((item, index) => (
                <li key={index}>
                  {item.name} ({item.furnitureType}, Qty: {item.quantity}, ${item.price.toFixed(2)})
                  {item.accessories && (
                    <ul className="list-circle pl-5">
                      {Object.entries(item.accessories).map(([acc, qty]) =>
                        qty > 0 ? (
                          <li key={acc}>
                            {acc}: {qty}
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                  {item.type && <span>, Type: {item.type}</span>}
                </li>
              ))}
            </ul>
            {selectedSale.status === 'Rejected' && selectedSale.rejectionReason && (
              <p>
                <strong>Rejection Reason:</strong> {selectedSale.rejectionReason}
              </p>
            )}
            <button
              onClick={() => setSelectedSale(null)}
              className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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