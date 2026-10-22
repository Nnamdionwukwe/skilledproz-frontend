// src/lib/supportApi.js
import api from "./api";
import { io } from "socket.io-client";

// ── Resolve API URL the same way axios does ────────────────────────────────
const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Parse it — URL() handles both absolute and any scheme
const parsed = new URL(RAW_API_URL, window.location.origin);
// Strip the /api suffix from the path so the socket connects to the server root
parsed.pathname = parsed.pathname.replace(/\/api\/?$/, "") || "/";

export const SOCKET_URL = `${parsed.protocol}//${parsed.host}`;

// ── REST Endpoints ────────────────────────────────────────────────────────────
export const supportApi = {
  // Tickets
  createTicket: (formData) =>
    api.post("/support/tickets", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getMyTickets: (params) => api.get("/support/tickets", { params }),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  replyToTicket: (id, formData) =>
    api.post(`/support/tickets/${id}/reply`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  closeTicket: (id) => api.post(`/support/tickets/${id}/close`),
  reopenTicket: (id) => api.post(`/support/tickets/${id}/reopen`),
  submitTicketCsat: (id, data) => api.post(`/support/tickets/${id}/csat`, data),

  // Live Chat (User)
  startChat: (data) => api.post("/support/chat/start", data),
  getMyChats: (params) => api.get("/support/chat/my", { params }),
  getChat: (id) => api.get(`/support/chat/${id}`),
  escalateChat: (id, data) => api.post(`/support/chat/${id}/escalate`, data),
  submitChatCsat: (id, data) => api.post(`/support/chat/${id}/csat`, data),
  uploadChatAttachments: (formData) =>
    api.post("/support/chat/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Admin Endpoints
  adminListTickets: (params) => api.get("/support/admin/tickets", { params }),
  adminTicketStats: () => api.get("/support/admin/tickets/stats"),
  adminGetTicket: (id) => api.get(`/support/admin/tickets/${id}`),
  adminReplyToTicket: (id, formData) =>
    api.post(`/support/admin/tickets/${id}/reply`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  adminUpdateStatus: (id, data) =>
    api.patch(`/support/admin/tickets/${id}/status`, data),
  adminListChats: (params) => api.get("/support/admin/chats", { params }),

  // ADDED MISSING ADMIN CHAT ENDPOINT
  adminGetChat: (id) => api.get(`/support/admin/chats/${id}`),
};

// ── Socket Connection ─────────────────────────────────────────────────────────
export const createSupportSocket = (token) => {
  return io(`${SOCKET_URL}/support`, {
    auth: { token },
    transports: ["websocket"],
  });
};
