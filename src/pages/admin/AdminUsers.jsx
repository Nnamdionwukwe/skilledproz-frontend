import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminUsers.module.css";

function timeAgo(d) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ user }) {
  return (
    <div className={styles.avatar}>
      {user.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        `${user.firstName?.[0]}${user.lastName?.[0]}`.toUpperCase()
      )}
    </div>
  );
}

function RolePill({ role }) {
  return (
    <span
      className={`${styles.rolePill} ${styles[`role_${role?.toLowerCase()}`]}`}
    >
      {role}
    </span>
  );
}

function StatusDot({ active, banned }) {
  if (banned)
    return (
      <span className={`${styles.statusDot} ${styles.banned}`} title="Banned" />
    );
  if (active)
    return (
      <span className={`${styles.statusDot} ${styles.active}`} title="Active" />
    );
  return (
    <span
      className={`${styles.statusDot} ${styles.inactive}`}
      title="Inactive"
    />
  );
}

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [selected, setSelected] = useState(null);

  const role = searchParams.get("role") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (role) params.role = role;
    if (search) params.search = search;
    api
      .get("/admin/users", { params })
      .then((r) => {
        const d = r.data.data;
        setUsers(d.users || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .finally(() => setLoading(false));
  }, [role, search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    p.set("page", "1");
    setSearchParams(p);
  }

  async function handleBan(userId, isBanned) {
    setActing(userId);
    try {
      if (isBanned) await api.patch(`/admin/users/${userId}/unban`);
      else
        await api.patch(`/admin/users/${userId}/ban`, {
          reason: "Violated platform rules",
        });
      fetchUsers();
    } finally {
      setActing(null);
    }
  }

  async function handleVerify(userId, status) {
    setActing(userId);
    try {
      await api.patch(`/admin/users/${userId}/verify`, { status });
      fetchUsers();
    } finally {
      setActing(null);
    }
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* Filters */}
        <div className={styles.filterBar}>
          <input
            className={styles.searchInput}
            placeholder="🔍 Search by name or email..."
            value={search}
            onChange={(e) => setParam("search", e.target.value)}
          />
          <div className={styles.roleTabs}>
            {["", "WORKER", "HIRER", "ADMIN"].map((r) => (
              <button
                key={r}
                className={`${styles.roleTab} ${role === r ? styles.roleTabActive : ""}`}
                onClick={() => setParam("role", r)}
              >
                {r || "All"}
              </button>
            ))}
          </div>
          <div className={styles.totalPill}>{total} users</div>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>User</span>
            <span>Role</span>
            <span>Location</span>
            <span>Bookings</span>
            <span>Last seen</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div className={styles.tableBody}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.skRow}
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))
            ) : users.length === 0 ? (
              <div className={styles.empty}>
                <span>👥</span>
                <p>No users found</p>
              </div>
            ) : (
              users.map((u, i) => (
                <div
                  key={u.id}
                  className={`${styles.row} ${u.isBanned ? styles.rowBanned : ""}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* User */}
                  <div className={styles.userCell}>
                    <StatusDot active={u.isActive} banned={u.isBanned} />
                    <Avatar user={u} />
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>
                        {u.firstName} {u.lastName}
                      </span>
                      <span className={styles.userEmail}>{u.email}</span>
                    </div>
                  </div>

                  {/* Role */}
                  <RolePill role={u.role} />

                  {/* Location */}
                  <span className={styles.cell}>
                    {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                  </span>

                  {/* Bookings */}
                  <span className={styles.cell}>
                    {(u._count?.bookingsAsHirer || 0) +
                      (u._count?.bookingsAsWorker || 0)}
                  </span>

                  {/* Last seen */}
                  <span className={styles.cell}>{timeAgo(u.lastSeen)}</span>

                  {/* Status */}
                  <span className={styles.cell}>
                    {u.isBanned ? (
                      <span
                        className={styles.statusBadge}
                        style={{ color: "var(--red)" }}
                      >
                        Banned
                      </span>
                    ) : u.isEmailVerified ? (
                      <span
                        className={styles.statusBadge}
                        style={{ color: "var(--green)" }}
                      >
                        Verified
                      </span>
                    ) : (
                      <span
                        className={styles.statusBadge}
                        style={{ color: "var(--text-muted)" }}
                      >
                        Unverified
                      </span>
                    )}
                  </span>

                  {/* Actions */}
                  <div className={styles.actions}>
                    <button
                      className={`${styles.actionBtn} ${u.isBanned ? styles.actionUnban : styles.actionBan}`}
                      onClick={() => handleBan(u.id, u.isBanned)}
                      disabled={acting === u.id || u.role === "ADMIN"}
                      title={u.isBanned ? "Unban user" : "Ban user"}
                    >
                      {acting === u.id ? "…" : u.isBanned ? "Unban" : "Ban"}
                    </button>
                    {u.role === "WORKER" && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleVerify(u.id, "VERIFIED")}
                        disabled={acting === u.id}
                        title="Verify worker"
                      >
                        ✓ Verify
                      </button>
                    )}
                    <button
                      className={styles.viewBtn}
                      onClick={() =>
                        setSelected(selected?.id === u.id ? null : u)
                      }
                      title="View details"
                    >
                      {selected?.id === u.id ? "▲" : "▼"}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {selected?.id === u.id && (
                    <div className={styles.expandedRow}>
                      <div className={styles.expandedGrid}>
                        <div>
                          <span className={styles.expandLabel}>
                            Email verified
                          </span>
                          <span>{u.isEmailVerified ? "✅ Yes" : "❌ No"}</span>
                        </div>
                        <div>
                          <span className={styles.expandLabel}>
                            Phone verified
                          </span>
                          <span>{u.isPhoneVerified ? "✅ Yes" : "❌ No"}</span>
                        </div>
                        <div>
                          <span className={styles.expandLabel}>Joined</span>
                          <span>
                            {new Date(u.createdAt).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <div>
                          <span className={styles.expandLabel}>
                            Bookings as hirer
                          </span>
                          <span>{u._count?.bookingsAsHirer || 0}</span>
                        </div>
                        <div>
                          <span className={styles.expandLabel}>
                            Bookings as worker
                          </span>
                          <span>{u._count?.bookingsAsWorker || 0}</span>
                        </div>
                      </div>
                      {u.role === "WORKER" && (
                        <div className={styles.expandActions}>
                          <button
                            className={styles.actionGreen}
                            onClick={() => handleVerify(u.id, "VERIFIED")}
                          >
                            ✅ Verify
                          </button>
                          <button
                            className={styles.actionRed}
                            onClick={() => handleVerify(u.id, "REJECTED")}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
