import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./AdminLayout.module.css";

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
} from "react-icons/fi";

// Font Awesome Icons (Fa)
import { FaBullhorn, FaRocket, FaGem } from "react-icons/fa";

// Ionicons (Io5)
import { IoDiamond } from "react-icons/io5";

// OR Material Design (Md)
// import { MdDiamond } from "react-icons/md";

const NAV = [
  {
    group: "Dashboard",
    items: [
      { label: "Overview", path: "/admin", icon: FiGrid },
      { label: "Analytics", path: "/admin/analytics", icon: FiBarChart2 },
    ],
  },
  {
    group: "User Management",
    items: [
      { label: "All Users", path: "/admin/users", icon: FiUsers },
      { label: "Verifications", path: "/admin/verifications", icon: FiShield },
      { label: "Disputes", path: "/admin/disputes", icon: FiAlertCircle },
    ],
  },
  {
    group: "Job Management",
    items: [
      {
        label: "Platform Jobs",
        path: "/admin/platform/jobs",
        icon: FiBriefcase,
      },
      { label: "External Jobs", path: "/admin/external/jobs", icon: FiLink },
    ],
  },
  {
    group: "Financials",
    items: [
      { label: "Payments", path: "/admin/payments", icon: FiCreditCard },
      {
        label: "Manual Payments",
        path: "/admin/manual-payments",
        icon: FiDollarSign,
      },
      {
        label: "Withdrawals",
        path: "/admin/withdrawals",
        icon: FiTrendingDown,
      },
      { label: "Subscriptions", path: "/admin/subscriptions", icon: IoDiamond }, // ← Fixed
      { label: "Promo Codes", path: "/admin/promocodes", icon: FiTag },
      { label: "Featured", path: "/admin/featured", icon: FaRocket },
      { label: "Insurance", path: "/admin/insurance", icon: FiShield },
    ],
  },
  {
    group: "Content & Community",
    items: [
      { label: "Posts", path: "/admin/posts", icon: FiEdit3 },
      { label: "Reviews", path: "/admin/reviews", icon: FiStar },
      { label: "Categories", path: "/admin/categories", icon: FiTool },
      { label: "Surveys", path: "/admin/surveys", icon: FiBookOpen },
      { label: "Waitlist", path: "/admin/waitlist", icon: FiUsers },
      { label: "Feedback", path: "/admin/feedback", icon: FiMessageSquare },
    ],
  },
  {
    group: "Engagement & Support",
    items: [
      { label: "Bookings", path: "/admin/bookings", icon: FiCalendar },
      { label: "Messages", path: "/admin/messages", icon: FiMessageSquare },
      { label: "Video Calls", path: "/admin/video-calls", icon: FiVideo },
      { label: "Reports", path: "/admin/reports", icon: FiFlag },
      { label: "Campaigns", path: "/admin/campaigns", icon: FaBullhorn },
      { label: "Referrals", path: "/admin/referrals", icon: FiShare2 },
      { label: "Audit Logs", path: "/admin/audit-logs", icon: FiFileText },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Broadcast", path: "/admin/broadcast", icon: FaBullhorn },
      { label: "Settings", path: "/admin/settings", icon: FiSettings },
    ],
  },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data.data?.overview))
      .catch(() => {});
  }, []);

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

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>SP</span>
            <div>
              <div className={styles.logoName}>SkilledProz</div>
              <div className={styles.logoRole}>Admin Console</div>
            </div>
          </div>

          {/* Quick stats pills */}
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

        <nav className={styles.nav}>
          {NAV.map((group) => (
            <div key={group.group} className={styles.navGroup}>
              <div className={styles.navGroupLabel}>{group.group}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${styles.navItem} ${location.pathname === item.path ? styles.navItemActive : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.navIcon}>
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
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
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
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
    </div>
  );
}
