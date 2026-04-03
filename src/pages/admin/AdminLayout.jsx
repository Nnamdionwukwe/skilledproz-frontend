import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./AdminLayout.module.css";

const NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: "◈" },
      { label: "Analytics", path: "/admin/analytics", icon: "📊" },
    ],
  },
  {
    group: "Users",
    items: [
      { label: "All Users", path: "/admin/users", icon: "👥" },
      { label: "Verifications", path: "/admin/verifications", icon: "🛡️" },
      { label: "Disputes", path: "/admin/disputes", icon: "⚖️" },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Bookings", path: "/admin/bookings", icon: "📋" },
      { label: "Categories", path: "/admin/categories", icon: "🔧" },
      { label: "Reviews", path: "/admin/reviews", icon: "⭐" },
      { label: "Payments", path: "/admin/payments", icon: "💳" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Broadcast", path: "/admin/broadcast", icon: "📢" },
      { label: "Settings", path: "/admin/settings", icon: "⚙️" },
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
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${location.pathname === item.path ? styles.navItemActive : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
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
            🚪
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
              ☰
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
