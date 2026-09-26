// src/lib/analyticsApi.js
// ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper over the admin analytics endpoints.
// Every function returns the axios response, so callers do `.data.data`.

import api from "../api";

export const analyticsApi = {
  /** GET /admin/analytics/overview?days=30 */
  overview: (days = 30) => api.get(`/admin/analytics/overview?days=${days}`),

  /** GET /admin/analytics/users?segment=&minScore=&sortBy=&page=&limit= */
  listUsers: ({
    segment,
    minScore,
    sortBy = "engagementScore",
    page = 1,
    limit = 50,
  } = {}) => {
    const q = new URLSearchParams();
    if (segment) q.set("segment", segment);
    if (minScore != null) q.set("minScore", minScore);
    if (sortBy) q.set("sortBy", sortBy);
    q.set("page", page);
    q.set("limit", limit);
    return api.get(`/admin/analytics/users?${q.toString()}`);
  },

  /** GET /admin/analytics/user/:userId */
  userCoverage: (userId) => api.get(`/admin/analytics/user/${userId}`),

  /** GET /admin/analytics/live?minutes=15 */
  live: (minutes = 15) => api.get(`/admin/analytics/live?minutes=${minutes}`),

  /** GET /admin/analytics/funnel?name=signup_to_paid */
  funnel: (name = "signup_to_paid") =>
    api.get(`/admin/analytics/funnel?name=${name}`),

  /** GET /admin/analytics/segments */
  listSegments: () => api.get("/admin/analytics/segments"),

  /** POST /admin/analytics/segments */
  createSegment: (body) => api.post("/admin/analytics/segments", body),

  /** PATCH /admin/analytics/segments/:key */
  updateSegment: (key, body) =>
    api.patch(`/admin/analytics/segments/${key}`, body),

  /** DELETE /admin/analytics/segments/:key */
  deleteSegment: (key) => api.delete(`/admin/analytics/segments/${key}`),

  /** GET /admin/analytics/segments/:key/users */
  segmentUsers: (key, page = 1, limit = 50) =>
    api.get(
      `/admin/analytics/segments/${key}/users?page=${page}&limit=${limit}`,
    ),
};

export default analyticsApi;
