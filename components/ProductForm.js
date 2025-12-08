/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Toast placeholder
const showToast = (message, type) => {
  console.log(`[${type}] ${message}`);
};

export default function ProductForm({ productId }) {
  const [form, setForm] = useState({
    title: "",
    description:"",
    price: "",
    stock: "",
    category: "",
    image: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const router = useRouter();

  // Fetch existing product for edit mode
  useEffect(() => {
    if (!productId) return;

    setFetching(true);
    fetch(`/api/products/${productId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        setForm({
          title: data.title || "",
          description:data.description || "",
          price: data.price?.toString() || "",
          stock: data.stock?.toString() || "",
          category: data.category || "",
          image: data.image || "",
        });
      })
      .catch((err) => {
        console.error(err);
        showToast("❌ Failed to fetch product.", "error");
      })
      .finally(() => setFetching(false));
  }, [productId]);

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: form.title,
        description:form.description,
        price: form.price ? parseFloat(form.price) : 0,
        stock: form.stock ? parseInt(form.stock, 10) : 0,
        category: form.category,
        image: form.image,
      };

      const method = productId ? "PUT" : "POST";
      const url = productId ? `/api/products/${productId}` : "/api/products";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save product");

      showToast(
        `✅ Product ${productId ? "updated" : "created"} successfully!`,
        "success"
      );

      router.push("/dashboard/products");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to save product.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <span className="text-gray-600 animate-pulse">
          Loading product data...
        </span>
      </div>
    );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-xl border border-gray-100">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
          🛍️ {productId ? "Edit Product" : "Create New Product"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Title
            </label>
            <input
              name="title"
              type="text"
              placeholder="Product title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              rows="4"
              placeholder="Describe your product..."
              value={form.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:outline-none resize-none transition-all shadow-sm"
            />
          </div>

          {/* Price, Stock & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Price (USD)
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Stock
              </label>
              <input
                name="stock"
                type="number"
                step="1"
                value={form.stock}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
           

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Category
              </label>
              <input
                name="category"
              type="text"
              placeholder="Product title"
                value={form.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Image URL
            </label>
            <input
              name="image"
              type="text"
              placeholder="https://example.com/product.png"
              value={form.image}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 transition"
            />

            {form.image && (
              <div className="mt-4 flex justify-center">
                <img
                  src={form.image}
                  alt="Preview"
                  className="w-48 h-48 object-contain rounded-xl border shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard/products")}
              className="flex-1 px-6 py-3 bg-white/70 backdrop-blur-sm text-gray-700 rounded-lg font-semibold hover:bg-white border border-gray-200 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:bg-gray-400 transition-all flex justify-center items-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                    5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 
                    3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {loading
                ? "Saving..."
                : productId
                ? "Update Product"
                : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
