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

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        set({ user, accessToken, refreshToken });
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
    }),
    {
      name: "skilledproz-auth",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
    },
  ),
);
