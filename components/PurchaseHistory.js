"use client";

import React, { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, Package, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchaseHistory() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [purchases, setPurchases] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    limit: 20,
    offset: 0
  });

  useEffect(() => {
    if (user?.id) {
      fetchPurchaseHistory();
    }
  }, [user, filters]);

  async function fetchPurchaseHistory() {
    if (!user?.id) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', filters.limit);
      params.append('offset', filters.offset);

      const res = await fetch(`/api/users/${user.id}/purchases?${params}`);
      
      if (!res.ok) throw new Error('Failed to fetch purchase history');

      const data = await res.json();
      setPurchases(data.purchases);
      setStatistics(data.statistics);
    } catch (err) {
      console.error('Error fetching purchase history:', err);
      toast.error('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  }

  async function viewPurchaseDetails(saleId) {
    try {
      const res = await fetch(`/api/users/${user.id}/purchases/${saleId}`);
      
      if (!res.ok) throw new Error('Failed to fetch purchase details');

      const data = await res.json();
      setSelectedPurchase(data);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching purchase details:', err);
      toast.error('Failed to load purchase details');
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function resetFilters() {
    setFilters({
      startDate: '',
      endDate: '',
      limit: 20,
      offset: 0
    });
  }

  function goBack() {
    router.back();
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800">Please login to view your purchase history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Go Back Button */}
        <button
          onClick={goBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Go Back</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Purchase History
          </h1>
          <p className="text-gray-600">View all your past orders and transactions</p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-700 font-medium">Total Orders</p>
              </div>
              <p className="text-3xl font-bold text-blue-900">{statistics.total_orders}</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700 font-medium">Total Spent</p>
              </div>
              <p className="text-3xl font-bold text-green-900">${parseFloat(statistics.total_spent).toFixed(2)}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-purple-700 font-medium">Average Order</p>
              </div>
              <p className="text-3xl font-bold text-purple-900">${parseFloat(statistics.average_order).toFixed(2)}</p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">💰</span>
                <p className="text-sm text-yellow-700 font-medium">Total Savings</p>
              </div>
              <p className="text-3xl font-bold text-yellow-900">${parseFloat(statistics.total_savings).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-700">Filter Orders</h3>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, offset: 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, offset: 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={resetFilters}
              className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Purchase List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading purchases...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600 text-lg mb-2">No purchases found</p>
            <p className="text-gray-500 text-sm">Start shopping to see your order history here</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.sale_id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all hover:border-blue-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Order #{purchase.sale_id}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(purchase.purchase_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${parseFloat(purchase.total).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{purchase.paymentType}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    📦 {purchase.items_count} product{purchase.items_count !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    🔢 {purchase.total_items} item{purchase.total_items !== 1 ? 's' : ''}
                  </span>
                  {purchase.discount > 0 && (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      💰 Saved ${parseFloat(purchase.discount).toFixed(2)}
                    </span>
                  )}
                  {purchase.voucherCode && (
                    <span className="text-blue-600 font-medium flex items-center gap-1">
                      🎟️ {purchase.voucherCode}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => viewPurchaseDetails(purchase.sale_id)}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                >
                  View Details
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Purchase Details Modal */}
        {showDetails && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
                <h2 className="text-xl font-semibold">Order Details #{selectedPurchase.id}</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Order Info */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Order Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedPurchase.purchaseDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Payment Method</p>
                      <p className="font-semibold text-gray-900">{selectedPurchase.paymentType}</p>
                    </div>
                    {selectedPurchase.voucherCode && (
                      <div>
                        <p className="text-gray-600 mb-1">Voucher Code</p>
                        <p className="font-semibold text-blue-600">{selectedPurchase.voucherCode}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Items
                  </h3>
                  <div className="space-y-3">
                    {selectedPurchase.items.map((item) => (
                      <div key={item.id} className="flex gap-4 border-b pb-3 last:border-b-0">
                        {item.product.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-600">{item.product.category}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            ${parseFloat(item.unitPrice).toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${parseFloat(item.lineTotal).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-medium">${parseFloat(selectedPurchase.subtotal).toFixed(2)}</span>
                  </div>
                  {selectedPurchase.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Discount</span>
                      <span className="font-medium">- ${parseFloat(selectedPurchase.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Tax (10%)</span>
                    <span className="font-medium">${parseFloat(selectedPurchase.tax).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-green-300 pt-2 flex justify-between font-bold text-lg">
                    <span className="text-gray-900">Total</span>
                    <span className="text-green-700">${parseFloat(selectedPurchase.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}