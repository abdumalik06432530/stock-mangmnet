import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { backendUrl } from "../../config";
import { toast } from "react-toastify";
import sanitizeMessage from "../../utils/sanitizeMessage";
import { debounce } from "lodash";
import { Package, Search, AlertCircle, Edit, Trash2, Plus, Minus } from "lucide-react";

const List = ({ token }) => {
  // State
  const [list, setList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState("");
  const [editingAccessories, setEditingAccessories] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Token validation
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-gray-900">Unauthorized Access</h3>
          <p className="text-xs text-gray-600 mt-2">Please log in to access the Product List.</p>
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

  // Fetch products
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${backendUrl}/api/product/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const products = response.data.products.reverse();
        setList(products);
      } else {
        setError(sanitizeMessage(response.data.message));
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      console.error("Fetch list error:", error);
      setError(sanitizeMessage(error.response?.data?.message) || "Failed to fetch products");
      toast.error(sanitizeMessage(error.response?.data?.message) || "Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Remove product (DELETE)
  const removeProduct = useCallback(
    async (id) => {
      if (!confirm("Delete product? This action cannot be undone.")) return;
      try {
        const response = await axios.delete(`${backendUrl}/api/product/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          toast.success(response.data.message);
          fetchList();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error("Remove product error:", error);
        toast.error(sanitizeMessage(error.response?.data?.message) || "Failed to remove product");
      }
    },
    [fetchList, token]
  );

  // Get display quantity - for chairs, use "back" accessory quantity as main quantity
  const getDisplayQuantity = useCallback((item) => {
    if (item.category === "Chair" && item.accessoryQuantities && item.accessoryQuantities["back"]) {
      return item.accessoryQuantities["back"];
    }
    return item.quantity || 0;
  }, []);

  // Edit main quantity
  const startEdit = useCallback((id, currentQuantity) => {
    setEditingId(id);
    setEditingQuantity(String(currentQuantity ?? 0));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingQuantity("");
    setEditingAccessories({});
  }, []);

  // Save main quantity
  const saveQuantity = useCallback(
    async (id, item) => {
      const quantity = parseInt(editingQuantity, 10);
      if (isNaN(quantity) || quantity < 0) {
        toast.error("Please enter a valid non-negative quantity");
        return;
      }

      try {
        let response;
        
        if (item.category === "Chair") {
          // For chairs, update the "back" accessory quantity
          const updatedAccessories = {
            ...item.accessoryQuantities,
            back: quantity
          };
          
          response = await axios.post(
            `${backendUrl}/api/product/update-accessories`,
            { 
              id, 
              accessoryQuantities: updatedAccessories 
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          // For other products, update main quantity
          response = await axios.post(
            `${backendUrl}/api/product/update-quantity`,
            { id, quantity },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        if (response.data.success) {
          toast.success(sanitizeMessage(response.data.message) || "Quantity updated");
          cancelEdit();
          fetchList();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error("Update quantity error:", error);
        toast.error(sanitizeMessage(error.response?.data?.message) || "Failed to update quantity");
      }
    },
    [editingQuantity, fetchList, token, cancelEdit]
  );

  // Edit accessory quantity
  const startAccessoryEdit = useCallback((itemId, accessoryName, currentQuantity) => {
    setEditingAccessories(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [accessoryName]: String(currentQuantity ?? 0)
      }
    }));
  }, []);

  const cancelAccessoryEdit = useCallback((itemId, accessoryName) => {
    setEditingAccessories(prev => {
      const newState = { ...prev };
      if (newState[itemId]) {
        delete newState[itemId][accessoryName];
        if (Object.keys(newState[itemId]).length === 0) {
          delete newState[itemId];
        }
      }
      return newState;
    });
  }, []);

  // Save accessory quantity
  const saveAccessoryQuantity = useCallback(
    async (id, accessoryName, item) => {
      const quantity = parseInt(editingAccessories[id]?.[accessoryName], 10);
      if (isNaN(quantity) || quantity < 0) {
        toast.error("Please enter a valid non-negative quantity");
        return;
      }

      try {
        const updatedAccessories = {
          ...item.accessoryQuantities,
          [accessoryName]: quantity
        };

        const response = await axios.post(
          `${backendUrl}/api/product/update-accessories`,
          { 
            id, 
            accessoryQuantities: updatedAccessories 
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          toast.success(sanitizeMessage(response.data.message) || "Accessory quantity updated");
          cancelAccessoryEdit(id, accessoryName);
          fetchList();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error("Update accessory quantity error:", error);
        toast.error(sanitizeMessage(error.response?.data?.message) || "Failed to update accessory quantity");
      }
    },
    [editingAccessories, fetchList, token, cancelAccessoryEdit]
  );

  // Add new accessory
  const addNewAccessory = useCallback(async (id, item) => {
    const accessoryName = prompt("Enter accessory name:");
    if (!accessoryName) return;

    const quantity = parseInt(prompt("Enter quantity:", "0"), 10);
    if (isNaN(quantity) || quantity < 0) {
      toast.error("Please enter a valid non-negative quantity");
      return;
    }

    try {
      const updatedAccessories = {
        ...item.accessoryQuantities,
        [accessoryName]: quantity
      };

      const response = await axios.post(
        `${backendUrl}/api/product/update-accessories`,
        { 
          id, 
          accessoryQuantities: updatedAccessories 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Accessory added successfully");
        fetchList();
      } else {
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      console.error("Add accessory error:", error);
      toast.error(sanitizeMessage(error.response?.data?.message) || "Failed to add accessory");
    }
  }, [fetchList, token]);

  // Remove accessory
  const removeAccessory = useCallback(async (id, accessoryName, item) => {
    if (!confirm(`Remove accessory "${accessoryName}"?`)) return;

    try {
      const updatedAccessories = { ...item.accessoryQuantities };
      delete updatedAccessories[accessoryName];

      const response = await axios.post(
        `${backendUrl}/api/product/update-accessories`,
        { 
          id, 
          accessoryQuantities: updatedAccessories 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Accessory removed successfully");
        fetchList();
      } else {
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      console.error("Remove accessory error:", error);
      toast.error(sanitizeMessage(error.response?.data?.message) || "Failed to remove accessory");
    }
  }, [fetchList, token]);

  // Toggle expandable row
  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  // Memoized filtered list
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const searchText = [
        item._id,
        item.name,
        item.category,
        item.subCategory,
        item.category === "Chair" ? Object.keys(item.accessoryQuantities || {}).join(" ") : item.type || "",
      ]
        .join(" ")
        .toLowerCase();
      return searchText.includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, list]);

  // Fetch products on mount
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Component for rendering accessory details with editing capabilities
  const AccessoryDetails = ({ item, isExpanded }) => (
    <div className={`mt-3 p-3 bg-gray-50 rounded-lg ${isExpanded ? "block" : "hidden"}`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-semibold text-gray-700">Accessories</h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            addNewAccessory(item._id, item);
          }}
          className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-all duration-200"
          aria-label="Add new accessory"
        >
          <Plus className="h-3 w-3" />
          <span>Add Accessory</span>
        </button>
      </div>
      
      {item.accessoryQuantities && Object.keys(item.accessoryQuantities).length > 0 ? (
        <div className="space-y-2">
          {Object.entries(item.accessoryQuantities).map(([accessoryName, quantity]) => (
            <div key={accessoryName} className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-xs font-medium text-gray-800 capitalize">{accessoryName}</span>
              
              <div className="flex items-center space-x-2">
                {editingAccessories[item._id]?.[accessoryName] !== undefined ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editingAccessories[item._id][accessoryName]}
                      onChange={(e) => setEditingAccessories(prev => ({
                        ...prev,
                        [item._id]: {
                          ...prev[item._id],
                          [accessoryName]: e.target.value
                        }
                      }))}
                      min="0"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Edit ${accessoryName} quantity`}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveAccessoryQuantity(item._id, accessoryName, item);
                      }}
                      className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      aria-label={`Save ${accessoryName} quantity`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelAccessoryEdit(item._id, accessoryName);
                      }}
                      className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                      aria-label="Cancel edit"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600 min-w-8 text-center">{quantity || 0}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startAccessoryEdit(item._id, accessoryName, quantity);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      aria-label={`Edit ${accessoryName} quantity`}
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAccessory(item._id, accessoryName, item);
                      }}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      aria-label={`Remove ${accessoryName}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-2">No accessories</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4 md:p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-0">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Package className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">All Products</h2>
              <p className="text-xs text-gray-500">Manage your product inventory</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search products..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              aria-label="Search products by ID, name, category, subcategory, or accessories"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-3">Loading products...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchList}
              className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
              aria-label="Retry loading products"
            >
              Retry
            </button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-4 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-600">No products found</p>
            <p className="text-xs text-gray-400">Try adjusting your search or add new products.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px] items-center py-2 px-3 bg-indigo-50 rounded-lg text-xs font-semibold text-gray-800 shadow-sm">
              <span>Model</span>
              <span>Category</span>
              <span>Subcategory</span>
              <span>Quantity</span>
              <span className="text-center">Actions</span>
            </div>

            {/* Product List */}
            {filteredList.map((item) => (
              <div
                key={item._id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_120px] items-center gap-3 py-3 px-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-200"
              >
                {/* Model */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(item._id);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs"
                    aria-label={`Toggle details for ${item.model || item.name}`}
                  >
                    {expandedRows[item._id] ? "▼" : "▶"}
                  </button>
                  <span className="font-semibold text-sm text-gray-900 truncate hover:text-indigo-600 transition-colors duration-200">
                    {item.model || item.name || `Product ${item._id.slice(-8)}`}
                  </span>
                </div>
                {/* Category */}
                <div className="text-xs text-gray-600 capitalize">{item.category}</div>
                {/* Subcategory */}
                <div className="text-xs text-gray-600 capitalize">{item.subCategory}</div>
                {/* Quantity */}
                <div className="flex items-center space-x-2">
                  {editingId === item._id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={editingQuantity}
                        onChange={(e) => setEditingQuantity(e.target.value)}
                        min="0"
                        className="w-16 px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label={`Edit quantity for ${item.model || item.name}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveQuantity(item._id, item);
                        }}
                        className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        aria-label={`Save quantity for ${item.model || item.name}`}
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                        aria-label="Cancel quantity edit"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">{getDisplayQuantity(item)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(item._id, getDisplayQuantity(item));
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs"
                        aria-label={`Edit quantity for ${item.model || item.name}`}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newModel = prompt("Enter new model name:", item.model || item.name);
                      if (newModel && newModel !== (item.model || item.name)) {
                        axios
                          .put(
                            `${backendUrl}/api/product/${item._id}`,
                            { model: newModel },
                            { headers: { Authorization: `Bearer ${token}` } }
                          )
                          .then((res) => {
                            toast.success("Product updated");
                            fetchList();
                          })
                          .catch((err) => {
                            toast.error("Failed to update product");
                          });
                      }
                    }}
                    className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    aria-label={`Edit ${item.model || item.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProduct(item._id);
                    }}
                    className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-all duration-200 shadow-sm hover:shadow-md"
                    aria-label={`Remove ${item.model || item.name}`}
                  >
                    Delete
                  </button>
                </div>
                {/* Accessory Details */}
                <div className="col-span-1 md:col-span-5">
                  <AccessoryDetails item={item} isExpanded={expandedRows[item._id]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default List;