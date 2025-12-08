"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        // Load products
        const resProducts = await fetch("/api/products");
        const productsData = await resProducts.json();
        setProducts(productsData || []);
        setTotalProducts(productsData.length);

        // Load sales
        const resSales = await fetch("/api/sales");
        const salesData = await resSales.json();
        setSales(salesData || []);

        // ---- REAL TOTAL REVENUE ----
        const revenue = salesData.reduce((sum, s) => sum + (s.total || 0), 0);
        setTotalRevenue(revenue);

        // ---- MONTHLY GROUPING ----
        const monthlyMap = {};

        salesData.forEach((sale) => {
          const date = new Date(sale.createdAt || sale.date || Date.now());
          const month = date.toLocaleString("en-US", { month: "short" });

          monthlyMap[month] = (monthlyMap[month] || 0) + sale.total;
        });

        const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

        const monthlyArray = monthOrder.map((m) => ({
          month: m,
          revenue: monthlyMap[m] || 0,
        }));

        setChartData(monthlyArray);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-5 border rounded-xl shadow-sm bg-white">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-3xl font-bold">{totalProducts}</p>
        </div>

        <div className="p-5 border rounded-xl shadow-sm bg-white">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold">
            $ {totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="p-5 border rounded-xl shadow-sm bg-white">
          <p className="text-sm text-gray-500">Low Stock Items</p>
          <p className="text-3xl font-bold">
            {products.filter((p) => (p.stock || 0) < 5).length}
          </p>
        </div>
      </div>

      {/* Line Chart */}
      <div className="border rounded-xl shadow-sm bg-white p-6 mb-10">
        <h2 className="text-xl font-semibold mb-4">
          Monthly Revenue (Sales Data)
        </h2>

        <div className="w-full h-72">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
