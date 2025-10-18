import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { backendUrl } from "../../config";
import { toast } from "react-toastify";
import sanitizeMessage from "../../utils/sanitizeMessage";
import { debounce } from "lodash"; // Ensure lodash is installed for debouncing

const List = ({ token }) => {
  // State
  const [list, setList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Token validation
  if (!token) {
    toast.error("You are not authorized to access this page. Please log in.");
    return null;
  }

  // Fetch products
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/product/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const products = response.data.products.reverse();
        setList(products);
      } else {
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      console.error("Fetch list error:", error);
      toast.error(
        sanitizeMessage(error.response?.data?.message) || "Failed to fetch products"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Remove product
  const removeProduct = useCallback(
    async (id) => {
      try {
        const response = await axios.post(
          `${backendUrl}/api/product/remove`,
          { id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          toast.success(response.data.message);
          fetchList();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error("Remove product error:", error);
        toast.error(
          sanitizeMessage(error.response?.data?.message) || "Failed to remove product"
        );
      }
    },
    [fetchList, token]
  );

  // Edit quantity
  const startEdit = useCallback((id, currentQuantity) => {
    setEditingId(id);
    setEditingQuantity(String(currentQuantity ?? 0));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingQuantity("");
  }, []);

  const saveQuantity = useCallback(
    async (id) => {
      const quantity = parseInt(editingQuantity, 10);
      if (isNaN(quantity) || quantity < 0) {
        toast.error("Please enter a valid non-negative quantity");
        return;
      }
      try {
        const response = await axios.post(
          `${backendUrl}/api/product/update-quantity`,
          { id, quantity },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          toast.success(sanitizeMessage(response.data.message) || "Quantity updated");
          cancelEdit();
          fetchList();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error("Update quantity error:", error);
        toast.error(
          sanitizeMessage(error.response?.data?.message) || "Failed to update quantity"
        );
      }
    },
    [editingQuantity, fetchList, token, cancelEdit]
  );

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
        item.category === "Chair"
          ? Object.keys(item.accessoryQuantities || {}).join(" ")
          : item.type || "",
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

  // Component for rendering accessory details
  const AccessoryDetails = ({ item, isExpanded }) => (
    <div className="mt-2 text-xs sm:text-sm">
      {item.accessoryQuantities && Object.keys(item.accessoryQuantities).length > 0 ? (
        <ul className="list-disc pl-4">
          {Object.entries(item.accessoryQuantities).map(([acc, qty]) => (
            <li key={acc}>
              {acc}: {qty || "0"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No accessories</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-6 md:p-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h2 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3 mb-4 sm:mb-0">
          <span className="text-indigo-600 transform hover:scale-110 transition-transform duration-300">
            📦
          </span>
          All Products
        </h2>
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by ID, name, category, subcategory, or accessories..."
            onChange={(e) => debouncedSearch(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            aria-label="Search products"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-md">
          <p className="text-lg text-gray-500 font-medium animate-pulse">
            Loading products... 🚀
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[80px_2fr_1fr_1fr_1fr_120px] items-center py-3 px-4 bg-indigo-100 rounded-xl text-sm font-semibold text-gray-800 shadow-md">
            <span>Image</span>
            <span>Name</span>
            <span>Category</span>
            <span>Subcategory</span>
            <span>Details</span>
            <span className="text-center">Action</span>
          </div>

          {/* Product List */}
          {filteredList.map((item, index) => (
            <div
              key={item._id}
              className="grid grid-cols-1 sm:grid-cols-[80px_2fr_1fr_1fr_1fr_120px] items-center gap-4 py-3 px-4 border border-gray-200 rounded-xl bg-white shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center sm:block">
                <div className="relative">
                  <img
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm transform hover:scale-105 transition-transform duration-200"
                    src={
                      item.image && item.image[0]
                        ? item.image[0]
                        : "https://via.placeholder.com/64?text=No+Image"
                    }
                    alt={item.name}
                    aria-label={`Image of ${item.name}`}
                  />
                  <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
                <div className="sm:hidden ml-3">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">
                    {item.category} / {item.subCategory}
                  </p>
                  {item.lastEditedBy && item.lastEditedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Edited by {item.lastEditedBy.name} •{" "}
                      {new Date(item.lastEditedAt).toLocaleString()}
                      {typeof item.lastQuantityDelta === "number" && (
                        <span
                          className={`ml-2 font-semibold ${
                            item.lastQuantityDelta > 0
                              ? "text-green-600"
                              : item.lastQuantityDelta < 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {item.lastQuantityDelta > 0
                            ? `+${item.lastQuantityDelta}`
                            : item.lastQuantityDelta}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="hidden sm:block">
                <p className="text-base font-semibold text-gray-900 truncate hover:text-indigo-600 transition-colors duration-200">
                  {item.name}
                </p>
                {item.lastEditedBy && item.lastEditedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Edited by {item.lastEditedBy.name} •{" "}
                    {new Date(item.lastEditedAt).toLocaleString()}
                    {typeof item.lastQuantityDelta === "number" && (
                      <span
                        className={`ml-2 font-semibold ${
                          item.lastQuantityDelta > 0
                            ? "text-green-600"
                            : item.lastQuantityDelta < 0
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {item.lastQuantityDelta > 0
                          ? `+${item.lastQuantityDelta}`
                          : item.lastQuantityDelta}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <p className="hidden sm:block text-sm text-gray-600 capitalize">
                {item.category}
              </p>
              <p className="hidden sm:block text-sm text-gray-600 capitalize">
                {item.subCategory}
              </p>
              <div className="hidden sm:block">
                {item.category === "Chair" ? (
                  <div>
                    <button
                      onClick={() => toggleRow(item._id)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                      aria-expanded={expandedRows[item._id]}
                      aria-controls={`accessories-${item._id}`}
                    >
                      {expandedRows[item._id] ? "Hide Accessories" : "Show Accessories"}
                      <span>{expandedRows[item._id] ? "▲" : "▼"}</span>
                    </button>
                    {expandedRows[item._id] && (
                      <div id={`accessories-${item._id}`}>
                        <AccessoryDetails item={item} isExpanded={expandedRows[item._id]} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">{item.type || "N/A"}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {editingId === item._id ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      min="0"
                      value={editingQuantity}
                      onChange={(e) => setEditingQuantity(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label={`Edit quantity for ${item.name}`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveQuantity(item._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors duration-200"
                        aria-label={`Save quantity for ${item.name}`}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors duration-200"
                        aria-label="Cancel edit"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    <p className="text-sm text-gray-700 font-medium">
                      {item.quantity ?? (
                        <span className="text-red-500">Out of Stock</span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item._id, item.quantity)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors duration-200"
                        aria-label={`Edit quantity for ${item.name}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeProduct(item._id)}
                        className="px-3 py-1 text-red-500 hover:text-red-700 text-lg font-bold rounded-lg hover:bg-red-50 transition-all duration-200"
                        title="Remove Product"
                        aria-label={`Remove ${item.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Mobile view for details */}
              <div className="sm:hidden mt-2">
                {item.category === "Chair" ? (
                  <div>
                    <button
                      onClick={() => toggleRow(item._id)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1"
                      aria-expanded={expandedRows[item._id]}
                      aria-controls={`accessories-mobile-${item._id}`}
                    >
                      {expandedRows[item._id] ? "Hide Accessories" : "Show Accessories"}
                      <span>{expandedRows[item._id] ? "▲" : "▼"}</span>
                    </button>
                    {expandedRows[item._id] && (
                      <div id={`accessories-mobile-${item._id}`}>
                        <AccessoryDetails item={item} isExpanded={expandedRows[item._id]} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">Type: {item.type || "N/A"}</p>
                )}
              </div>
            </div>
          ))}

          {filteredList.length === 0 && !isLoading && (
            <div className="text-center py-10 bg-white rounded-xl shadow-md">
              <p className="text-lg text-gray-500 font-medium animate-pulse">
                No products found. Try adjusting your search or add new products! 🚀
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default List;