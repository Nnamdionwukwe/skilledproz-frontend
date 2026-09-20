import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiCalendar,
  FiGrid,
  FiSearch,
  FiBookmark,
  FiClipboard,
  FiAlertCircle,
  FiFeather,
  FiEdit,
  FiDollarSign,
  FiArrowUp,
  FiUsers,
  FiSpeaker,
  FiImage,
  FiAward,
  FiClock,
  FiShield,
  FiFlag,
  FiStar,
  FiBell,
  FiMail,
  FiPackage,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiChevronDown,
  FiRotateCcw,
} from "react-icons/fi";
import styles from "./WorkerLayout.module.css";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";

// ─── Navigation config ──────────────────────────────────────────────────────
const NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard/worker", icon: FiHome },
      { label: "My Bookings", path: "/bookings", icon: FiCalendar },
      {
        label: "Categories",
        path: "/dashboard/worker/categories",
        icon: FiGrid,
      },
      { label: "Browse Jobs", path: "/jobs", icon: FiSearch },
      {
        label: "Saved Jobs",
        path: "/dashboard/worker/saved-jobs",
        icon: FiBookmark,
      },
      {
        label: "My Applications",
        path: "/dashboard/worker/applications",
        icon: FiClipboard,
      },
      { label: "Disputes", path: "/disputes", icon: FiAlertCircle },
      { label: "Community Feed", path: "/feed", icon: FiFeather },
      { label: "My Posts", path: "/my-posts", icon: FiEdit },
    ],
  },
  {
    group: "History",
    items: [
      {
        label: "Completed Jobs",
        path: "/dashboard/worker/completed-jobs",
        icon: FiAward,
      },
    ],
  },
  {
    group: "Payouts",
    items: [
      {
        label: "Earnings",
        path: "/dashboard/worker/earnings",
        icon: FiDollarSign,
      },
      {
        label: "Wallet",
        path: "/dashboard/worker/withdrawals",
        icon: FiArrowUp,
      },
      {
        label: "Refunds",
        path: "/dashboard/worker/refunds",
        icon: FiRotateCcw,
      },
      { label: "Referrals", path: "/referrals", icon: FiUsers },
      { label: "Campaigns", path: "/campaign", icon: FiSpeaker },
    ],
  },
  {
    group: "Profile",
    items: [
      {
        label: "Portfolio",
        path: "/dashboard/worker/portfolio",
        icon: FiImage,
      },
      {
        label: "Certifications",
        path: "/dashboard/worker/certifications",
        icon: FiAward,
      },
      {
        label: "Availability",
        path: "/dashboard/worker/availability",
        icon: FiClock,
      },
      {
        label: "Verification",
        path: "/dashboard/worker/verification",
        icon: FiShield,
      },
      { label: "Reports", path: "/my-reports", icon: FiFlag },
    ],
  },
  {
    group: "Inbox",
    items: [
      { label: "Reviews", path: "/dashboard/worker/reviews", icon: FiStar },
      {
        label: "Notifications",
        path: "/dashboard/worker/notifications",
        icon: FiBell,
        badge: "unread",
      },
      { label: "Messages", path: "/messages", icon: FiMail, badge: "message" },
    ],
  },
  {
    group: "Subscriptions & Features",
    items: [
      {
        label: "Subscriptions",
        path: "/dashboard/worker/subscription",
        icon: FiPackage,
      },
      { label: "Settings", path: "/settings", icon: FiSettings },
    ],
  },
];

