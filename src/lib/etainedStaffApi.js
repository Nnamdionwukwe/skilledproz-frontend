// src/lib/retainedStaffApi.js
import api from "./api";

export const retainedStaffApi = {
  // ── Hirer ──
  listStaff: (params) => api.get("/retained-staff", { params }),
  addStaff: (data) => api.post("/retained-staff", data),
  getStaff: (id) => api.get(`/retained-staff/${id}`),
  updateStaff: (id, data) => api.patch(`/retained-staff/${id}`, data),
  pauseStaff: (id, reason) =>
    api.patch(`/retained-staff/${id}/pause`, { reason }),
  resumeStaff: (id) => api.patch(`/retained-staff/${id}/resume`),
  endStaff: (id, data) => api.patch(`/retained-staff/${id}/end`, data),
  deleteStaff: (id) => api.delete(`/retained-staff/${id}`),
  getDashboard: () => api.get("/retained-staff/dashboard"),

  // ✅ ADD THIS LINE
  lookupWorker: (q) => api.get("/retained-staff/lookup", { params: { q } }),

  // ── Cycles (Hirer) ──
  listCycles: (memberId, params) =>
    api.get(`/retained-staff/${memberId}/cycles`, { params }),
  createCycle: (memberId, data) =>
    api.post(`/retained-staff/${memberId}/cycles`, data),
  getCycle: (memberId, cycleId) =>
    api.get(`/retained-staff/${memberId}/cycles/${cycleId}`),
  payCycle: (memberId, cycleId, data) =>
    api.post(`/retained-staff/${memberId}/cycles/${cycleId}/pay`, data),
  releaseCycle: (cycleId, data) =>
    api.post(`/retained-staff/cycles/${cycleId}/release`, data),
  cancelCycle: (cycleId, reason) =>
    api.post(`/retained-staff/cycles/${cycleId}/cancel`, { reason }),

  // ── Documents & Notes ──
  uploadDocument: (memberId, data) =>
    api.post(`/retained-staff/${memberId}/documents`, data),
  listDocuments: (memberId) => api.get(`/retained-staff/${memberId}/documents`),
  deleteDocument: (memberId, docId) =>
    api.delete(`/retained-staff/${memberId}/documents/${docId}`),

  addNote: (memberId, data) =>
    api.post(`/retained-staff/${memberId}/notes`, data),
  listNotes: (memberId) => api.get(`/retained-staff/${memberId}/notes`),
  deleteNote: (memberId, noteId) =>
    api.delete(`/retained-staff/${memberId}/notes/${noteId}`),

  // ── Worker ──
  listMyEmployers: () => api.get("/retained-staff/me/employers"),
  getMyEmployment: (id) => api.get(`/retained-staff/me/employers/${id}`),
  listMyCycles: (params) => api.get("/retained-staff/me/cycles", { params }),
  getMyEarnings: () => api.get("/retained-staff/me/earnings"),

  // ── Admin ──
  adminListStaff: (params) => api.get("/admin/retained-staff", { params }),
  adminListCycles: (params) => api.get("/admin/retained-cycles", { params }),
};
