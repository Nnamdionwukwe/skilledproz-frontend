// src/pages/admin/AdminSettings.jsx
// Admin settings — account, platform configuration, quick actions, external services.
//
// Endpoint used:
//   POST /admin/broadcast   { title, body, role }
//
// Emojis removed. Fully responsive. Uses platform AlertModal.

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  Percent,
  Banknote,
  Landmark,
  Lock,
  Globe2,
  CreditCard,
  Megaphone,
  Radio,
  Scale,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  MailCheck,
  AlertTriangle,
  CheckCircle,
  UserCircle,
  Pencil,
  Wallet,
  Receipt,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./Admin.module.css";

export default function AdminSettings() {
  const { user } = useAuthStore();
  const [notify, setNotify] = useState(null);
  const [testing, setTesting] = useState(false);

  function showToast(type, text) {
    setNotify({ type, text });
  }

  async function testEmail() {
    setTesting(true);
    setNotify(null);
    try {
      await api.post("/admin/broadcast", {
        title: "SkilledProz — System Test",
        body: "This is a test broadcast from the admin panel. If you see this, notifications are working.",
        role: "ADMIN",
      });
      showToast("success", "Test broadcast sent to admins successfully.");
    } catch (e) {
      showToast("error", e.response?.data?.message || "Test failed.");
    } finally {
      setTesting(false);
    }
  }

  const CONFIG_ITEMS = [
    {
      label: "Platform Commission",
      value: "15%",
      desc: "Applied on all completed bookings",
      Icon: Percent,
    },
    {
      label: "Minimum Withdrawal",
      value: "NGN 500",
      desc: "Minimum worker payout request",
      Icon: Banknote,
    },
    {
      label: "Processing Fee",
      value: "1%",
      desc: "Applied on worker withdrawals",
      Icon: Landmark,
    },
    {
      label: "Escrow Model",
      value: "Manual capture",
      desc: "Stripe: capture on job completion",
      Icon: Lock,
    },
    {
      label: "Paystack Region",
      value: "NGN, GHS, ZAR, KES",
      desc: "Currencies routed to Paystack",
      Icon: Globe2,
    },
    {
      label: "Stripe Region",
      value: "USD, GBP, EUR + others",
      desc: "Currencies routed to Stripe",
      Icon: CreditCard,
    },
  ];

  const LINKS = [
    {
      label: "Stripe Dashboard",
      url: "https://dashboard.stripe.com",
      Icon: CreditCard,
    },
    {
      label: "Paystack Dashboard",
      url: "https://dashboard.paystack.com",
      Icon: Landmark,
    },
    { label: "Railway Console", url: "https://railway.app", Icon: Globe2 },
    {
      label: "Cloudinary Media",
      url: "https://cloudinary.com/console",
      Icon: Receipt,
    },
    { label: "Prisma Studio", url: "http://localhost:5555", Icon: Wallet },
    { label: "API Documentation", url: "http://localhost:5001", Icon: Radio },
  ];

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>System</p>
            <h1 className={styles.pageTitle}>
              <Settings size={20} /> Settings
            </h1>
          </div>
        </div>

        <div className={styles.settingsGrid}>
          {/* Admin profile */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>
                <UserCircle size={14} /> Admin Account
              </h3>
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
                  <span className={styles.adminRoleBadge}>
                    <ShieldCheck size={10} /> Administrator
                  </span>
                </div>
              </div>
              <Link to="/profile/me" className={styles.settingsLink}>
                <Pencil size={12} /> Edit Profile
              </Link>
            </div>
          </div>

          {/* Platform config (read-only) */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>
                <Percent size={14} /> Platform Configuration
              </h3>
              <span className={styles.readOnlyTag}>
                <Lock size={9} /> Read-only · Edit in .env
              </span>
            </div>
            <div className={styles.panelBody}>
              {CONFIG_ITEMS.map((item) => {
                const Icon = item.Icon;
                return (
                  <div key={item.label} className={styles.configRow}>
                    <span className={styles.configIcon}>
                      <Icon size={14} />
                    </span>
                    <div className={styles.configInfo}>
                      <p className={styles.configLabel}>{item.label}</p>
                      <p className={styles.configDesc}>{item.desc}</p>
                    </div>
                    <span className={styles.configVal}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>
                <Megaphone size={14} /> Quick Actions
              </h3>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.actionsList}>
                <button
                  type="button"
                  className={styles.actionItem}
                  onClick={testEmail}
                  disabled={testing}
                >
                  <span className={styles.actionIcon}>
                    <MailCheck size={18} />
                  </span>
                  <div className={styles.actionInfo}>
                    <p className={styles.actionLabel}>
                      {testing ? "Sending…" : "Send Test Broadcast"}
                    </p>
                    <p className={styles.actionDesc}>
                      Sends a test notification to all admins
                    </p>
                  </div>
                  {testing ? (
                    <span className={styles.spinner} />
                  ) : (
                    <ArrowRight size={14} className={styles.actionArrow} />
                  )}
                </button>

                <Link to="/admin/broadcast" className={styles.actionItem}>
                  <span className={styles.actionIcon}>
                    <Radio size={18} />
                  </span>
                  <div className={styles.actionInfo}>
                    <p className={styles.actionLabel}>Broadcast to Users</p>
                    <p className={styles.actionDesc}>
                      Send announcement to all users or by role
                    </p>
                  </div>
                  <ArrowRight size={14} className={styles.actionArrow} />
                </Link>

                <Link to="/admin/disputes" className={styles.actionItem}>
                  <span className={styles.actionIcon}>
                    <Scale size={18} />
                  </span>
                  <div className={styles.actionInfo}>
                    <p className={styles.actionLabel}>Manage Disputes</p>
                    <p className={styles.actionDesc}>
                      Review and resolve open disputes
                    </p>
                  </div>
                  <ArrowRight size={14} className={styles.actionArrow} />
                </Link>

                <Link to="/admin/verifications" className={styles.actionItem}>
                  <span className={styles.actionIcon}>
                    <ShieldCheck size={18} />
                  </span>
                  <div className={styles.actionInfo}>
                    <p className={styles.actionLabel}>Worker Verifications</p>
                    <p className={styles.actionDesc}>
                      Approve or reject pending verifications
                    </p>
                  </div>
                  <ArrowRight size={14} className={styles.actionArrow} />
                </Link>
              </div>
            </div>
          </div>

          {/* External links */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>
                <ExternalLink size={14} /> External Services
              </h3>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.actionsList}>
                {LINKS.map((l) => {
                  const Icon = l.Icon;
                  return (
                    <a
                      key={l.label}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.actionItem}
                    >
                      <span className={styles.actionIcon}>
                        <Icon size={18} />
                      </span>
                      <div className={styles.actionInfo}>
                        <p className={styles.actionLabel}>{l.label}</p>
                        <p className={styles.actionDesc}>{l.url}</p>
                      </div>
                      <ExternalLink size={13} className={styles.actionArrow} />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Platform AlertModal */}
        <AlertModal
          isOpen={!!notify}
          onClose={() => setNotify(null)}
          title={notify?.type === "error" ? "Something went wrong" : "Done"}
          subtitle={
            notify?.type === "error"
              ? "The action could not be completed."
              : "The action was completed successfully."
          }
          alerts={
            notify
              ? [
                  {
                    icon: notify.type === "error" ? AlertTriangle : CheckCircle,
                    label: notify.type === "error" ? "Error" : "Success",
                    description: notify.text,
                    variant: notify.type === "error" ? "red" : "green",
                  },
                ]
              : []
          }
        />
      </div>
    </AdminLayout>
  );
}
