"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import useAuthStore from "./useAuthStore";

// Helper to always convert IDs to numbers
const toNum = (val) => Number(val);

const useCartStore = create(
  persist(
    (set, get) => ({

      carts: [],

      // ⭐ REQUIRE LOGIN
      ensureLoggedIn: () => {
        const { user } = useAuthStore.getState();
        if (!user) {
          toast.error("Please login first!");
          return false;
        }
        return true;
      },

      // ⭐ ADD TO CART (with ID normalization)
      addCart: (item) => {
        if (!get().ensureLoggedIn()) return;

        const normalized = {
          id: Date.now(),                  // ⭐ generate unique cart id
          productId: toNum(item.productId),
          quantity: toNum(item.quantity || 1),
        };

        const { carts } = get();

        // Prevent duplicate product
        if (carts.some((c) => toNum(c.productId) === normalized.productId)) {
          toast.error("Item already in cart!");
          return;
        }

        set({ carts: [...carts, normalized] });
        toast.success("Item added to cart!");
      },

      // ⭐ UPDATE QUANTITY
      updateCartQuantity: (cartId, quantity) => {
        if (!get().ensureLoggedIn()) return;

        set((state) => ({
          carts: state.carts.map((cart) =>
            toNum(cart.id) === toNum(cartId)
              ? { ...cart, quantity: toNum(quantity) }
              : cart
          ),
        }));
      },

      // ⭐ INCREASE
      increaseQuantity: (cartId) => {
        if (!get().ensureLoggedIn()) return;

        set((state) => ({
          carts: state.carts.map((cart) =>
            toNum(cart.id) === toNum(cartId)
              ? { ...cart, quantity: cart.quantity + 1 }
              : cart
          ),
        }));
      },

      // ⭐ DECREASE
      decreaseQuantity: (cartId) => {
        if (!get().ensureLoggedIn()) return;

        const { carts } = get();
        const cart = carts.find((c) => toNum(c.id) === toNum(cartId));
        if (!cart) return;

        if (cart.quantity === 1) {
          set({ carts: carts.filter((c) => toNum(c.id) !== toNum(cartId)) });
          toast.success("Item removed from cart!");
        } else {
          set({
            carts: carts.map((c) =>
              toNum(c.id) === toNum(cartId)
                ? { ...c, quantity: c.quantity - 1 }
                : c
            ),
          });
        }
      },

      // ⭐ REMOVE
      removeCart: (cartId) => {
        if (!get().ensureLoggedIn()) return;

        set((state) => ({
          carts: state.carts.filter((cart) => toNum(cart.id) !== toNum(cartId)),
        }));
        toast.success("Item removed from cart!");
      },

      clearCart: () => {
        if (!get().ensureLoggedIn()) return;
        set({ carts: [] });
      },

      resetCart: () => set({ carts: [] }),

      // ⭐ TOTAL ITEMS
      getTotalItems: () => {
        return get().carts.reduce((t, c) => t + c.quantity, 0);
      },

      // ⭐ TOTAL PRICE (with safe numeric match)
      getTotalPrice: (products) => {
        return get().carts.reduce((total, cart) => {
          const product = products.find(
            (p) => toNum(p.id) === toNum(cart.productId)
          );
          return total + (product?.price || 0) * cart.quantity;
        }, 0);
      },

      isInCart: (productId) => {
        return get().carts.some(
          (cart) => toNum(cart.productId) === toNum(productId)
        );
      },

      getCartItem: (productId) => {
        return get().carts.find(
          (cart) => toNum(cart.productId) === toNum(productId)
        );
      },

      updateCart: (cartId, updates) => {
        if (!get().ensureLoggedIn()) return;

        set((state) => ({
          carts: state.carts.map((cart) =>
            toNum(cart.id) === toNum(cartId)
              ? { ...cart, ...updates }
              : cart
          ),
        }));
      },
    }),

    {
      name: "cart-storage",
      partialize: (state) => ({ carts: state.carts }),
    }
  )
);

export default useCartStore;
