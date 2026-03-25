const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("sp_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
};

// ── Worker Dashboard ──────────────────────────────────────────────
export const workerAPI = {
  getDashboard: () => request("/workers/dashboard"),
  getNotifications: (page = 1) => request(`/workers/dashboard/notifications?page=${page}`),
  markAllNotificationsRead: () => request("/workers/dashboard/notifications/read-all", { method: "PATCH" }),
  getEarnings: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/workers/dashboard/earnings${q ? `?${q}` : ""}`);
  },
  getReviews: (page = 1) => request(`/workers/dashboard/reviews?page=${page}`),

  // Profile management
  updateProfile: (body) => request("/workers/profile", { method: "PUT", body: JSON.stringify(body) }),
  getProfile: (userId) => request(`/workers/${userId}`),

  // Portfolio
  addPortfolio: (formData) => {
    const token = getToken();
    return fetch(`${BASE_URL}/workers/portfolio`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json());
  },
  deletePortfolio: (id) => request(`/workers/portfolio/${id}`, { method: "DELETE" }),

  // Certifications
  addCertification: (formData) => {
    const token = getToken();
    return fetch(`${BASE_URL}/workers/certifications`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json());
  },

  // Availability
  updateAvailability: (body) => request("/workers/availability", { method: "PUT", body: JSON.stringify(body) }),

  // Categories
  addCategory: (body) => request("/workers/categories", { method: "POST", body: JSON.stringify(body) }),

  // Search (public)
  search: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/workers/search${q ? `?${q}` : ""}`);
  },
};