"use client";
import { create } from "zustand";

const useProductStore = create((set) => ({
  products: [],
  loading: false,

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const rawData = await res.json();
      console.log("Fetched data:", rawData);

      // ✅ FIX: Include ALL fields including stock!
      const formattedData = rawData.map((item) => ({
        id: item.id,
        title: item.title || item.name, // Support both field names
        name: item.name || item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        stock: parseInt(item.stock) || 0, // ⭐ CRITICAL: Include stock!
        category: item.category,
        image: item.image || item.imageUrl,
        
      }));

      console.log("📦 Formatted products with stock:", formattedData.map(p => ({
        id: p.id,
        name: p.title || p.name,
        stock: p.stock
      })));

      set({ products: formattedData });
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      set({ loading: false });
    }
  },
}));

export default useProductStore;