// src/components/layout/AdminLayout.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useAdminSupportStore } from "../../store/adminSupportStore"; // NEW
import { createSupportSocket } from "../../lib/supportApi"; // NEW
import api from "../../lib/api";
import styles from "./AdminLayout.module.css";
import ConfirmationModal from "../ui/ConfirmationModal";

// Feather Icons (Fi)
import {
  FiGrid,
  FiBarChart2,
  FiUsers,
  FiShield,
  FiAlertCircle,
  FiBriefcase,
  FiLink,
  FiCreditCard,
  FiDollarSign,
  FiTrendingDown,
  FiTag,
  FiEdit3,
  FiStar,
  FiTool,
  FiBookOpen,
  FiCalendar,
  FiMessageSquare,
  FiVideo,
  FiFlag,
  FiShare2,
  FiFileText,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiRadio,
  FiTarget,
  FiFilter,
  FiTrendingUp,
  FiHelpCircle,
} from "react-icons/fi";
import { FaBullhorn, FaRocket } from "react-icons/fa";
import { IoDiamond } from "react-icons/io5";

const NAV = [
  // ... (Keep your exact NAV array from before)
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: FiGrid },
      { label: "Analytics", path: "/admin/analytics", icon: FiBarChart2 },
    ],
  },
  // ... paste the rest of your NAV here ...
  {
    group: "Engagement & Support",
    items: [
      { label: "Bookings", path: "/admin/bookings", icon: FiCalendar },
      { label: "Messages", path: "/admin/messages", icon: FiMessageSquare },
      {
        label: "Support Hub",
        path: "/admin/support",
        icon: FiHelpCircle,
        badge: "support",
      },
      { label: "Video Calls", path: "/admin/video-calls", icon: FiVideo },
      { label: "Reports", path: "/admin/reports", icon: FiFlag },
      { label: "Campaigns", path: "/admin/campaigns", icon: FaBullhorn },
      { label: "Referrals", path: "/admin/referrals", icon: FiShare2 },
      { label: "Audit Logs", path: "/admin/audit-logs", icon: FiFileText },
    ],
  },
  // ...
];

export default function AdminLayout({ children }) {
  const { user, logout, accessToken } = useAuthStore();
  const { unreadCount: supportUnread, setUnreadCount } = useAdminSupportStore();

  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const navRef = useRef(null);
  const activeRef = useRef(null);

  // 1. Fetch initial stats and unread count
  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data.data?.overview))
      .catch(() => {});

    // Initial fetch of unread count
    api
      .get("/support/admin/chats")
      .then((res) => {
        const chats = res.data.chats || [];
        const totalUnread = chats.reduce(
          (sum, c) => sum + (c.unreadCount || 0),
          0,
        );
        setUnreadCount(totalUnread);
      })
      .catch(() => {});
  }, [setUnreadCount]);

  // 2. Socket Listener for Global New Messages
  useEffect(() => {
    if (!accessToken) return;
    const socket = createSupportSocket(accessToken);

    socket.on("support:inbox:new_message", () => {
      // Instantly increment the badge so the admin sees it pulse
      useAdminSupportStore.setState((state) => ({
        unreadCount: state.unreadCount + 1,
      }));
    });

    return () => socket.disconnect();
  }, [accessToken]);

  // Scroll the active nav item into view
  useEffect(() => {
    if (!activeRef.current || !navRef.current) return;
    const t = setTimeout(() => {
      try {
        activeRef.current.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [location.pathname, open]);

  const initials = user
    ? `${user.firstName?.[0]}${user.lastName?.[0]}`.toUpperCase()
    : "AD";
  const currentTitle =
    NAV.flatMap((g) => g.items).find((i) => location.pathname === i.path)
      ?.label || "Admin";

  return (
    <div className={styles.shell}>
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>SP</span>
            <div>
              <div className={styles.logoName}>SkilledProz</div>
              <div className={styles.logoRole}>Admin Console</div>
            </div>
          </div>
          {stats && (
            <div className={styles.quickStats}>
              <div className={styles.qStat}>
                <span className={styles.qStatNum}>{stats.newUsersToday}</span>
                <span className={styles.qStatLabel}>new today</span>
              </div>
              <div className={styles.qStatDivider} />
              <div className={styles.qStat}>
                <span
                  className={styles.qStatNum}
                  style={{ color: "var(--red)" }}
                >
                  {stats.disputedBookings}
                </span>
                <span className={styles.qStatLabel}>disputes</span>
              </div>
              <div className={styles.qStatDivider} />
              <div className={styles.qStat}>
                <span
                  className={styles.qStatNum}
                  style={{ color: "var(--green)" }}
                >
                  {stats.activeBookings}
                </span>
                <span className={styles.qStatLabel}>active</span>
              </div>
            </div>
          )}
        </div>

        <nav className={styles.nav} ref={navRef}>
          {NAV.map((group) => (
            <div key={group.group} className={styles.navGroup}>
              <div className={styles.navGroupLabel}>{group.group}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    ref={isActive ? activeRef : undefined}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.navIcon}>
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                    {item.badge === "support" && supportUnread > 0 && (
                      <span className={`${styles.navBadge} ${styles.pulse}`}>
                        {supportUnread > 99 ? "99+" : supportUnread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminUser}>
            <div className={styles.adminAvatar}>
              {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
            </div>
            <div>
              <div className={styles.adminName}>
                {user?.firstName} {user?.lastName}
              </div>
              <div className={styles.adminRole}>Super Admin</div>
            </div>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={() => setConfirmLogout(true)}
            aria-label="Log out"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setOpen((v) => !v)}
            >
              <FiMenu size={22} />
            </button>
            <span className={styles.headerTitle}>{currentTitle}</span>
          </div>
          <div className={styles.headerRight}>
            <Link to="/admin" className={styles.headerUser}>
              <div className={styles.headerAvatar}>
                {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
              </div>
            </Link>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>

      <ConfirmationModal
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
          navigate("/login");
        }}
        title="Log out of the admin console?"
        message="You will be signed out of your admin session and returned to the login page."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        confirmVariant="danger"
      />
    </div>
  );
}
