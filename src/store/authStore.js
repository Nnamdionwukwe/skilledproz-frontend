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

      // ── Called by the axios interceptor when the server rejects the session.
      // Clears auth state in memory + localStorage, then redirects to /login
      // with a reason code so the login page can show the right banner.
      handleAuthError: (code, message) => {
        get().clearAuth();
        try {
          const params = new URLSearchParams();
          if (code) params.set("code", code);
          if (message) params.set("reason", message);
          const qs = params.toString();

          // Don't redirect if we're already on the login page (avoids loop)
          if (!window.location.pathname.startsWith("/login")) {
            window.location.replace(qs ? `/login?${qs}` : "/login");
          }
        } catch {
          // last-resort fallback
          window.location.replace("/login");
        }
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
      // Accepts either { idToken } or { accessToken }, optionally with a
      // `role` hint ("HIRER" | "WORKER") used only for NEW signups.
      //
      // Two outcomes:
      //   1. Existing user → tokens stored, user set, returns { user, isNewUser }
      //   2. New user without a role → backend returns needsRole:true.
      //      We do NOT store tokens or set a user; we return the pending
      //      profile so the caller can route to /register.
      //   3. New user with a role → tokens stored, user set, returns
      //      { user, isNewUser: true }.
      googleSignIn: async (payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/google", payload);
          const result = data.data;

          // ── New user, role not yet chosen ──────────────────────────────
          if (result.needsRole) {
            return {
              needsRole: true,
              googleProfile: result.googleProfile,
              isNewUser: true,
            };
          }

          // ── Sign-in or completed signup ────────────────────────────────
          get().setAuth(result.user, result.accessToken, result.refreshToken);
          return {
            needsRole: false,
            user: result.user,
            isNewUser: result.isNewUser,
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
