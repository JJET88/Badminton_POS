"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SaleDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadSale() {
    if (!id) return;

    try {
      const res = await fetch(`/api/sales/${id}`);
      if (!res.ok) throw new Error("Failed to fetch sale");

      const data = await res.json();
      const saleData = Array.isArray(data) ? data[0] : data;
      setSale(saleData || null);
    } catch (err) {
      console.error("Failed to load sale:", err);
      setSale(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSale();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-800 mb-4">Sale not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="no-print flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🖨️ Print
          </button>
        </div>

        {/* Invoice */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Title */}
          <div className="border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
            <p className="text-gray-600 mt-1">TawBayin Badminton Store</p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="text-xl font-bold text-gray-800">#{sale.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="text-gray-800">{new Date(sale.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="text-gray-800">{sale.paymentType || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cashier ID</p>
              <p className="text-gray-800">{sale.cashierId || "N/A"}</p>
            </div>
          </div>

          {/* Voucher */}
          {sale.voucherCode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-600">Voucher Applied</p>
              <p className="text-lg font-bold text-green-700">{sale.voucherCode}</p>
            </div>
          )}

          {/* Amounts */}
          <div className="border-t pt-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-800 font-medium">฿{sale.subtotal?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-800 font-medium">฿{sale.tax?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-3 mt-3">
                <span>Total</span>
                <span className="text-blue-600">฿{sale.total?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}