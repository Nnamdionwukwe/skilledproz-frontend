import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import styles from "./WorkerLayout.module.css";
import { useAuthStore } from "../../store/authStore";

const NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard/worker", icon: "◈" },
      { label: "My Bookings", path: "/bookings", icon: "📋" },
      { label: "Earnings", path: "/dashboard/worker/earnings", icon: "₦" },
    ],
  },
  {
    group: "Profile",
    items: [
      { label: "Edit Profile", path: "/dashboard/worker/profile", icon: "👤" },
      { label: "Portfolio", path: "/dashboard/worker/portfolio", icon: "🖼" },
      {
        label: "Certifications",
        path: "/dashboard/worker/certifications",
        icon: "🏅",
      },
      {
        label: "Availability",
        path: "/dashboard/worker/availability",
        icon: "📅",
      },
      { label: "Categories", path: "/dashboard/worker/categories", icon: "🔧" },
    ],
  },
  {
    group: "Inbox",
    items: [
      {
        label: "Reviews",
        path: "/dashboard/worker/reviews",
        icon: "⭐",
        badge: null,
      },
      {
        label: "Notifications",
        path: "/dashboard/worker/notifications",
        icon: "🔔",
        badge: "unread",
      },
      { label: "Messages", path: "/messages", icon: "💬" },
    ],
  },
];

const PAGE_TITLES = {
  "/dashboard/worker": { title: "Dashboard", sub: "Your work at a glance" },
  "/bookings": { title: "My Bookings", sub: "All your jobs" },
  "/bookings/create": { title: "Create Booking", sub: "Post a new job" },
  "/dashboard/worker/earnings": { title: "Earnings", sub: "Track your income" },
  "/dashboard/worker/profile": {
    title: "Edit Profile",
    sub: "Update your information",
  },
  "/dashboard/worker/portfolio": {
    title: "Portfolio",
    sub: "Showcase your work",
  },
  "/dashboard/worker/certifications": {
    title: "Certifications",
    sub: "Your credentials",
  },
  "/dashboard/worker/availability": {
    title: "Availability",
    sub: "Set your schedule",
  },
  "/dashboard/worker/categories": {
    title: "Categories",
    sub: "Your trade categories",
  },
  "/dashboard/worker/reviews": { title: "Reviews", sub: "What clients say" },
  "/dashboard/worker/notifications": {
    title: "Notifications",
    sub: "Stay up to date",
  },
  "/messages": { title: "Messages", sub: "Your conversations" },
  "/profile/me": { title: "My Profile", sub: "Your public profile" },
};

function getPageInfo(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/bookings/"))
    return { title: "Booking Detail", sub: "Job details and actions" };
  if (pathname.startsWith("/profile/")) return { title: "Profile", sub: "" };
  return { title: "SkilledProz", sub: "" };
}

function isNavActive(itemPath, pathname) {
  if (itemPath === "/bookings")
    return pathname === "/bookings" || pathname.startsWith("/bookings/");
  return pathname === itemPath;
}

export default function WorkerLayout({ children, unreadNotifications = 0 }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "WK";

  const pageInfo = getPageInfo(location.pathname);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.shell}>
      {/* ── Mobile overlay ── */}
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoText}>
            Skilled<span>Proz</span>
          </div>
          <div className={styles.logoRole}>Worker Portal</div>
        </div>

        <div className={styles.sidebarWorker}>
          <div className={styles.sidebarAvatar}>{initials}</div>
          <div>
            <div className={styles.sidebarWorkerName}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className={styles.sidebarWorkerBadge}>● Active Worker</div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV.map((group) => (
            <div key={group.group} className={styles.navGroup}>
              <div className={styles.navGroupLabel}>{group.group}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${isNavActive(item.path, location.pathname) ? styles.active : ""}`}
                  onClick={closeSidebar}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {item.label}
                  {item.badge === "unread" && unreadNotifications > 0 && (
                    <span className={styles.navBadge}>
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.availToggle}>
            <span className={styles.availLabel}>
              {available ? "🟢 Available" : "⚫ Offline"}
            </span>
            <button
              className={`${styles.toggle} ${available ? styles.on : ""}`}
              onClick={() => setAvailable((v) => !v)}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <span className={styles.navIcon}>🚪</span>
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              ☰
            </button>
            <div className={styles.headerTitleWrap}>
              <span className={styles.headerTitle}>{pageInfo.title}</span>
              <span className={styles.headerSub}>{pageInfo.sub}</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <Link
              to="/dashboard/worker/notifications"
              className={styles.headerIconBtn}
            >
              🔔
              {unreadNotifications > 0 && (
                <span className={styles.headerBellDot} />
              )}
            </Link>
            <Link to="/profile/me" className={styles.headerIconBtn}>
              <div className={styles.headerAvatar}>{initials}</div>
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
