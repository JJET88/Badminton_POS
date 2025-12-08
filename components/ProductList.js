/* eslint-disable @next/next/no-img-element */
"use client";
import useCartStore from "@/app/store/useCartStore";
import useProductStore from "@/app/store/useProductStore";
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import Slideshow from "./Slideshow";
import Header from "./Header";
import { TrendingUp, Zap, Award } from "lucide-react";

const showToast = (message, type = "info") => {
  if (type === "success") toast.success(message);
  else if (type === "error") toast.error(message);
  else toast(message);
};

// Enhanced slideshow data with promotional content
// const slideshowData = [
//   {
//     image: "https://li-ning.co.uk/wp-content/uploads/2022/04/aeronaut-9000-combat-11.jpg-1.jpg",
//     title: "Li-Ning Aeronaut Series",
//     subtitle: "Premium Performance Rackets",
//     badge: "New Arrival"
//   },
//   {
//     image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsDCuTLNw-C54SaOmwzjyLx1_zKcPp4hT3jQ&s",
//     title: "Professional Badminton Bags",
//     subtitle: "Carry Your Gear in Style",
//     badge: "Best Seller"
//   },
//   {
//     image: "https://shop.r10s.jp/starracket/cabinet/2025/nf-1000g.jpg",
//     title: "Yonex Nanoflare 1000z",
//     subtitle: "Lightning Fast Speed",
//     badge: "Hot Deal"
//   },
// ];

export default function ProductList() {
  const { carts, addCart } = useCartStore();
  const { products, loading, fetchProducts } = useProductStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [pageSize, setPageSize] = useState(8);
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

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

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + pageSize
  );

  const goNext = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const goPrev = () => currentPage > 1 && setCurrentPage((p) => p - 1);

  const handleAddedBtn = (event) => {
    event.stopPropagation();
    showToast("Item is already in My Cart", "error");
  };

  const handleAddToCart = (event, productId) => {
    event.stopPropagation();

    if (carts.find((c) => c.productId === productId)) {
      return showToast("Item already in cart!", "error");
    }

    addCart({
      id: Date.now(),
      productId,
      quantity: 1,
    });
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Header search={search} setSearch={setSearch} />

        {/* PROMOTIONAL BANNERS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Zap className="w-10 h-10 mb-2" />
            <h3 className="text-xl font-bold mb-1">Fast Shipping</h3>
            <p className="text-sm text-blue-100">Free delivery on orders over $100</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Award className="w-10 h-10 mb-2" />
            <h3 className="text-xl font-bold mb-1">Premium Quality</h3>
            <p className="text-sm text-green-100">Authentic products guaranteed</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <TrendingUp className="w-10 h-10 mb-2" />
            <h3 className="text-xl font-bold mb-1">Earn Points</h3>
            <p className="text-sm text-purple-100">Get 5 points with every purchase</p>
          </div>
        </div>

        {/* ENHANCED SLIDESHOW */}
        {/* <div className="max-w-6xl mx-auto my-8">
          <Slideshow images={slideshowData.map(s => s.image)} />
        </div> */}

        {/* CATEGORY FILTER WITH COUNT */}
        <div className="flex flex-wrap justify-center gap-3 py-6">
          {categories.map((cat) => {
            const count = cat === "All" 
              ? products.length 
              : products.filter(p => p.category === cat).length;
            
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2 ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white scale-105 shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategory === cat 
                    ? "bg-blue-500" 
                    : "bg-gray-100"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* RESULTS INFO & VIEW TOGGLE */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-gray-600">
            Showing <span className="font-semibold text-gray-900">{currentProducts.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{filteredProducts.length}</span> products
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* PRODUCT GRID/LIST */}
        {currentProducts.length ? (
          <ul className={viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            : "flex flex-col gap-4"
          }>
            {currentProducts.map((p) => (
              <li
                key={p.id}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 ${
                  viewMode === "list" ? "flex" : ""
                }`}
              >
                <Link
                  href={`/products/${p.id}`}
                  className={`relative overflow-hidden bg-gray-50 ${
                    viewMode === "grid" 
                      ? "block aspect-square" 
                      : "w-48 h-48 flex-shrink-0"
                  }`}
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
                  {p.stock <= 5 && p.stock > 0 && (
                    <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                      Only {p.stock} left
                    </span>
                  )}
                  {p.stock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </Link>

                <div className={`p-4 ${viewMode === "list" ? "flex-1 flex flex-col justify-between" : ""}`}>
                  <div>
                    <h2 className={`font-semibold text-gray-900 mb-1 ${
                      viewMode === "grid" ? "text-base line-clamp-2 min-h-[3rem]" : "text-lg"
                    }`}>
                      {p.title || p.name}
                    </h2>

                    <p className={`text-sm text-gray-600 mb-3 ${
                      viewMode === "grid" ? "line-clamp-2" : "line-clamp-3"
                    }`}>
                      {p.description || "No description available"}
                    </p>
                  </div>

                  <div className={`flex items-center ${
                    viewMode === "list" ? "justify-between" : "justify-between"
                  } gap-2`}>
                    <div>
                      <span className="text-xl font-bold text-indigo-600">
                        ${p.price}
                      </span>
                      {p.stock > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Stock: {p.stock}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Link
                        href={`/products/${p.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                      >
                        View
                      </Link>

                      {p.stock > 0 ? (
                        carts.find((cart) => cart.productId === p.id) ? (
                          <button
                            onClick={(e) => handleAddedBtn(e)}
                            className="px-4 py-2 text-white rounded-lg bg-blue-900 hover:bg-blue-700 transition-all"
                          >
                            Added
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleAddToCart(e, p.id)}
                            className="px-4 py-2 text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition-all"
                          >
                            Add to Cart
                          </button>
                        )
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 text-white rounded-lg bg-gray-400 cursor-not-allowed"
                        >
                          Unavailable
                        </button>
                      )}
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
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-8 mb-8">
          <div>
            <label className="mr-2 text-gray-600">Rows per page:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={16}>16</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>

            <span className="text-gray-700 font-medium">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={goNext}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}