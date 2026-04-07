import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import styles from "./WorkerLayout.module.css";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";

const NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard/worker", icon: "◈" },
      { label: "My Bookings", path: "/bookings", icon: "📋" },
      { label: "Categories", path: "/dashboard/worker/categories", icon: "🔧" },
      { label: "Browse Jobs", path: "/jobs", icon: "🔍" },
      {
        label: "My Applications",
        path: "/dashboard/worker/applications",
        icon: "📝",
      },
      { label: "Disputes", path: "/disputes", icon: "⚖️" },
      { label: "Community Feed", path: "/feed", icon: "📰" },
      { label: "My Posts", path: "/my-posts", icon: "✍️" },
    ],
  },
  {
    group: "Payouts",
    items: [
      { label: "Earnings", path: "/dashboard/worker/earnings", icon: "💸" },
      {
        label: "Withdrawals",
        path: "/dashboard/worker/withdrawals",
        icon: "↑",
      },
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
      // {
      //   label: "Background Check",
      //   path: "/dashboard/worker/background-check",
      //   icon: "🛡️",
      // },
      {
        label: "Verification",
        path: "/dashboard/worker/verification",
        icon: "🛡️",
      },
    ],
  },
  {
    group: "Inbox",
    items: [
      { label: "Reviews", path: "/dashboard/worker/reviews", icon: "⭐" },
      {
        label: "Notifications",
        path: "/dashboard/worker/notifications",
        icon: "🔔",
        badge: "unread",
      },
      { label: "Messages", path: "/messages", icon: "💬" },
    ],
  },
  {
    group: "Subscriptions & Features",
    items: [
      {
        label: "Subscriptions",
        path: "/dashboard/hirer/subscription",
        icon: "⭐",
      },
      { label: "Boost Listing", path: "/dashboard/hirer/featured", icon: "🚀" },
      { label: "Settings", path: "/settings", icon: "🚀" },
    ],
  },
];

const PAGE_TITLES = {
  "/dashboard/worker": { title: "Dashboard", sub: "Your work at a glance" },
  "/bookings": { title: "My Bookings", sub: "All your jobs" },
  "/bookings/create": { title: "Create Booking", sub: "Post a new job" },
  "/dashboard/worker/earnings": { title: "Earnings", sub: "Track your income" },
  "/dashboard/worker/payouts": {
    title: "Cashouts",
    sub: "Withdraw your earnings",
  },
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
  "/dashboard/worker/applications": {
    title: "My Applications",
    sub: "Jobs you applied to",
  },
  // "/dashboard/worker/background-check": {
  //   title: "Background Check",
  //   sub: "Build hirer trust",
  // },
  "/messages": { title: "Messages", sub: "Your conversations" },
  "/profile/me": { title: "My Profile", sub: "Your public profile" },
  "/jobs": { title: "Browse Jobs", sub: "Find your next job" },
  "/disputes": { title: "My Disputes", sub: "Track and manage your disputes" },
  "/dashboard/worker/subscription": {
    title: "Subscriptions",
    sub: "Manage your subscription",
  },
  "/dashboard/worker/featured": {
    title: "Featured Boost",
    sub: "Boost your listing",
  },
  "/dashboard/worker/disputes": {
    title: "My Disputes",
    sub: "Track and manage your disputes",
  },
};

function getPageInfo(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/bookings/"))
    return { title: "Booking Detail", sub: "Job details and actions" };
  if (pathname.startsWith("/profile/")) return { title: "Profile", sub: "" };
  if (pathname.startsWith("/jobs/")) return { title: "Job Detail", sub: "" };
  return { title: "SkilledProz", sub: "" };
}

function isNavActive(itemPath, pathname) {
  if (itemPath === "/bookings")
    return pathname === "/bookings" || pathname.startsWith("/bookings/");
  return pathname === itemPath;
}

export default function WorkerLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api
      .get("/notifications?limit=1")
      .then((res) => setUnreadCount(res.data.data?.unreadCount || 0))
      .catch(() => {});
  }, [location.pathname]);

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "WK";

  const pageInfo = getPageInfo(location.pathname);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoText}>
            Skilled<span>Proz</span>
          </div>
          <div className={styles.logoRole}>Worker Portal</div>
        </div>

        <div className={styles.sidebarWorker}>
          <div
            onClick={() => navigate("/profile/me")}
            className={styles.sidebarAvatar}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              initials
            )}
          </div>
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
                  {item.badge === "unread" && unreadCount > 0 && (
                    <span className={styles.navBadge}>
                      {unreadCount > 99 ? "99+" : unreadCount}
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
              style={{ position: "relative" }}
            >
              🔔
              {unreadCount > 0 && (
                <span className={styles.bellBadge}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link to="/profile/me" className={styles.headerIconBtn}>
              <div className={styles.headerAvatar}>
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
