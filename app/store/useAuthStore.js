"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      // -----------------------------
      // SET USER
      // -----------------------------
      setUser: (user) => {
        if (!user) {
          set({ user: null, error: null });
          return;
        }

        const safeUser = {
          ...user,
          points: user?.points ?? 0,
          id: user?.id,
          email: user?.email,
          name: user?.name,
          role: user?.role || "user",
        };
        set({ user: safeUser, error: null });
      },

      // -----------------------------
      // UPDATE USER (partial update)
      // -----------------------------
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      // -----------------------------
      // UPDATE POINTS ONLY
      // -----------------------------
      updatePoints: (newPoints) =>
        set((state) => ({
          user: state.user ? { ...state.user, points: newPoints } : null,
        })),

      // -----------------------------
      // CLEAR USER
      // -----------------------------
      clearUser: () => set({ user: null, error: null }),

      // -----------------------------
      // ERROR HANDLING
      // -----------------------------
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // -----------------------------
      // AUTH HELPERS
      // -----------------------------
      isAuthenticated: () => get().user !== null,
      isAdmin: () => get().user?.role === "admin",
      getUserId: () => get().user?.id,
      getUser: () => get().user,

      // -----------------------------
      // LOADING STATE
      // -----------------------------
      setLoading: (isLoading) => set({ isLoading }),

      // -----------------------------
      // FETCH USER from /api/auth/me
      // -----------------------------
      fetchUser: async () => {
        try {
          set({ isLoading: true, error: null });

          console.log('🔄 Fetching user from /api/auth/me');

          const res = await fetch("/api/auth/me", {
            credentials: "include",
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('📥 /me response status:', res.status);

          // If 401 or user is null, clear session
          if (res.status === 401) {
            console.log('❌ Not authenticated');
            set({ user: null, isLoading: false, error: null });
            return null;
          }

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to fetch user");
          }

          const data = await res.json();
          
          console.log('📥 Received data:', data);

          // Handle null user (not authenticated)
          if (!data.user) {
            console.log('ℹ️ No user in response');
            set({ user: null, isLoading: false, error: null });
            return null;
          }

          // Validate user data
          if (!data.user.id || !data.user.email) {
            throw new Error("Invalid user data received");
          }

          const safeUser = {
            id: data.user.id,
            name: data.user.name || 'Unknown',
            email: data.user.email,
            role: data.user.role || "user",
            points: data.user.points ?? 0,
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          };

          console.log('✅ User data updated:', {
            id: safeUser.id,
            email: safeUser.email,
            points: safeUser.points
          });

          set({ user: safeUser, isLoading: false, error: null });
          return safeUser;

        } catch (error) {
          console.error("❌ Fetch user failed:", error);
          const errorMessage = error.message || "Failed to fetch user";
          set({ user: null, isLoading: false, error: errorMessage });
          return null;
        }
      },

      // -----------------------------
      // LOGIN
      // -----------------------------
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          console.log('🔐 Login attempt:', credentials.email);

          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
            credentials: "include",
          });

          const data = await res.json();
          
          console.log('📥 Login response:', { 
            status: res.status, 
            success: data.success,
            hasUser: !!data.user
          });

          if (!res.ok) {
            throw new Error(data.error || "Login failed");
          }

          // Validate response
          if (!data.user || !data.user.id) {
            throw new Error("Invalid user data received from server");
          }

          const safeUser = {
            id: data.user.id,
            name: data.user.name || 'Unknown',
            email: data.user.email,
            role: data.user.role || "user",
            points: data.user.points ?? 0,
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          };

          console.log('✅ Login successful:', {
            id: safeUser.id,
            email: safeUser.email,
            points: safeUser.points
          });

          set({ user: safeUser, isLoading: false, error: null });
          
          return { success: true, user: safeUser };

        } catch (error) {
          console.error("❌ Login failed:", error);
          const errorMessage = error.message || "Login failed";
          set({ user: null, isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // -----------------------------
      // LOGOUT
      // -----------------------------
      logout: async () => {
        try {
          set({ isLoading: true, error: null });
          console.log('👋 Logging out');

          // Try to call logout endpoint
          try {
            await fetch("/api/auth/logout", {
              method: "POST",
              credentials: "include",
            });
          } catch (err) {
            console.log('Logout endpoint error (ignored):', err.message);
          }

          // Clear user state
          set({ user: null, isLoading: false, error: null });

          // Redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }

          return { success: true };

        } catch (error) {
          console.error("Logout failed:", error);
          
          // Still clear user even if logout fails
          set({ user: null, isLoading: false, error: null });
          
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }

          return { success: false, error: error.message };
        }
      },

      // -----------------------------
      // REFRESH USER (silent refetch)
      // -----------------------------
      refreshUser: async () => {
        const currentUser = get().user;
        
        if (!currentUser) {
          console.log('ℹ️ No user to refresh');
          return null;
        }

        try {
          console.log('🔄 Refreshing user data');
          
          const res = await fetch("/api/auth/me", {
            credentials: "include",
          });

          if (!res.ok || res.status === 401) {
            console.log('Not authenticated, keeping current user');
            return currentUser;
          }

          const data = await res.json();
          
          if (!data.user || !data.user.id) {
            console.log('Invalid response, keeping current user');
            return currentUser;
          }

          const safeUser = {
            id: data.user.id,
            name: data.user.name || currentUser.name,
            email: data.user.email,
            role: data.user.role || "user",
            points: data.user.points ?? 0,
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          };

          console.log('✅ User refreshed, points:', safeUser.points);
          set({ user: safeUser });
          
          return safeUser;

        } catch (error) {
          console.error("Refresh user failed:", error);
          return currentUser; // Keep existing user on error
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;


// ============================================
// USAGE NOTES
// ============================================

/*
This store now works with the /api/auth/me endpoint we fixed.

Key changes:
1. fetchUser() uses /api/auth/me instead of /api/users/${id}
2. Properly handles { user: {...} } response format
3. Always includes points in safeUser object
4. Better error handling and logging

After updating:
1. Clear localStorage (F12 → Application → Local Storage → Delete "auth-storage")
2. Logout
3. Login again
4. Points should now display correctly!
*/