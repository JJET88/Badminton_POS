/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import React, { useState, useEffect, useMemo } from "react";
import useProductStore from "@/app/store/useProductStore";
import toast from "react-hot-toast";

export default function ProductManage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [pageSize, setPageSize] = useState(8);

  const { products, loading, fetchProducts } = useProductStore();

  // Load products once
  useEffect(() => {
    fetchProducts();
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  // FIXED: Correct DELETE handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Product deleted successfully");
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete product");
    }
  };

  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category || "Uncategorized"))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products;

    if (search) {
      list = list.filter((p) =>
        p.title?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedCategory !== "All") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    return list;
  }, [products, search, selectedCategory]);

  // Pagination fix (use filteredProducts instead of all products)
  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + pageSize
  );

  const goNext = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const goPrev = () => currentPage > 1 && setCurrentPage((p) => p - 1);

  // LOADING UI remains unchanged
  if (loading)
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-700 animate-pulse">
          Loading amazing products...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto">
        {/* SEARCH + ADD PRODUCT */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Link
              href="/products/create"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              <span>Add Product</span>
            </Link>
          </div>

          {/* CATEGORY FILTER */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCT CARDS (UI unchanged) */}
        {currentProducts.length ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {currentProducts.map((p) => (
              <li
                key={p.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <Link
                  href={`/products/${p.id}`}
                  className="block relative overflow-hidden bg-gray-50 aspect-square"
                >
                  <img
                    src={p.image || p.imageUrl}
                    alt={p.title || p.name}
                    className="w-full h-full object-contain p-4 hover:scale-105 transition-transform duration-300"
                  />
                  {p.category && (
                    <span className="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                      {p.category}
                    </span>
                  )}
                </Link>

                <div className="p-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[3rem]">
                    {p.title || p.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {p.description}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-bold text-indigo-600">
                      ${p.price}
                    </span>

                    <div className="flex gap-1">
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Edit"
                      >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Link>

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="Delete"
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-gray-700">
              No products found
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* PAGINATION FIX */}
        <div className="flex justify-between items-center mt-6">
          <div>
            <label className="mr-2 text-gray-600">Rows per page:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border px-3 py-1 rounded"
            >
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={goNext}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
