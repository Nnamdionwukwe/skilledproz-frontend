import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import styles from "./AdminUsers.module.css";

// ─── Icons (react-icons — same family as AdminLayout) ─────────────────────────
import {
  FiSearch,
  FiCheck,
  FiX,
  FiClock,
  FiAlertTriangle,
  FiTrash2,
  FiUser,
  FiUsers,
  FiChevronUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiShield,
  FiShieldOff,
  FiEye,
  FiEdit2,
  FiExternalLink,
  FiPlay,
  FiXCircle,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmt(n, currency = "") {
  if (!n && n !== 0) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

// ─── Small Atoms ─────────────────────────────────────────────────────────────

function Avatar({ user, size = 28 }) {
  return (
    <div className={styles.avatar} style={{ width: size, height: size }}>
      {user.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
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

function VerifBadge({ status }) {
  if (!status) return <span className={styles.verifNone}>—</span>;
  const map = {
    VERIFIED: {
      cls: styles.verifVerified,
      icon: <FiCheck size={10} />,
      label: "Verified",
    },
    PENDING: {
      cls: styles.verifPending,
      icon: <FiClock size={10} />,
      label: "Pending",
    },
    REJECTED: {
      cls: styles.verifRejected,
      icon: <FiX size={10} />,
      label: "Rejected",
    },
    UNVERIFIED: {
      cls: styles.verifUnverified,
      icon: null,
      label: "Unverified",
    },
  };
  const s = map[status] || map.UNVERIFIED;
  return (
    <span className={`${styles.verifBadge} ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function SubBadge({ tier, status }) {
  if (!tier || tier === "FREE")
    return <span className={styles.subFree}>Free</span>;
  const active = status === "ACTIVE";
  return (
    <span
      className={`${styles.subBadge} ${active ? styles.subActive : styles.subInactive}`}
    >
      {tier}
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

// ─── ADDED ── Full-screen Video Modal ─────────────────────────────────────────

function VideoModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div className={styles.videoModalBackdrop} onClick={onClose}>
      <button
        type="button"
        className={styles.videoModalClose}
        onClick={onClose}
        aria-label="Close video"
      >
        <FiXCircle size={28} />
      </button>
      <div
        className={styles.videoModalStage}
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className={styles.videoModalPlayer}
        />
      </div>
    </div>
  );
}

// ─── Expanded Detail Panel ────────────────────────────────────────────────────

function UserDetailPanel({ userId, onAction }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── ADDED ── full-screen video state
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/admin/users/${userId}`)
      .then((r) => setDetail(r.data.data?.user))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className={styles.detailPanel}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.detailSkeleton} />
        ))}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.detailPanel}>
        <p className={styles.detailError}>Failed to load user detail.</p>
      </div>
    );
  }

  const wp = detail.workerProfile;
  const hp = detail.hirerProfile;
  // ── FIXED ── backend sends `subscriptions` (array), not `subscription`
  const sub = detail.subscriptions?.[0];

  return (
    <div className={styles.detailPanel}>
      {/* ── ADDED ── full-screen video player */}
      <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />

      {/* ── Identity ── */}
      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Identity</p>
        <div className={styles.detailGrid}>
          <Field label="Email" value={detail.email} />
          <Field label="Phone" value={detail.phone || "—"} />
          <Field
            label="Country"
            value={
              [detail.city, detail.country].filter(Boolean).join(", ") || "—"
            }
          />
          <Field label="Joined" value={fmtDate(detail.createdAt)} />
          <Field label="Last Seen" value={timeAgo(detail.lastSeen)} />
          <Field
            label="Email Verified"
            value={detail.isEmailVerified ? "Yes" : "No"}
          />
          {/* ── ADDED ── richer identity fields backend sends */}
          <Field label="State" value={detail.state || "—"} />
          <Field label="Address" value={detail.address || "—"} />
          <Field label="Bio" value={detail.bio || "—"} />
          <Field label="Language" value={detail.language || "—"} />
          <Field
            label="Status"
            value={
              detail.isBanned
                ? "Banned"
                : detail.isActive
                  ? "Active"
                  : "Inactive"
            }
          />
          <Field
            label="Phone Verified"
            value={detail.isPhoneVerified ? "Yes" : "No"}
          />
          <Field
            label="2FA Enabled"
            value={detail.twoFactorEnabled ? "Yes" : "No"}
          />
          <Field label="Auth Provider" value={detail.authProvider || "EMAIL"} />
          <Field label="Referral Code" value={detail.referralCode || "—"} />
          <Field label="Updated" value={fmtDate(detail.updatedAt)} />
        </div>
      </div>

      {/* ── ADDED ── Wallets section */}
      {(detail.walletBalance != null ||
        detail.campaignWalletBalance != null) && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Wallets</p>
          <div className={styles.detailGrid}>
            <Field
              label="Referral Balance"
              value={fmt(detail.walletBalance, "₦")}
            />
            <Field
              label="Referral Lifetime"
              value={fmt(detail.walletLifetimeTotal, "₦")}
            />
            <Field
              label="Campaign Balance"
              value={fmt(detail.campaignWalletBalance, "₦")}
            />
            <Field
              label="Campaign Lifetime"
              value={fmt(detail.campaignWalletLifetimeTotal, "₦")}
            />
            <Field
              label="Withdrawal PIN Set"
              value={detail.withdrawalPinSet ? "Yes" : "No"}
            />
          </div>
        </div>
      )}

      {/* ── Worker Profile ── */}
      {wp && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Worker Profile</p>
          <div className={styles.detailGrid}>
            <Field
              label="Verification"
              value={<VerifBadge status={wp.verificationStatus} />}
            />
            <Field label="Title" value={wp.title || "—"} />
            <Field
              label="Rate"
              value={
                wp.hourlyRate
                  ? `${wp.currency || "₦"} ${fmt(wp.hourlyRate)}/hr`
                  : "—"
              }
            />
            <Field
              label="Categories"
              value={
                wp.categories?.map((c) => c.category?.name).join(", ") || "—"
              }
            />
            <Field
              label="Certifications"
              value={wp.certifications?.length ?? 0}
            />
            <Field label="Portfolio Items" value={wp.portfolio?.length ?? 0} />
            {/* ── ADDED ── more worker fields backend sends */}
            <Field label="Description" value={wp.description || "—"} />
            <Field
              label="Daily Rate"
              value={
                wp.dailyRate
                  ? `${wp.currency || "₦"} ${fmt(wp.dailyRate)}`
                  : "—"
              }
            />
            <Field
              label="Weekly Rate"
              value={
                wp.weeklyRate
                  ? `${wp.currency || "₦"} ${fmt(wp.weeklyRate)}`
                  : "—"
              }
            />
            <Field
              label="Monthly Rate"
              value={
                wp.monthlyRate
                  ? `${wp.currency || "₦"} ${fmt(wp.monthlyRate)}`
                  : "—"
              }
            />
            <Field
              label="Yearly Rate"
              value={
                wp.yearlyRate
                  ? `${wp.currency || "₦"} ${fmt(wp.yearlyRate)}`
                  : "—"
              }
            />
            <Field
              label="Custom Rate"
              value={
                wp.customRate
                  ? `${wp.currency || "₦"} ${fmt(wp.customRate)}`
                  : "—"
              }
            />
            <Field
              label="Custom Rate Label"
              value={wp.customRateLabel || "—"}
            />
            <Field label="Pricing Note" value={wp.pricingNote || "—"} />
            <Field label="Profile Currency" value={wp.profileCurrency || "—"} />
            <Field label="Years Experience" value={wp.yearsExperience ?? "—"} />
            <Field
              label="Service Radius (km)"
              value={wp.serviceRadius ?? "—"}
            />
            <Field label="Available" value={wp.isAvailable ? "Yes" : "No"} />
            <Field label="Total Earnings" value={fmt(wp.totalEarnings, "₦")} />
            <Field label="Completed Jobs" value={wp.completedJobs ?? 0} />
            <Field
              label="Response Rate"
              value={wp.responseRate ? `${wp.responseRate}%` : "—"}
            />
            <Field label="Avg Rating" value={wp.avgRating ?? "—"} />
            <Field label="Total Reviews" value={wp.totalReviews ?? 0} />
            <Field
              label="Background Check"
              value={wp.backgroundCheck ? "Passed" : "Not done"}
            />
            {/* ── ADDED ── video intro now opens full-screen player */}
            <Field
              label="Video Intro"
              value={
                wp.videoIntroUrl ? (
                  <button
                    type="button"
                    className={styles.videoWatchBtn}
                    onClick={() => setVideoUrl(wp.videoIntroUrl)}
                  >
                    <FiPlay size={11} /> Watch
                  </button>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="ID Document"
              value={
                wp.idDocument ? (
                  <a
                    href={wp.idDocument}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    View <FiExternalLink size={11} />
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="Availability Slots"
              value={wp.availability?.length ?? 0}
            />
          </div>
          <div className={styles.detailActions}>
            <button
              className={styles.actionGreen}
              onClick={() => onAction("verify", detail.id, "VERIFIED")}
            >
              <FiShield size={14} /> Verify Worker
            </button>
            <button
              className={styles.actionRed}
              onClick={() => onAction("verify", detail.id, "REJECTED")}
            >
              <FiShieldOff size={14} /> Reject Worker
            </button>
          </div>
        </div>
      )}

      {/* ── Hirer Profile ── */}
      {hp && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Hirer Profile</p>
          <div className={styles.detailGrid}>
            <Field label="Company" value={hp.companyName || "—"} />
            <Field label="Company Size" value={hp.companySize || "—"} />
            <Field label="Website" value={hp.website || "—"} />
            <Field label="Total Spent" value={fmt(hp.totalSpent, "₦")} />
            {/* ── ADDED ── more hirer fields backend sends */}
            <Field label="Avg Rating" value={hp.avgRating ?? "—"} />
            <Field label="Total Hires" value={hp.totalHires ?? 0} />
          </div>
        </div>
      )}

      {/* ── Activity ── */}
      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Activity</p>
        <div className={styles.detailGrid}>
          <Field
            label="Bookings as Hirer"
            value={detail._count?.bookingsAsHirer ?? 0}
          />
          <Field
            label="Bookings as Worker"
            value={detail._count?.bookingsAsWorker ?? 0}
          />
          <Field
            label="Reviews Received"
            value={detail._count?.reviewsReceived ?? 0}
          />
          <Field
            label="Reviews Given"
            value={detail._count?.reviewsGiven ?? 0}
          />
          <Field
            label="Notifications"
            value={detail._count?.notifications ?? 0}
          />
          {sub && (
            <Field
              label="Subscription"
              value={<SubBadge tier={sub.tier} status={sub.status} />}
            />
          )}
          {/* ── ADDED ── subscription details */}
          {sub && (
            <>
              <Field
                label="Sub Price"
                value={sub.price ? fmt(sub.price, "₦") : "Free"}
              />
              <Field label="Sub Started" value={fmtDate(sub.startedAt)} />
              <Field label="Sub Expires" value={fmtDate(sub.expiresAt)} />
              <Field label="Auto Renew" value={sub.autoRenew ? "Yes" : "No"} />
            </>
          )}
        </div>
      </div>

      {/* ── ADDED ── Reviews section */}
      {(detail.reviewsReceived?.length > 0 ||
        detail.reviewsGiven?.length > 0) && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Reviews</p>
          {detail.reviewsReceived?.length > 0 && (
            <>
              <p className={styles.detailSectionTitle} style={{ opacity: 0.7 }}>
                Received ({detail.reviewsReceived.length})
              </p>
              <div className={styles.miniBookings}>
                {detail.reviewsReceived.slice(0, 5).map((r) => (
                  <div key={r.id} className={styles.miniBookingRow}>
                    <span className={styles.mbTitle}>
                      {r.rating}★ —{" "}
                      {r.giver
                        ? `${r.giver.firstName} ${r.giver.lastName}`
                        : "Unknown"}
                    </span>
                    <span className={styles.mbCat}>{r.comment || "—"}</span>
                    <span className={styles.mbAmt}>{fmtDate(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {detail.reviewsGiven?.length > 0 && (
            <>
              <p className={styles.detailSectionTitle} style={{ opacity: 0.7 }}>
                Given ({detail.reviewsGiven.length})
              </p>
              <div className={styles.miniBookings}>
                {detail.reviewsGiven.map((r) => (
                  <div key={r.id} className={styles.miniBookingRow}>
                    <span className={styles.mbTitle}>
                      {r.rating}★ →{" "}
                      {r.receiver
                        ? `${r.receiver.firstName} ${r.receiver.lastName}`
                        : "Unknown"}
                    </span>
                    <span className={styles.mbCat}>{r.comment || "—"}</span>
                    <span className={styles.mbAmt}>{fmtDate(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Recent Bookings ── */}
      {detail.bookingsAsHirer?.length > 0 ||
      detail.bookingsAsWorker?.length > 0 ? (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Recent Bookings</p>
          <div className={styles.miniBookings}>
            {[
              ...(detail.bookingsAsHirer || []),
              ...(detail.bookingsAsWorker || []),
            ]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)
              .map((b) => (
                <div key={b.id} className={styles.miniBookingRow}>
                  <span className={styles.mbTitle}>{b.title || "—"}</span>
                  <span className={styles.mbCat}>{b.category?.name}</span>
                  <span
                    className={`${styles.mbStatus} ${styles[`mbStatus_${b.status}`]}`}
                  >
                    {b.status}
                  </span>
                  {/* ── FIXED + ADDED ── backend sends `payments` array + more scalars */}
                  <span className={styles.mbAmt}>
                    {fmt(
                      b.payments?.[0]?.amount ?? b.agreedRate,
                      b.currency || "₦",
                    )}
                  </span>
                  <span
                    className={styles.mbAmt}
                    style={{ opacity: 0.7, fontSize: "0.65rem" }}
                  >
                    {b.scheduledAt ? fmtDate(b.scheduledAt) : ""}
                    {b.payments?.[0]?.status
                      ? ` · ${b.payments[0].status}`
                      : ""}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {/* ── ADDED ── Notifications section */}
      {detail.notifications?.length > 0 && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>
            Recent Notifications ({detail.notifications.length})
          </p>
          <div className={styles.miniBookings}>
            {detail.notifications.slice(0, 5).map((n) => (
              <div key={n.id} className={styles.miniBookingRow}>
                <span className={styles.mbTitle}>{n.title || "—"}</span>
                <span className={styles.mbCat}>{n.type || "—"}</span>
                <span className={styles.mbAmt}>{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Danger Zone ── */}
      <div className={`${styles.detailSection} ${styles.dangerSection}`}>
        <p className={styles.detailSectionTitle}>Danger Zone</p>
        <div className={styles.detailActions}>
          <button
            className={styles.actionRed}
            onClick={() => onAction("delete", detail.id)}
          >
            <FiTrash2 size={14} /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}

// ─── Role Change Modal ────────────────────────────────────────────────────────

function RoleModal({ user, onConfirm, onClose }) {
  const [role, setRole] = useState(user.role);
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.modalTitle}>
          <FiEdit2
            size={16}
            style={{ marginRight: 6, verticalAlign: "-2px" }}
          />
          Change Role
        </p>
        <p className={styles.modalSub}>
          {user.firstName} {user.lastName} · current:{" "}
          <strong>{user.role}</strong>
        </p>
        <div className={styles.roleOptions}>
          {["WORKER", "HIRER", "ADMIN"].map((r) => (
            <button
              key={r}
              className={`${styles.roleOption} ${role === r ? styles.roleOptionActive : ""}`}
              onClick={() => setRole(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.modalConfirm}
            onClick={() => onConfirm(user.id, role)}
            disabled={role === user.role}
          >
            <FiCheck size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ user, onConfirm, onClose }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.modalTitle} style={{ color: "var(--red)" }}>
          <FiAlertTriangle
            size={16}
            style={{ marginRight: 6, verticalAlign: "-2px" }}
          />
          Delete Account
        </p>
        <p className={styles.modalSub}>
          This will soft-delete and anonymise{" "}
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          . This cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.modalDelete}
            onClick={() => onConfirm(user.id)}
          >
            <FiTrash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null); // userId being acted on
  const [selected, setSelected] = useState(null); // expanded user object
  const [roleModal, setRoleModal] = useState(null); // user object for role change
  const [deleteModal, setDeleteModal] = useState(null); // user object for delete

  // ── Toast (in-page)
  const [toast, setToast] = useState(null);

  // ── Alerts modal state (kept alongside toast)
  const [alertState, setAlertState] = useState({ open: false, alerts: [] });

  const role = searchParams.get("role") || "";
  const statusFilter = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (role) params.role = role;
    if (search) params.search = search;
    if (statusFilter === "banned") params.isBanned = "true";
    if (statusFilter === "active") params.isActive = "true";
    if (statusFilter === "unverified") params.isEmailVerified = "false";

    api
      .get("/admin/users", { params })
      .then((r) => {
        const d = r.data.data;
        setUsers(d.users || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [role, statusFilter, search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Param helpers ─────────────────────────────────────────────────────────

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    p.set("page", "1");
    setSearchParams(p);
  }

  // ── Toast helper
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── showAlert helper (used by modal path if needed later)
  function showAlert(msg, variant = "green") {
    setAlertState({
      open: true,
      alerts: [
        {
          icon:
            variant === "red"
              ? FiAlertTriangle
              : variant === "amber"
                ? FiAlertTriangle
                : FiCheck,
          variant,
          label: msg,
          description: "",
          to: null,
        },
      ],
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleBan(userId, isBanned) {
    setActing(userId);
    try {
      if (isBanned) {
        await api.patch(`/admin/users/${userId}/unban`);
        showToast("User unbanned successfully", "success");
      } else {
        await api.patch(`/admin/users/${userId}/ban`, {
          reason: "Violated platform rules",
        });
        showToast("User banned", "warn");
      }
      fetchUsers();
    } catch {
      showToast("Action failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleVerify(userId, status) {
    setActing(userId);
    try {
      await api.patch(`/admin/users/${userId}/verify`, { status });
      showToast(
        status === "VERIFIED" ? "Worker verified" : "Worker rejected",
        status === "VERIFIED" ? "success" : "warn",
      );
      fetchUsers();
      // Refresh expanded panel if open
      if (selected?.id === userId)
        setSelected((u) => ({ ...u, _refresh: Date.now() }));
    } catch {
      showToast("Verification failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleRoleChange(userId, newRole) {
    setRoleModal(null);
    setActing(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      showToast(`Role updated to ${newRole}`, "success");
      fetchUsers();
    } catch {
      showToast("Role change failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleDelete(userId) {
    setDeleteModal(null);
    setActing(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      showToast("Account deleted", "warn");
      if (selected?.id === userId) setSelected(null);
      fetchUsers();
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setActing(null);
    }
  }

  // Panel action dispatcher (called from UserDetailPanel)
  function handlePanelAction(type, userId, extra) {
    if (type === "verify") handleVerify(userId, extra);
    if (type === "delete")
      setDeleteModal(
        users.find((u) => u.id === userId) || {
          id: userId,
          firstName: "This",
          lastName: "User",
        },
      );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Toast (in-page) */}
        {toast && (
          <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
            {toast.msg}
          </div>
        )}

        {/* ── AlertModal kept available */}
        <AlertModal
          isOpen={alertState.open}
          onClose={() => setAlertState({ open: false, alerts: [] })}
          title="Notice"
          subtitle=""
          alerts={alertState.alerts}
        />

        {/* ── Filter Bar ── */}
        <div className={styles.filterBar}>
          {/* ── search icon wrapper replaces 🔍 emoji */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <FiSearch size={14} />
            </span>
            <input
              className={styles.searchInput}
              placeholder="Search name, email or phone..."
              value={search}
              onChange={(e) => setParam("search", e.target.value)}
            />
          </div>
          <div className={styles.tabGroup}>
            {["", "WORKER", "HIRER", "ADMIN"].map((r) => (
              <button
                key={r}
                className={`${styles.tab} ${role === r ? styles.tabActive : ""}`}
                onClick={() => setParam("role", r)}
              >
                {r || "All"}
              </button>
            ))}
          </div>
          <div className={styles.tabGroup}>
            {/* ── status tab dots replace 🟢🔴⚪ emoji */}
            {[
              { key: "", label: "Any status", dot: null },
              { key: "active", label: "Active", dot: "active" },
              { key: "banned", label: "Banned", dot: "banned" },
              {
                key: "unverified",
                label: "Unverified email",
                dot: "unverified",
              },
            ].map((s) => (
              <button
                key={s.key}
                className={`${styles.tab} ${statusFilter === s.key ? styles.tabActive : ""}`}
                onClick={() => setParam("status", s.key)}
              >
                {s.dot && (
                  <span
                    className={`${styles.tabStatusDot} ${styles[`tabStatusDot_${s.dot}`]}`}
                  />
                )}
                {s.label}
              </button>
            ))}
          </div>
          <div className={styles.totalPill}>{fmt(total)} users</div>
        </div>

        {/* ── Table ── */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>User</span>
            <span>Role</span>
            <span>Subscription</span>
            <span>Bookings</span>
            <span>Verification</span>
            <span>Last Seen</span>
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
                <FiUsers size={28} />
                <p>No users found</p>
              </div>
            ) : (
              users.map((u, i) => (
                <div
                  key={u.id}
                  className={styles.rowWrap}
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <div
                    className={`${styles.row} ${u.isBanned ? styles.rowBanned : ""}`}
                  >
                    {/* User */}
                    <div className={styles.userCell}>
                      <StatusDot active={u.isActive} banned={u.isBanned} />
                      <Avatar user={u} />
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>
                          {u.firstName} {u.lastName}
                        </span>
                        <span className={styles.userEmail}>
                          {u.email}
                          {/* ── email verified indicator (icon) */}
                          {u.isEmailVerified ? (
                            <FiCheck
                              size={10}
                              style={{ marginLeft: 4, verticalAlign: "-1px" }}
                            />
                          ) : (
                            <FiX
                              size={10}
                              style={{ marginLeft: 4, verticalAlign: "-1px" }}
                            />
                          )}
                        </span>
                        {/* ── phone (backend sends) */}
                        {u.phone && (
                          <span
                            className={styles.userEmail}
                            style={{ opacity: 0.85 }}
                          >
                            {u.phone}
                          </span>
                        )}
                        {/* ── location (backend sends both) */}
                        {(u.city || u.country) && (
                          <span
                            className={styles.userEmail}
                            style={{ opacity: 0.7 }}
                          >
                            {[u.city, u.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <RolePill role={u.role} />
                    </div>

                    {/* Subscription */}
                    <div>
                      {/* ── FIXED ── backend sends `subscriptions` (array), not `subscription` */}
                      <SubBadge
                        tier={u.subscriptions?.[0]?.tier}
                        status={u.subscriptions?.[0]?.status}
                      />
                    </div>

                    {/* Bookings */}
                    <span className={styles.cell}>
                      {(u._count?.bookingsAsHirer || 0) +
                        (u._count?.bookingsAsWorker || 0)}
                    </span>

                    {/* Verification */}
                    <div>
                      {u.role === "WORKER" ? (
                        <>
                          <VerifBadge
                            status={u.workerProfile?.verificationStatus}
                          />
                          {/* ── worker hourly rate + currency */}
                          {u.workerProfile?.hourlyRate > 0 && (
                            <span
                              className={styles.cell}
                              style={{
                                display: "block",
                                fontSize: "0.7rem",
                                opacity: 0.75,
                                marginTop: 2,
                              }}
                            >
                              {u.workerProfile.currency || "₦"}{" "}
                              {fmt(u.workerProfile.hourlyRate)}/hr
                            </span>
                          )}
                        </>
                      ) : (
                        <span className={styles.verifNone}>—</span>
                      )}
                    </div>

                    {/* Last seen */}
                    <span className={styles.cell}>{timeAgo(u.lastSeen)}</span>

                    {/* Actions */}
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionBtn} ${u.isBanned ? styles.actionUnban : styles.actionBan}`}
                        onClick={() => handleBan(u.id, u.isBanned)}
                        disabled={acting === u.id || u.role === "ADMIN"}
                        title={u.isBanned ? "Unban" : "Ban"}
                      >
                        {acting === u.id ? "…" : u.isBanned ? "Unban" : "Ban"}
                      </button>

                      <button
                        className={styles.actionRole}
                        onClick={() => setRoleModal(u)}
                        disabled={acting === u.id}
                        title="Change role"
                      >
                        Role
                      </button>

                      <button
                        className={styles.viewBtn}
                        onClick={() =>
                          setSelected(selected?.id === u.id ? null : u)
                        }
                        title="View full detail"
                      >
                        {selected?.id === u.id ? (
                          <FiChevronUp size={12} />
                        ) : (
                          <FiChevronDown size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded Detail ── */}
                  {selected?.id === u.id && (
                    <UserDetailPanel
                      key={`${u.id}-${u._refresh ?? 0}`}
                      userId={u.id}
                      onAction={handlePanelAction}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              <FiChevronLeft size={14} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next <FiChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── Modals ── */}
        {roleModal && (
          <RoleModal
            user={roleModal}
            onConfirm={handleRoleChange}
            onClose={() => setRoleModal(null)}
          />
        )}
        {deleteModal && (
          <DeleteModal
            user={deleteModal}
            onConfirm={handleDelete}
            onClose={() => setDeleteModal(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
