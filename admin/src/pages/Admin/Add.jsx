import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../../config";
import { toast } from "react-toastify";
import sanitizeMessage from "../../utils/sanitizeMessage";

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
    return null;
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
    "Chair Back"  // ✅ Added as single accessory (only quantity)
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-6 md:p-12">
      <form
        onSubmit={onSubmitHandler}
        className="max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-300 animate-fade-in"
      >
        <h2 className="text-4xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
          <span className="text-indigo-600 transform hover:scale-110 transition-transform duration-300">🛠️</span>
          Add New Product
        </h2>

        <div className="space-y-6">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-semibold text-gray-700">
              Product Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-semibold text-gray-700">
              Product Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product"
              required
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:bg-white"
            />
          </div>

          {/* Category & Subcategory */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <label htmlFor="category" className="block mb-2 text-sm font-semibold text-gray-700">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Category</option>
                <option value="Chair">Chair</option>
                <option value="Table">Table</option>
                <option value="Shelf">Shelf</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="subcategory" className="block mb-2 text-sm font-semibold text-gray-700">
                Sub Category
              </label>
              <select
                id="subcategory"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                required
                disabled={!category}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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

          {/* ✅ Chair Accessories (INCLUDES Chair Back) */}
          {category === "Chair" && (
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
                      value={accessoryQuantities[acc] || ""}
                      onChange={(e) => handleAccessoryChange(acc, e.target.value)}
                      placeholder={`Enter ${acc} quantity`}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type for Non-Chair */}
          {category && category !== "Chair" && (
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>➕</span> Add Product
          </button>
        </div>
      </form>
    </div>
  );
};

export default Add;