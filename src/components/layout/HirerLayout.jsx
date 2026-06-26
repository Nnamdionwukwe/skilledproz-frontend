import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import styles from "./HirerLayout.module.css";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import {
  FaHome,
  FaBook,
  FaCreditCard,
  FaPlus,
  FaClipboardList,
  FaGavel,
  FaNewspaper,
  FaPenFancy,
  FaBookmark,
  FaSearch,
  FaTools,
  FaComments,
  FaStar,
  FaUserFriends,
  FaFlag,
  FaBullhorn,
  FaBell,
  FaShieldAlt,
  FaGem,
  FaRocket,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaUserCircle,
  FaEnvelope,
} from "react-icons/fa";

// ─── Navigation config ──────────────────────────────────────────────────────
const NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard/hirer", icon: <FaHome /> },
      { label: "My Bookings", path: "/bookings", icon: <FaBook /> },
      {
        label: "Payment History",
        path: "/dashboard/hirer/payment-history",
        icon: <FaCreditCard />,
      },
      {
        label: "Post a Job",
        path: "/dashboard/hirer/post-job",
        icon: <FaPlus />,
      },
      {
        label: "Jobs Management",
        path: "/dashboard/hirer/jobs-management",
        icon: <FaClipboardList />,
      },
      { label: "Disputes", path: "/disputes", icon: <FaGavel /> },
      { label: "Community Feed", path: "/feed", icon: <FaNewspaper /> },
      { label: "My Posts", path: "/my-posts", icon: <FaPenFancy /> },
    ],
  },
  {
    group: "Workers",
    items: [
      {
        label: "Saved Workers",
        path: "/dashboard/hirer/saved-workers",
        icon: <FaBookmark />,
      },
      {
        label: "Browse Workers",
        path: "/search",
        icon: <FaSearch />,
      },
      { label: "Browse By Categories", path: "/categories", icon: <FaTools /> },
      {
        label: "Messages",
        path: "/messages",
        icon: <FaComments />,
        badge: "message",
      },
    ],
  },
  {
    group: "Reviews",
    items: [
      {
        label: "Reviews Received",
        path: "/dashboard/hirer/reviews/received",
        icon: <FaStar />,
      },
      {
        label: "Reviews Given",
        path: "/dashboard/hirer/reviews/given",
        icon: <FaPenFancy />,
      },
    ],
  },
  {
    group: "Referrals",
    items: [
      {
        label: "Referals",
        path: "/referrals",
        icon: <FaUserFriends />,
      },
    ],
  },
  {
    group: "Reports",
    items: [
      {
        label: "Reports",
        path: "/my-reports",
        icon: <FaFlag />,
      },
    ],
  },
  {
    group: "Campaigns",
    items: [
      {
        label: "Campaigns",
        path: "/campaign",
        icon: <FaBullhorn />,
      },
    ],
  },
  {
    group: "Account",
    items: [
      {
        label: "Notifications",
        path: "/dashboard/hirer/notifications",
        icon: <FaBell />,
        badge: "unread",
      },
      {
        label: "Verification",
        path: "/dashboard/hirer/verification",
        icon: <FaShieldAlt />,
      },
    ],
  },
  {
    group: "Subscriptions & Features",
    items: [
      {
        label: "Subscriptions",
        path: "/dashboard/hirer/subscription",
        icon: <FaGem />,
      },
      {
        label: "Boost Listing",
        path: "/dashboard/hirer/featured",
        icon: <FaRocket />,
      },
      { label: "Settings", path: "/settings", icon: <FaCog /> },
    ],
  },
];

// ─── Page titles map ──────────────────────────────────────────────────────
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
  "/dashboard/worker/subscription": {
    title: "Subscriptions",
    sub: "Manage your subscription",
  },
  "/dashboard/worker/featured": {
    title: "Featured Boost",
    sub: "Boost your listing",
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

// ─── Confirmation Modal ──────────────────────────────────────────────────
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.modalCancelBtn} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={`${styles.modalConfirmBtn} ${styles[`modalConfirm_${confirmVariant}`]}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────
export default function HirerLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Fetch unread notifications ──────────────────────────────────────────
  useEffect(() => {
    api
      .get("/notifications?limit=1")
      .then((res) => setUnreadCount(res.data.data?.unreadCount || 0))
      .catch(() => {});
  }, [location.pathname]);

  // ── Fetch unread messages ──────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/messages/conversations")
      .then((res) => {
        const conversations = res.data.data?.conversations || [];
        const total = conversations.reduce(
          (sum, c) => sum + (c.unreadCount || 0),
          0,
        );
        setUnreadMessageCount(total);
      })
      .catch(() => setUnreadMessageCount(0));
  }, [location.pathname]);

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "H";

  const pageInfo = getPageInfo(location.pathname);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate("/login");
  };

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
              <FaUserCircle size={24} />
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
                  {item.badge === "unread" && unreadCount > 0 && (
                    <span className={styles.navBadge}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {item.badge === "message" && unreadMessageCount > 0 && (
                    <span className={styles.navBadge}>
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
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
            onClick={() => setShowLogoutModal(true)}
          >
            <span className={styles.navIcon}>
              <FaSignOutAlt size={16} />
            </span>
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
              <FaBars size={18} />
            </button>
            <div className={styles.headerTitleWrap}>
              <span className={styles.headerTitle}>{pageInfo.title}</span>
              <span className={styles.headerSub}>{pageInfo.sub}</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* ── Notification Bell ── */}
            <Link
              to="/dashboard/hirer/notifications"
              className={styles.headerIconBtn}
              style={{ position: "relative" }}
            >
              <FaBell size={18} />
              {unreadCount > 0 && (
                <span className={styles.bellBadge}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* ── Message Icon ── */}
            <Link
              to="/messages"
              className={styles.headerIconBtn}
              style={{ position: "relative" }}
            >
              <FaEnvelope size={18} />
              {unreadMessageCount > 0 && (
                <span className={styles.bellBadge}>
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </Link>

            {/* ── User Avatar ── */}
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
                  <FaUserCircle size={20} />
                )}
              </div>
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>

      {/* ─── Logout Confirmation Modal ─── */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Log out of SkilledProz?"
        message="You will need to sign in again to access your account."
        confirmLabel="Log out"
        confirmVariant="danger"
      />
    </div>
  );
}
