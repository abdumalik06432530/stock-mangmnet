import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../../config";
import { toast } from "react-toastify";
import sanitizeMessage from "../../utils/sanitizeMessage";
import { Package } from "lucide-react";

// Mock categories (replace with your actual import)
const categories = {
  Chair: ["Office Chair", "Gaming Chair", "Dining Chair"],
  Table: ["Dining Table", "Coffee Table", "Study Table"],
  Shelf: ["Bookshelf", "Wall Shelf", "Storage Shelf"],
  Others: ["Miscellaneous"]
};

const Add = ({ token }) => {
  if (!token) {
    toast.error("You are not authorized to access this page. Please log in.");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center transform transition-all duration-200 hover:scale-105">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3 animate-pulse" aria-hidden="true" />
          <h3 className="text-lg font-bold text-gray-900">Unauthorized Access</h3>
          <p className="text-xs text-gray-600 mt-2">Please log in to access the Add Product page.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
            aria-label="Go to login page"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [accessoryQuantities, setAccessoryQuantities] = useState({});
  const [type, setType] = useState("");

  const subcategoryOptions = categories;

  const accessoryOptions = [
    "Arm",
    "Mechanism",
    "Headrest",
    "Castor",
    "Chrome",
    "Gas Lift",
    "Cup Holder",
    "Chair Back"
  ];

  useEffect(() => {
    if (category && subcategoryOptions[category]) {
      setSubCategory(subcategoryOptions[category][0] || "");
    } else {
      setSubCategory("");
    }
    // Reset accessory quantities and type when category changes
    setAccessoryQuantities({});
    setType("");
  }, [category]);

  const handleAccessoryChange = (acc, value) => {
    setAccessoryQuantities((prev) => ({
      ...prev,
      [acc]: value
    }));
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name,
        description,
        category,
        subCategory,
        type: category === 'Chair' ? undefined : type,
        accessoryQuantities: category === 'Chair' ? accessoryQuantities : undefined
      };

      const response = await axios.post(`${backendUrl}/api/product/add`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Reset form
        setName("");
        setDescription("");
        setCategory("");
        setSubCategory("");
        setAccessoryQuantities({});
        setType("");
      } else {
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      console.error(error);
      toast.error(sanitizeMessage(error.response?.data?.message) || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4 md:p-6">
      <form
        onSubmit={onSubmitHandler}
        className="max-w-3xl mx-auto p-4 bg-white rounded-xl shadow-md border border-gray-100 transition-all duration-200 animate-fade-in"
      >
        <div className="flex items-center space-x-2 mb-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Package className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Add New Product</h2>
            <p className="text-xs text-gray-500">Create a new product with category and accessories</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block mb-1 text-xs font-semibold text-gray-700">
              Product Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
              className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:bg-white"
              aria-label="Product name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block mb-1 text-xs font-semibold text-gray-700">
              Product Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product"
              required
              rows={4}
              className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:bg-white"
              aria-label="Product description"
            />
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="category" className="block mb-1 text-xs font-semibold text-gray-700">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                aria-label="Select product category"
              >
                <option value="">Select Category</option>
                <option value="Chair">Chair</option>
                <option value="Table">Table</option>
                <option value="Shelf">Shelf</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label htmlFor="subcategory" className="block mb-1 text-xs font-semibold text-gray-700">
                Sub Category
              </label>
              <select
                id="subcategory"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                required
                disabled={!category}
                className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
                aria-label="Select product subcategory"
              >
                <option value="">Select Subcategory</option>
                {category &&
                  subcategoryOptions[category]?.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Chair Accessories */}
          {category === "Chair" && (
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-700">Chair Accessories Quantities</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accessoryOptions.map((acc) => (
                  <div key={acc}>
                    <label htmlFor={`acc-${acc}`} className="block mb-1 text-xs font-semibold text-gray-700">
                      {acc} Quantity
                    </label>
                    <input
                      id={`acc-${acc}`}
                      type="number"
                      value={accessoryQuantities[acc] || ""}
                      onChange={(e) => handleAccessoryChange(acc, e.target.value)}
                      placeholder={`Enter ${acc} quantity`}
                      min="0"
                      className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                      aria-label={`${acc} quantity`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type for Non-Chair */}
          {category && category !== "Chair" && (
            <div>
              <label htmlFor="type" className="block mb-1 text-xs font-semibold text-gray-700">
                Type
              </label>
              <input
                id="type"
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Enter type"
                required
                className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                aria-label="Product type"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-xs flex items-center justify-center gap-2"
            aria-label="Add new product"
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            <span>Add Product</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Add;