import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isHydrated: false, // ← added; flipped to true by onRehydrateStorage

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        set({ user, accessToken, refreshToken });
      },

      updateUser: (patch) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        }));
      },

      clearAuth: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ user: null, accessToken: null, refreshToken: null });
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get("/auth/me");
          set({ user: data.data });
        } catch {
          get().clearAuth();
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", { email, password });
          get().setAuth(
            data.data.user,
            data.data.accessToken,
            data.data.refreshToken,
          );
          return data.data.user;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {}
        get().clearAuth();
      },

      register: async (payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/register", payload);
          get().setAuth(
            data.data.user,
            data.data.accessToken,
            data.data.refreshToken,
          );
          return data.data.user;
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Google Sign-In ─────────────────────────────────────────────────────
      // Accepts either { idToken: "eyJ..." } (from <GoogleLogin>) or
      // { accessToken: "ya29..." } (from useGoogleLogin hook).
      googleSignIn: async (payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/google", payload);
          get().setAuth(
            data.data.user,
            data.data.accessToken,
            data.data.refreshToken,
          );
          return {
            user: data.data.user,
            isNewUser: data.data.isNewUser,
          };
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Google Callback (redirect flow — called from /auth/google/callback) ─
      handleGoogleCallback: async (accessToken, refreshToken) => {
        set({ isLoading: true });
        try {
          // Save tokens first so subsequent calls are authorized
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);

          // Fetch user profile with the new token
          const { data } = await api.get("/auth/me");

          set({
            user: data.data,
            accessToken,
            refreshToken,
          });

          return data.data;
        } catch (err) {
          // Clean up if anything failed
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          set({ user: null, accessToken: null, refreshToken: null });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "skilledproz-auth",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      // Fires after localStorage is read and state is restored.
      // This is the correct place to flip isHydrated.
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