// ─── Page titles map ──────────────────────────────────────────────────────
const PAGE_TITLES = {
  "/dashboard/worker": { title: "Dashboard", sub: "Your work at a glance" },
  "/bookings": { title: "My Bookings", sub: "All your jobs" },
  "/bookings/create": { title: "Create Booking", sub: "Post a new job" },
  "/dashboard/worker/earnings": { title: "Earnings", sub: "Track your income" },
  "/dashboard/worker/saved-jobs": {
    title: "Saved Jobs",
    sub: "Your saved jobs",
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
  "/messages": { title: "Messages", sub: "Your conversations" },
  "/profile/me": { title: "My Profile", sub: "Your public profile" },
  "/jobs": { title: "Browse Jobs", sub: "Find your next job" },
  "/disputes": { title: "My Disputes", sub: "Track and manage your disputes" },
  "/dashboard/worker/subscription": {
    title: "Subscriptions",
    sub: "Manage your subscription",
  },
  "/dashboard/worker/completed-jobs": {
    title: "Jobs Done",
    sub: "View your Jobs Done",
  },
  "/dashboard/worker/refunds": {
    title: "Refund History",
    sub: "Refunds affecting your earnings",
  },
  "/my-reports": { title: "My Reports", sub: "Track your reports" },
  "/settings": { title: "Settings", sub: "Manage your preferences" },
};

function getPageInfo(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/bookings/"))
    return { title: "Booking Detail", sub: "Job details and actions" };
  if (pathname.startsWith("/profile/")) return { title: "Profile", sub: "" };
  if (pathname.startsWith("/jobs/")) return { title: "Job Detail", sub: "" };
  if (pathname.startsWith("/dashboard/worker/refunds/"))
    return { title: "Refund Detail", sub: "Full refund breakdown" };
  return { title: "Worker Portal", sub: "Manage your work" };
}

function isNavActive(itemPath, pathname) {
  if (itemPath === "/bookings" && pathname.startsWith("/bookings/"))
    return true;
  if (itemPath === "/jobs" && pathname.startsWith("/jobs/")) return true;
  return pathname === itemPath;
}

/** Find which group contains the active item */
function findActiveGroup(pathname) {
  for (const group of NAV) {
    for (const item of group.items) {
      if (isNavActive(item.path, pathname)) return group.group;
    }
  }
  return null;
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
export default function WorkerLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const isFirstRender = useRef(true);

  // ── Collapsible groups state ────────────────────────────────────────────
  // Starts with ALL groups open (desktop default).
  // On mobile open, we'll collapse all but the active one.
  const [openGroups, setOpenGroups] = useState(
    () => new Set(NAV.map((g) => g.group)),
  );

  // ── Refs for auto-scrolling ─────────────────────────────────────────────
  const activeItemRef = useRef(null);

  // ── Fetch unread notifications ──────────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get("/notifications?limit=1");
      setUnreadCount(res.data.data?.unreadCount || 0);
    } catch (e) {
      // Silent fail
    }
  }, []);

  // ── Fetch unread messages ──────────────────────────────────────────────
  const fetchUnreadMessages = useCallback(async () => {
    try {
      const res = await api.get("/messages/conversations");
      const conversations = res.data.data?.conversations || [];
      const total = conversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0,
      );
      setUnreadMessageCount(total);
    } catch (e) {
      setUnreadMessageCount(0);
    }
  }, []);

  // ── Fetch worker availability on mount ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    api
      .get("/workers/dashboard")
      .then((res) => {
        const profile = res.data.data?.profile;
        if (profile && typeof profile.isAvailable === "boolean") {
          setAvailable(profile.isAvailable);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAvailability(false));
  }, [user?.id]);

  // ── Sync availability toggle to backend ──────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!user?.id || loadingAvailability) return;

    api.put("/workers/profile", { isAvailable: available }).catch(() => {
      setAvailable((prev) => !prev);
    });
  }, [available, user?.id, loadingAvailability]);

  // ── Periodic fetch for notifications & messages ──────────────────────────
  useEffect(() => {
    fetchUnread();
    fetchUnreadMessages();
    const interval = setInterval(() => {
      fetchUnread();
      fetchUnreadMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread, fetchUnreadMessages]);

  // ── Auto-expand the group that contains the active item ─────────────────
  // Runs on route change. Ensures the group containing the active link is
  // expanded so the user sees where they are.
  useEffect(() => {
    const activeGroup = findActiveGroup(location.pathname);
    if (!activeGroup) return;
    setOpenGroups((prev) => {
      if (prev.has(activeGroup)) return prev; // already open — don't re-render
      const next = new Set(prev);
      next.add(activeGroup);
      return next;
    });
  }, [location.pathname]);

  // ── Toggle a group open/closed ──────────────────────────────────────────
  const toggleGroup = (groupName) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  // ── On mobile sidebar open: collapse all groups except the active one ───
  // This gives the user a compact view with just the current group expanded.
  useEffect(() => {
    if (!sidebarOpen) return;
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 960px)").matches;
    if (!isMobile) return;

    const activeGroup = findActiveGroup(location.pathname);
    setOpenGroups(activeGroup ? new Set([activeGroup]) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen]);

  // ── AUTO-SCROLL: On route change, scroll the active nav item into view ──
  useEffect(() => {
    if (!activeItemRef.current) return;
    const raf = requestAnimationFrame(() => {
      activeItemRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, openGroups]);

  // ── AUTO-SCROLL: When the mobile sidebar opens, scroll active item ──────
  useEffect(() => {
    if (!sidebarOpen) return;
    if (!activeItemRef.current) return;
    const t = setTimeout(() => {
      activeItemRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    return () => clearTimeout(t);
  }, [sidebarOpen, openGroups]);

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "WK";

  const pageInfo = getPageInfo(location.pathname);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate("/login");
  };

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
            <div className={styles.sidebarUserBadge}>● Active Worker</div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV.map((group) => {
            const isOpen = openGroups.has(group.group);
            const hasActive = group.items.some((item) =>
              isNavActive(item.path, location.pathname),
            );

            return (
              <div
                key={group.group}
                className={`${styles.navGroup} ${isOpen ? styles.navGroupOpen : ""}`}
              >
                {/* ── Clickable group label ── */}
                <button
                  type="button"
                  className={`${styles.navGroupLabel} ${
                    hasActive ? styles.navGroupLabelActive : ""
                  }`}
                  onClick={() => toggleGroup(group.group)}
                  aria-expanded={isOpen}
                >
                  <span>{group.group}</span>
                  <FiChevronDown
                    size={14}
                    className={`${styles.navGroupChevron} ${
                      isOpen ? styles.navGroupChevronOpen : ""
                    }`}
                  />
                </button>

                {/* ── Items (collapsible) ── */}
                {isOpen && (
                  <div className={styles.navGroupItems}>
                    {group.items.map((item) => {
                      const isActive = isNavActive(
                        item.path,
                        location.pathname,
                      );
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          ref={isActive ? activeItemRef : null}
                          className={`${styles.navItem} ${
                            isActive ? styles.active : ""
                          }`}
                          onClick={closeSidebar}
                        >
                          <span className={styles.navIcon}>
                            <item.icon size={18} />
                          </span>
                          {item.label}
                          {item.badge === "unread" && unreadCount > 0 && (
                            <span className={styles.navBadge}>
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                          {item.badge === "message" &&
                            unreadMessageCount > 0 && (
                              <span className={styles.navBadge}>
                                {unreadMessageCount > 99
                                  ? "99+"
                                  : unreadMessageCount}
                              </span>
                            )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.availToggle}>
            <span className={styles.availLabel}>
              {loadingAvailability
                ? "⏳ Loading..."
                : available
                  ? "🟢 Available"
                  : "⚫ Offline"}
            </span>
            <button
              className={`${styles.toggle} ${available ? styles.on : ""}`}
              onClick={() => setAvailable((v) => !v)}
              disabled={loadingAvailability}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={() => setShowLogoutModal(true)}
          >
            <span className={styles.navIcon}>
              <FiLogOut size={18} />
            </span>
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
              <FiMenu size={20} />
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
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className={styles.bellBadge}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <Link
              to="/messages"
              className={styles.headerIconBtn}
              style={{ position: "relative" }}
            >
              <FiMail size={18} />
              {unreadMessageCount > 0 && (
                <span className={styles.bellBadge}>
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
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
