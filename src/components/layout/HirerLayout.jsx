import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import styles from "./HirerLayout.module.css";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";

const NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard/hirer", icon: "◈" },
      { label: "My Bookings", path: "/bookings", icon: "📋" },
      {
        label: "Payment History",
        path: "/dashboard/hirer/payment-history",
        icon: "�",
      },
      { label: "Post a Job", path: "/dashboard/hirer/post-job", icon: "➕" },
      {
        label: "Jobs Management",
        path: "/dashboard/hirer/jobs-management",
        icon: "📋",
      },
      { label: "Disputes", path: "/disputes", icon: "⚖️" },
    ],
  },
  {
    group: "Workers",
    items: [
      {
        label: "Saved Workers",
        path: "/dashboard/hirer/saved-workers",
        icon: "🔖",
      },

      {
        label: "Browse Workers",
        path: "/search",
        icon: "🔍",
      },
      { label: "Browse By Categories", path: "/categories", icon: "🔧" },
      { label: "Messages", path: "/messages", icon: "💬" },
    ],
  },
  {
    group: "Reviews",
    items: [
      {
        label: "Reviews Received",
        path: "/dashboard/hirer/reviews/received",
        icon: "⭐",
      },
      {
        label: "Reviews Given",
        path: "/dashboard/hirer/reviews/given",
        icon: "✍️",
      },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Profile", path: "/dashboard/hirer/profile", icon: "👤" },
      {
        label: "Notifications",
        path: "/dashboard/hirer/notifications",
        icon: "🔔",
        badge: "unread",
      },
      {
        label: "Verification",
        path: "/dashboard/hirer/verification",
        icon: "🛡️",
      },
    ],
  },
];

const PAGE_TITLES = {
  "/dashboard/hirer": { title: "Dashboard", sub: "Your hiring overview" },
  "/bookings": { title: "My Bookings", sub: "All your jobs" },
  "/bookings/create": { title: "Create Booking", sub: "Post a new job" },
  "/dashboard/hirer/post-job": {
    title: "Post a Job",
    sub: "Find the right worker",
  },
  "/search": {
    title: "Browse Jobs",
    sub: "Get the right worker",
  },
  "/categories": {
    title: "Browse By Categories",
    sub: "Find workers by skill",
  },
  "/dashboard/hirer/saved-workers": {
    title: "Saved Workers",
    sub: "Workers you've hired before",
  },
  "/dashboard/hirer/reviews/given": {
    title: "Reviews Given",
    sub: "Your feedback to workers",
  },
  "/dashboard/hirer/reviews/received": {
    title: "Reviews Received",
    sub: "Feedback from workers",
  },
  "/messages": { title: "Messages", sub: "Your conversations" },
  "/dashboard/hirer/profile": {
    title: "Profile",
    sub: "Your account information",
  },
  "/dashboard/hirer/notifications": {
    title: "Notifications",
    sub: "Stay up to date",
  },
  "/profile/me": { title: "My Profile", sub: "Your public profile" },
  "/dashboard/hirer/payment-history": {
    title: "Payment History",
    sub: "Your payment records",
  },
  "/disputes": { title: "My Disputes", sub: "Track and manage your disputes" },
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
  if (itemPath === "/dashboard/hirer/reviews/received")
    return pathname === "/dashboard/hirer/reviews/received";
  if (itemPath === "/dashboard/hirer/reviews/given")
    return pathname === "/dashboard/hirer/reviews/given";
  if (itemPath === "/dashboard/hirer/payment-history")
    return pathname === "/dashboard/hirer/payment-history";
  return pathname === itemPath;
}

export default function HirerLayout({ children, unreadNotifications = 0 }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
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
    : "H";

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
          <div className={styles.logoRole}>Hirer Portal</div>
        </div>

        <div className={styles.sidebarUser}>
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
            <div className={styles.sidebarUserName}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className={styles.sidebarUserBadge}>● Hirer</div>
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
