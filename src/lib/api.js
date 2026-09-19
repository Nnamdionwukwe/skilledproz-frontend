// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // ✅ NO global Content-Type — Axios auto-detects per request:
  //    - Plain objects   → application/json
  //    - FormData        → multipart/form-data; boundary=...
  //    - URLSearchParams → application/x-www-form-urlencoded
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Don't retry refresh endpoint itself — prevents infinite loop
    if (original.url?.includes("/auth/refresh")) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      const wasLoggedIn = !!localStorage.getItem("refreshToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      if (wasLoggedIn) window.location.href = "/login";
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error); // just reject silently — no redirect
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/refresh`,
          { refreshToken },
        );
        const newToken = data.data.accessToken;
        const newRefresh = data.data.refreshToken;
        localStorage.setItem("accessToken", newToken);
        localStorage.setItem("refreshToken", newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const hadToken = !!localStorage.getItem("refreshToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        if (hadToken) window.location.href = "/login"; // only redirect if they were logged in
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Google OAuth helpers ─────────────────────────────────────────────────────
export const googleAuth = {
  /**
   * Get the Google consent URL from the backend.
   * Returns: { url: "https://accounts.google.com/..." }
   */
  getAuthUrl: () => api.get("/auth/google/url"),

  /**
   * Sign in with a Google ID token from @react-oauth/google popup flow).
   * Returns: { accessToken, refreshToken, user, isNewUser }
   */
  signInWithToken: (idToken) => api.post("/auth/google", { idToken }),
};

export default api;
