import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./Admin.module.css";

export default function AdminSettings() {
  const { user } = useAuthStore();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  async function testEmail() {
    setTesting(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/admin/broadcast", {
        title: "SkilledProz — System Test",
        body: "This is a test broadcast from the admin panel. If you see this, notifications are working.",
        role: "ADMIN",
      });
      setSuccess("Test broadcast sent to admins successfully.");
    } catch (e) {
      setError(e.response?.data?.message || "Test failed.");
    } finally {
      setTesting(false);
    }
  }

  const CONFIG_ITEMS = [
    {
      label: "Platform Commission",
      value: "15%",
      desc: "Applied on all completed bookings",
      icon: "💰",
    },
    {
      label: "Minimum Withdrawal",
      value: "NGN 500",
      desc: "Minimum worker payout request",
      icon: "💸",
    },
    {
      label: "Processing Fee",
      value: "1%",
      desc: "Applied on worker withdrawals",
      icon: "🏦",
    },
    {
      label: "Escrow Model",
      value: "Manual capture",
      desc: "Stripe: capture on job completion",
      icon: "🔒",
    },
    {
      label: "Paystack Region",
      value: "NGN, GHS, ZAR, KES",
      desc: "Currencies routed to Paystack",
      icon: "🌍",
    },
    {
      label: "Stripe Region",
      value: "USD, GBP, EUR + others",
      desc: "Currencies routed to Stripe",
      icon: "💳",
    },
  ];

  const LINKS = [
    {
      label: "Stripe Dashboard",
      url: "https://dashboard.stripe.com",
      icon: "💳",
    },
    {
      label: "Paystack Dashboard",
      url: "https://dashboard.paystack.com",
      icon: "🇳🇬",
    },
    { label: "Railway Console", url: "https://railway.app", icon: "🚂" },
    {
      label: "Cloudinary Media",
      url: "https://cloudinary.com/console",
      icon: "🖼️",
    },
    { label: "Prisma Studio", url: "http://localhost:5555", icon: "🗄️" },
    { label: "API Documentation", url: "http://localhost:5001", icon: "📡" },
  ];

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>System</p>
            <h1 className={styles.pageTitle}>Settings</h1>
          </div>
        </div>

        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        <div className={styles.settingsGrid}>
          {/* Admin profile */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Admin Account</h3>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.adminProfileCard}>
                <div className={styles.adminAvatarLg}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    <span>
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className={styles.adminNameLg}>
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className={styles.adminEmailLg}>{user?.email}</p>
                  <span className={styles.adminRoleBadge}>Super Admin</span>
                </div>
              </div>
              <Link to="/profile/me" className={styles.settingsLink}>
                Edit Profile →
              </Link>
            </div>
          </div>

          {/* Platform config (read-only display) */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Platform Configuration</h3>
              <span className={styles.readOnlyTag}>
                Read-only · Edit in .env
              </span>
            </div>
            <div className={styles.panelBody}>
              {CONFIG_ITEMS.map((item) => (
                <div key={item.label} className={styles.configRow}>
                  <span className={styles.configIcon}>{item.icon}</span>
                  <div className={styles.configInfo}>
                    <p className={styles.configLabel}>{item.label}</p>
                    <p className={styles.configDesc}>{item.desc}</p>
                  </div>
                  <span className={styles.configVal}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Quick Actions</h3>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.actionsList}>
                <button
                  className={styles.actionItem}
                  onClick={testEmail}
                  disabled={testing}
                >
                  <span className={styles.actionIcon}>📢</span>
                  <div>
                    <p className={styles.actionLabel}>
                      {testing ? "Sending..." : "Send Test Broadcast"}
                    </p>
                    <p className={styles.actionDesc}>
                      Sends a test notification to all admins
                    </p>
                  </div>
                  {testing ? (
                    <Spinner />
                  ) : (
                    <span className={styles.actionArrow}>→</span>
                  )}
                </button>
                <Link to="/admin/broadcast" className={styles.actionItem}>
                  <span className={styles.actionIcon}>📡</span>
                  <div>
                    <p className={styles.actionLabel}>Broadcast to Users</p>
                    <p className={styles.actionDesc}>
                      Send announcement to all users or by role
                    </p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>
                <Link to="/admin/disputes" className={styles.actionItem}>
                  <span className={styles.actionIcon}>⚖️</span>
                  <div>
                    <p className={styles.actionLabel}>Manage Disputes</p>
                    <p className={styles.actionDesc}>
                      Review and resolve open disputes
                    </p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>
                <Link to="/admin/verifications" className={styles.actionItem}>
                  <span className={styles.actionIcon}>🛡️</span>
                  <div>
                    <p className={styles.actionLabel}>Worker Verifications</p>
                    <p className={styles.actionDesc}>
                      Approve or reject pending verifications
                    </p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* External links */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>External Services</h3>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.actionsList}>
                {LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.actionItem}
                  >
                    <span className={styles.actionIcon}>{l.icon}</span>
                    <div>
                      <p className={styles.actionLabel}>{l.label}</p>
                      <p className={styles.actionDesc}>{l.url}</p>
                    </div>
                    <span className={styles.actionArrow}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Alert({ type, text, onClose }) {
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button onClick={onClose} className={styles.alertClose}>
        ×
      </button>
    </div>
  );
}
function Spinner() {
  return <span className={styles.spinner} />;
}
