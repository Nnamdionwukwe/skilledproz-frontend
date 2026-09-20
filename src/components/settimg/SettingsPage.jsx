// src/pages/Settings/SettingsPage.jsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../context/ThemeContext";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import styles from "./SettingsPage.module.css";
import {
  useCurrency,
  CURRENCY_META,
  ALL_CURRENCIES,
} from "../../context/CurrencyContext";
import {
  FiUser,
  FiBriefcase,
  FiDollarSign,
  FiRefreshCw,
  FiSun,
  FiMoon,
  FiMonitor,
  FiBell,
  FiLock,
  FiShield,
  FiBarChart2,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiCamera,
  FiInfo,
  FiCheck,
  FiCreditCard,
  FiGlobe,
  FiKey,
  FiTag,
  FiFileText,
  FiClipboard,
  FiStar,
  FiTrendingUp,
  FiSmartphone,
  FiMessageCircle,
  FiShieldOff,
  FiSearch,
  FiMapPin,
  FiAlertCircle,
  FiPauseCircle,
  FiTrash2,
} from "react-icons/fi";

const ALL_LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" },
  { code: "hy", name: "Armenian" },
  { code: "az", name: "Azerbaijani" },
  { code: "eu", name: "Basque" },
  { code: "be", name: "Belarusian" },
  { code: "bn", name: "Bengali" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "et", name: "Estonian" },
  { code: "tl", name: "Filipino" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "ht", name: "Haitian Creole" },
  { code: "ha", name: "Hausa" },
  { code: "iw", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "ig", name: "Igbo" },
  { code: "id", name: "Indonesian" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "kn", name: "Kannada" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "ko", name: "Korean" },
  { code: "ky", name: "Kyrgyz" },
  { code: "lo", name: "Lao" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "mk", name: "Macedonian" },
  { code: "ms", name: "Malay" },
  { code: "ml", name: "Malayalam" },
  { code: "mt", name: "Maltese" },
  { code: "mi", name: "Maori" },
  { code: "mr", name: "Marathi" },
  { code: "mn", name: "Mongolian" },
  { code: "my", name: "Myanmar (Burmese)" },
  { code: "ne", name: "Nepali" },
  { code: "no", name: "Norwegian" },
  { code: "fa", name: "Persian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "pa", name: "Punjabi" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sm", name: "Samoan" },
  { code: "sr", name: "Serbian" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "es", name: "Spanish" },
  { code: "sw", name: "Swahili" },
  { code: "sv", name: "Swedish" },
  { code: "tg", name: "Tajik" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "uz", name: "Uzbek" },
  { code: "vi", name: "Vietnamese" },
  { code: "cy", name: "Welsh" },
  { code: "xh", name: "Xhosa" },
  { code: "yo", name: "Yoruba" },
  { code: "zu", name: "Zulu" },
];

// Currencies accepted by Flutterwave (verified from official support docs)
const CURRENCIES = [
  // International
  "USD", // United States Dollar
  "EUR", // Euro
  "GBP", // British Pound Sterling
  "CAD", // Canadian Dollar

  // African
  "NGN", // Nigerian Naira
  "GHS", // Ghanaian Cedi
  "KES", // Kenyan Shilling
  "ZAR", // South African Rand
  "TZS", // Tanzanian Shilling
  "UGX", // Ugandan Shilling
  "RWF", // Rwandan Franc
  "XOF", // West African CFA Franc BCEAO
  "XAF", // Central African CFA Franc
  "EGP", // Egyptian Pound
  "MWK", // Malawian Kwacha
  "MAD", // Moroccan Dirham
  "ZMW", // Zambian Kwacha
  "SLL", // Sierra Leonean Leone

  // Additional supported currencies
  "CLP", // Chilean Peso
  "COP", // Colombian Peso
  "GNF", // Guinean Franc
  "STD", // São Tomé & Príncipe Dobra
];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"];
const DURATION_UNITS = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "custom", label: "Custom" },
];

const TABS_WORKER = [
  { id: "profile", icon: FiUser, label: "Profile" },
  { id: "work", icon: FiBriefcase, label: "Work Profile" },
  { id: "pricing", icon: FiDollarSign, label: "Pricing" },
  { id: "currencies", icon: FiRefreshCw, label: "Currencies" },
  { id: "appearance", icon: FiSun, label: "Appearance" },
  { id: "notifications", icon: FiBell, label: "Notifications" },
  { id: "privacy", icon: FiLock, label: "Privacy" },
  { id: "security", icon: FiShield, label: "Security" },
  { id: "activity", icon: FiBarChart2, label: "Activity" },
];

const TABS_HIRER = [
  { id: "profile", icon: FiUser, label: "Profile" },
  { id: "company", icon: FiBriefcase, label: "Company" },
  { id: "hiring", icon: FiClipboard, label: "Hiring Prefs" },
  { id: "currencies", icon: FiRefreshCw, label: "Currencies" },
  { id: "appearance", icon: FiSun, label: "Appearance" },
  { id: "notifications", icon: FiBell, label: "Notifications" },
  { id: "privacy", icon: FiLock, label: "Privacy" },
  { id: "security", icon: FiShield, label: "Security" },
  { id: "activity", icon: FiBarChart2, label: "Activity" },
];

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { theme, language, changeTheme, changeLanguage } = useTheme();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const isWorker = user?.role === "WORKER";
  const TABS = isWorker ? TABS_WORKER : TABS_HIRER;
  const {
    dashboardCurrency,
    paymentCurrency,
    changeDashboardCurrency,
    changePaymentCurrency,
  } = useCurrency();

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState("");

  // Deactivation state (both flows)
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deactivationCheck, setDeactivationCheck] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const fileRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load profile on mount ──────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/settings/profile")
      .then((res) => {
        const u = res.data.data.user;
        setProfile(u);
        setForm({
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          bio: u.bio || "",
          phone: u.phone || "",
          country: u.country || "",
          city: u.city || "",
          state: u.state || "",
          address: u.address || "",
          currency: u.currency || "USD",
          gender: u.gender || "",
        });
        setHiringPrefs({
          defaultEstimatedUnit: u.defaultEstUnit || "hours",
          defaultEstimatedValue: u.defaultEstValue || "",
        });
        setNotifs({
          notifBookings: u.notifBookings ?? true,
          notifMessages: u.notifMessages ?? true,
          notifPayments: u.notifPayments ?? true,
          notifReviews: u.notifReviews ?? true,
          notifMarketing: u.notifMarketing ?? false,
        });
        setPrivacy({
          profileVisible: u.profileVisible ?? true,
          showPhone: u.showPhone ?? false,
          showLocation: u.showLocation ?? true,
          showEmail: u.showEmail ?? false,
          showGender: u.showGender ?? false,
        });
        if (u.workerProfile) {
          const wp = u.workerProfile;
          setWorkForm({
            title: wp.title || "",
            description: wp.description || "",
            yearsExperience: wp.yearsExperience || "",
            serviceRadius: wp.serviceRadius || "25",
            isAvailable: wp.isAvailable ?? true,
          });
          setPricing({
            hourlyRate: wp.hourlyRate || "",
            dailyRate: wp.dailyRate || "",
            weeklyRate: wp.weeklyRate || "",
            monthlyRate: wp.monthlyRate || "",
            yearlyRate: wp.yearlyRate || "",
            customRate: wp.customRate || "",
            customRateLabel: wp.customRateLabel || "",
            pricingNote: wp.pricingNote || "",
            currency: wp.currency || "USD",
          });
        }
        if (u.hirerProfile) {
          setCompanyForm({
            companyName: u.hirerProfile.companyName || "",
            companySize: u.hirerProfile.companySize || "",
            website: u.hirerProfile.website || "",
          });
        }
        updateUser?.(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Refetch deactivation check whenever Security tab opens ─────────────
  useEffect(() => {
    if (tab === "security") {
      refreshCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Activity + Security prefetch ───────────────────────────────────────
  useEffect(() => {
    if (tab === "activity" && !activity) {
      api
        .get("/settings/activity")
        .then((r) => setActivity(r.data.data))
        .catch(() => {});
    }
    if (tab === "security" && !security) {
      api
        .get("/settings/security")
        .then((r) => setSecurity(r.data.data))
        .catch(() => {});
    }
    // ✅ Only workers have a withdrawal PIN — skip for hirers
    if (tab === "security" && isWorker && pinStatus === null) {
      api
        .get("/payments/pin/status")
        .then((r) => setPinStatus(r.data.data))
        .catch(() => {});
    }
  }, [tab, isWorker]);

  async function refreshCheck() {
    setCheckLoading(true);
    try {
      const r = await api.get("/settings/deactivation-check");
      setDeactivationCheck(r.data.data);
      return r.data.data;
    } catch {
      setDeactivationCheck({
        canPause: true,
        canDelete: true,
        blockers: [],
        currentState: { isPaused: false, deletionScheduledAt: null },
      });
      return null;
    } finally {
      setCheckLoading(false);
    }
  }

  async function openPauseFlow() {
    setCheckLoading(true);
    const data = await refreshCheck();
    setCheckLoading(false);

    if (!data) {
      showToast("Could not check your account status", "error");
      return;
    }
    if (!data.canPause) {
      setShowBlockerModal(true);
      return;
    }
    setShowPauseModal(true);
  }

  async function openDeleteFlow() {
    setCheckLoading(true);
    const data = await refreshCheck();
    setCheckLoading(false);

    if (!data) {
      showToast("Could not check your account status", "error");
      return;
    }
    if (!data.canDelete) {
      setShowBlockerModal(true);
      return;
    }
    setShowDeleteModal(true);
  }

  async function confirmPause() {
    if (!deletePassword) {
      showToast("Please enter your password", "error");
      return;
    }
    setSaving("pause");
    try {
      await api.post("/settings/pause", { password: deletePassword });
      showToast("Account paused. Log back in any time to reactivate.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to pause account",
        "error",
      );
      setSaving("");
    }
  }

  async function confirmDeleteAccount() {
    if (!deletePassword) {
      showToast("Please enter your password", "error");
      return;
    }
    if (deleteConfirmText !== "DELETE") {
      showToast('Please type "DELETE" to confirm', "error");
      return;
    }
    setSaving("delete");
    try {
      await api.delete("/settings/account", {
        data: {
          password: deletePassword,
          reason: deleteReason || undefined,
          confirmDelete: "DELETE",
        },
      });
      showToast("Account scheduled for deletion. Redirecting…");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      const status = err.response?.status;
      showToast(
        err.response?.data?.message || "Failed to delete account",
        "error",
      );
      if (status === 409) {
        await refreshCheck();
        setShowBlockerModal(true);
      }
      setSaving("");
    }
  }

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
    phone: user?.phone || "",
    country: user?.country || "",
    city: user?.city || "",
    state: user?.state || "",
    address: user?.address || "",
    currency: user?.currency || "USD",
    gender: user?.gender || "",
  });

  const [notifs, setNotifs] = useState({
    notifBookings: user?.notifBookings ?? true,
    notifMessages: user?.notifMessages ?? true,
    notifPayments: user?.notifPayments ?? true,
    notifReviews: user?.notifReviews ?? true,
    notifMarketing: user?.notifMarketing ?? false,
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: user?.profileVisible ?? true,
    showPhone: user?.showPhone ?? false,
    showLocation: user?.showLocation ?? true,
    showEmail: user?.showEmail ?? false,
    showGender: user?.showGender ?? false,
  });

  const [pricing, setPricing] = useState({
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    yearlyRate: "",
    customRate: "",
    customRateLabel: "",
    pricingNote: "",
    currency: "USD",
  });

  const [workForm, setWorkForm] = useState({
    title: "",
    description: "",
    yearsExperience: "",
    serviceRadius: "25",
    isAvailable: true,
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companySize: "",
    website: "",
  });

  const [hiringPrefs, setHiringPrefs] = useState({
    defaultEstimatedUnit: user?.defaultEstUnit || "hours",
    defaultEstimatedValue: user?.defaultEstValue || "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const [pin, setPin] = useState({ new: "", confirm: "", current: "" });
  const [pinStatus, setPinStatus] = useState(null);
  const [pinError, setPinError] = useState("");

  const [activity, setActivity] = useState(null);
  const [security, setSecurity] = useState(null);

  async function saveProfile() {
    setSaving("profile");
    try {
      const res = await api.patch("/settings/profile", form);
      const updated = res.data.data.user;
      setProfile((p) => ({ ...p, ...updated }));
      updateUser?.(updated);
      showToast("Profile saved");
    } catch (e) {
      showToast(e.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function saveHiringPrefs() {
    setSaving("hiring");
    try {
      await api.patch("/settings/profile", {
        defaultEstUnit: hiringPrefs.defaultEstimatedUnit,
        defaultEstValue: hiringPrefs.defaultEstimatedValue || null,
      });
      updateUser?.({
        defaultEstUnit: hiringPrefs.defaultEstimatedUnit,
        defaultEstValue: hiringPrefs.defaultEstimatedValue,
      });
      showToast("Hiring preferences saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast(
        "Image is larger than 5MB. Please choose a smaller photo.",
        "error",
      );
      e.target.value = "";
      return;
    }

    const fd = new FormData();
    fd.append("avatar", file);
    setSaving("avatar");
    try {
      const res = await api.post("/settings/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newAvatar = res.data.data.avatar;
      setProfile((p) => ({ ...p, avatar: newAvatar }));
      updateUser?.({ avatar: newAvatar });
      showToast("Photo updated");
    } catch (e) {
      showToast(e.response?.data?.message || "Upload failed", "error");
    } finally {
      setSaving("");
      e.target.value = "";
    }
  }

  async function saveWorkProfile() {
    setSaving("work");
    try {
      await api.patch("/settings/worker-profile", workForm);
      showToast("Work profile saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function savePricing() {
    setSaving("pricing");
    try {
      await api.patch("/settings/worker-profile", pricing);
      showToast("Pricing saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function saveCompany() {
    setSaving("company");
    try {
      await api.patch("/settings/hirer-profile", companyForm);
      showToast("Company profile saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function savePassword() {
    if (pw.next !== pw.confirm) {
      setPwError("Passwords do not match");
      return;
    }
    if (pw.next.length < 8) {
      setPwError("Min 8 characters");
      return;
    }
    setPwError("");
    setSaving("password");
    try {
      await api.patch("/settings/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPw({ current: "", next: "", confirm: "" });
      showToast("Password updated");
    } catch (e) {
      showToast(e.response?.data?.message || "Failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function setPins() {
    if (pin.new !== pin.confirm) {
      setPinError("PINs do not match");
      return;
    }
    if (!/^\d{4}$/.test(pin.new)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    setPinError("");
    setSaving("pin");
    try {
      await api.post("/payments/pin/set", { pin: pin.new });
      setPinStatus((p) => ({ ...p, pinSet: true }));
      setPin({ new: "", confirm: "", current: "" });
      showToast("Withdrawal PIN set");
    } catch (e) {
      setPinError(e.response?.data?.message || "Failed to set PIN");
    } finally {
      setSaving("");
    }
  }

  async function changePin() {
    if (pin.new !== pin.confirm) {
      setPinError("New PINs do not match");
      return;
    }
    if (!/^\d{4}$/.test(pin.new)) {
      setPinError("New PIN must be exactly 4 digits");
      return;
    }
    if (!pin.current) {
      setPinError("Current PIN is required");
      return;
    }
    setPinError("");
    setSaving("pin");
    try {
      await api.post("/payments/pin/change", {
        currentPin: pin.current,
        newPin: pin.new,
      });
      setPin({ new: "", confirm: "", current: "" });
      showToast("Withdrawal PIN changed");
    } catch (e) {
      setPinError(e.response?.data?.message || "Failed to change PIN");
    } finally {
      setSaving("");
    }
  }

  async function saveNotifs() {
    setSaving("notifs");
    try {
      await api.patch("/settings/notifications", notifs);
      updateUser?.(notifs);
      showToast("Notifications saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function savePrivacy() {
    setSaving("privacy");
    try {
      await api.patch("/settings/privacy", privacy);
      updateUser?.(privacy);
      showToast("Privacy saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  return (
    <Layout>
      <div className={styles.page}>
        {toast && (
          <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
            {toast.type === "success" ? (
              <FiCheckCircle size={14} />
            ) : (
              <FiAlertTriangle size={14} />
            )}
            {toast.msg}
          </div>
        )}

        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSub}>
            Manage your account, preferences, and platform settings
          </p>
        </div>

        <div className={styles.layout}>
          {/* ── Tab nav ── */}
          <nav className={styles.nav}>
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={`${styles.navBtn} ${tab === t.id ? styles.navBtnActive : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className={styles.navIcon}>
                    <Icon size={16} />
                  </span>
                  <span className={styles.navLabel}>{t.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={styles.content}>
            {/* ── PROFILE ── */}
            {tab === "profile" && (
              <Card
                title="Profile Information"
                icon={<FiUser size={20} />}
                desc="Your personal details visible to others"
              >
                <div className={styles.avatarBlock}>
                  <div
                    className={styles.avatarCircle}
                    onClick={() => fileRef.current?.click()}
                  >
                    {profile?.avatar || user?.avatar ? (
                      <img
                        src={profile?.avatar || user?.avatar}
                        alt=""
                        className={styles.avatarImg}
                      />
                    ) : (
                      <span className={styles.avatarInitials}>
                        {(profile?.firstName || user?.firstName)?.[0]}
                        {(profile?.lastName || user?.lastName)?.[0]}
                      </span>
                    )}
                    <div className={styles.avatarOverlay}>
                      {saving === "avatar" ? (
                        <span className={styles.spinner} />
                      ) : (
                        <FiCamera size={20} />
                      )}
                    </div>
                  </div>
                  <div className={styles.avatarMeta}>
                    <p className={styles.avatarName}>
                      {profile?.firstName || user?.firstName}{" "}
                      {profile?.lastName || user?.lastName}
                    </p>
                    <p className={styles.avatarRole}>{user?.role}</p>
                    <button
                      className={styles.avatarBtn}
                      onClick={() => fileRef.current?.click()}
                      disabled={saving === "avatar"}
                    >
                      {saving === "avatar" ? "Uploading..." : "Change Photo"}
                    </button>
                    <p className={styles.avatarHint}>
                      JPG, PNG or WebP · max 5MB
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </div>

                <Grid>
                  <FI
                    label="First Name"
                    value={form.firstName}
                    onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                  />
                  <FI
                    label="Last Name"
                    value={form.lastName}
                    onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                  />
                  <FI
                    label="Phone"
                    value={form.phone}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                    type="tel"
                    full
                  />
                  <FI
                    label="Bio"
                    value={form.bio}
                    onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
                    multiline
                    full
                  />
                  <FI
                    label="Country"
                    value={form.country}
                    onChange={(v) => setForm((f) => ({ ...f, country: v }))}
                    placeholder="e.g. Nigeria"
                  />
                  <FI
                    label="State"
                    value={form.state}
                    onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                    placeholder="e.g. Lagos State"
                  />
                  <FI
                    label="City"
                    value={form.city}
                    onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                    placeholder="e.g. Lagos"
                  />
                  <FI
                    label="Address"
                    value={form.address}
                    onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                    placeholder="Street address"
                  />
                </Grid>

                <Row>
                  <SF
                    label="Currency"
                    value={form.currency}
                    onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                  <SF
                    label="Gender"
                    value={form.gender}
                    onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                    options={[
                      { value: "", label: "Prefer not to say" },
                      ...GENDERS.map((g) => ({ value: g, label: g })),
                    ]}
                  />
                </Row>

                <SaveBtn
                  label="Save Profile"
                  loading={saving === "profile"}
                  onClick={saveProfile}
                />
              </Card>
            )}

            {/* ── WORKER WORK PROFILE ── */}
            {tab === "work" && isWorker && (
              <Card
                title="Work Profile"
                icon={<FiBriefcase size={20} />}
                desc="Professional details hirers see on your profile"
              >
                <FI
                  label="Professional Title"
                  value={workForm.title}
                  onChange={(v) => setWorkForm((f) => ({ ...f, title: v }))}
                  placeholder="e.g. Certified Electrician"
                />
                <FI
                  label="Description"
                  value={workForm.description}
                  onChange={(v) =>
                    setWorkForm((f) => ({ ...f, description: v }))
                  }
                  multiline
                  full
                  placeholder="Describe your skills, experience, and specializations..."
                />
                <Row>
                  <FI
                    label="Years of Experience"
                    value={workForm.yearsExperience}
                    type="number"
                    onChange={(v) =>
                      setWorkForm((f) => ({ ...f, yearsExperience: v }))
                    }
                    placeholder="0"
                  />
                  <FI
                    label="Service Radius (km)"
                    value={workForm.serviceRadius}
                    type="number"
                    onChange={(v) =>
                      setWorkForm((f) => ({ ...f, serviceRadius: v }))
                    }
                    placeholder="25"
                  />
                </Row>
                <Toggle
                  label="Available for Bookings"
                  desc="Turn off to pause new booking requests"
                  checked={workForm.isAvailable}
                  onChange={(v) =>
                    setWorkForm((f) => ({ ...f, isAvailable: v }))
                  }
                />
                <SaveBtn
                  label="Save Work Profile"
                  loading={saving === "work"}
                  onClick={saveWorkProfile}
                />
              </Card>
            )}

            {/* ── WORKER PRICING ── */}
            {tab === "pricing" && isWorker && (
              <Card
                title="Pricing"
                icon={<FiDollarSign size={20} />}
                desc="Set your rates for different engagement types"
              >
                <p className={styles.sectionNote}>
                  Set rates for each duration type. Leave blank to hide that
                  option from your profile.
                </p>

                <SF
                  label="Pricing Currency"
                  value={pricing.currency}
                  onChange={(v) => setPricing((p) => ({ ...p, currency: v }))}
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                />

                <div className={styles.pricingGrid}>
                  <PriceField
                    label="Hourly Rate"
                    suffix="/hr"
                    value={pricing.hourlyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, hourlyRate: v }))
                    }
                  />
                  <PriceField
                    label="Daily Rate"
                    suffix="/day"
                    value={pricing.dailyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, dailyRate: v }))
                    }
                  />
                  <PriceField
                    label="Weekly Rate"
                    suffix="/wk"
                    value={pricing.weeklyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, weeklyRate: v }))
                    }
                  />
                  <PriceField
                    label="Monthly Rate"
                    suffix="/mo"
                    value={pricing.monthlyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, monthlyRate: v }))
                    }
                  />
                  <PriceField
                    label="Yearly Rate"
                    suffix="/yr"
                    value={pricing.yearlyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, yearlyRate: v }))
                    }
                  />
                </div>

                <Divider label="Custom Rate" />
                <Row>
                  <FI
                    label="Custom Rate Amount"
                    value={pricing.customRate}
                    type="number"
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, customRate: v }))
                    }
                    placeholder="0.00"
                  />
                  <FI
                    label="Custom Label"
                    value={pricing.customRateLabel}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, customRateLabel: v }))
                    }
                    placeholder="e.g. per project, per sqm"
                  />
                </Row>

                <FI
                  label="Pricing Notes (optional)"
                  value={pricing.pricingNote}
                  multiline
                  full
                  onChange={(v) =>
                    setPricing((p) => ({ ...p, pricingNote: v }))
                  }
                  placeholder="Any additional pricing details, discounts, or terms..."
                />

                <SaveBtn
                  label="Save Pricing"
                  loading={saving === "pricing"}
                  onClick={savePricing}
                />
              </Card>
            )}

            {/* ── CURRENCIES ── */}
            {tab === "currencies" && (
              <>
                <Card
                  title="Currency Settings"
                  icon={<FiRefreshCw size={20} />}
                  desc="Control how currencies appear across the platform"
                >
                  <div className={styles.infoBox}>
                    <FiInfo size={14} />
                    <span>
                      SkilledProz supports multi-currency. Each setting serves a
                      different purpose — set them independently for the best
                      experience.
                    </span>
                  </div>

                  <Section
                    label="Dashboard Display Currency"
                    labelIcon={<FiBarChart2 size={13} />}
                  >
                    <p className={styles.sectionNote}>
                      The currency your dashboard stats, earnings totals, and
                      summaries are displayed in. This is a display preference
                      only — it does not change actual transaction amounts.
                    </p>
                    <div className={styles.currencyPickerRow}>
                      <select
                        className={styles.currencySelect}
                        value={dashboardCurrency}
                        onChange={(e) =>
                          changeDashboardCurrency(e.target.value)
                        }
                      >
                        {ALL_CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {CURRENCY_META[c]?.symbol} {c} —{" "}
                            {CURRENCY_META[c]?.name}
                          </option>
                        ))}
                      </select>
                      <div className={styles.currencyPreview}>
                        <span className={styles.currencyPreviewSymbol}>
                          {CURRENCY_META[dashboardCurrency]?.symbol}
                        </span>
                        <span className={styles.currencyPreviewName}>
                          {CURRENCY_META[dashboardCurrency]?.name}
                        </span>
                      </div>
                    </div>
                  </Section>

                  <Divider />

                  <Section
                    label={isWorker ? "Payout Currency" : "Payment Currency"}
                    labelIcon={<FiCreditCard size={13} />}
                  >
                    <p className={styles.sectionNote}>
                      {isWorker
                        ? "The currency you receive payments in. Workers are paid in this currency when a job is completed."
                        : "The default currency you use to pay for bookings. You can change this per booking at checkout."}
                    </p>
                    <div className={styles.currencyPickerRow}>
                      <select
                        className={styles.currencySelect}
                        value={paymentCurrency}
                        onChange={(e) => changePaymentCurrency(e.target.value)}
                      >
                        {ALL_CURRENCIES.filter(
                          (c) => !["USDC", "USDT"].includes(c) || isWorker,
                        ).map((c) => (
                          <option key={c} value={c}>
                            {CURRENCY_META[c]?.symbol} {c} —{" "}
                            {CURRENCY_META[c]?.name}
                          </option>
                        ))}
                      </select>
                      <div className={styles.currencyPreview}>
                        <span className={styles.currencyPreviewSymbol}>
                          {CURRENCY_META[paymentCurrency]?.symbol}
                        </span>
                        <span className={styles.currencyPreviewName}>
                          {CURRENCY_META[paymentCurrency]?.name}
                        </span>
                      </div>
                    </div>
                  </Section>

                  {isWorker && (
                    <>
                      <Divider />
                      <Section
                        label="Profile Rate Currency"
                        labelIcon={<FiTag size={13} />}
                      >
                        <p className={styles.sectionNote}>
                          The currency displayed on your profile cards and
                          search results — what hirers see your rates quoted in.
                          Set this to your local currency to attract local
                          clients.
                        </p>
                        <div className={styles.currencyPickerRow}>
                          <select
                            className={styles.currencySelect}
                            value={pricing.currency || "USD"}
                            onChange={(e) =>
                              setPricing((p) => ({
                                ...p,
                                currency: e.target.value,
                              }))
                            }
                          >
                            {ALL_CURRENCIES.filter(
                              (c) => !["USDC", "USDT"].includes(c),
                            ).map((c) => (
                              <option key={c} value={c}>
                                {CURRENCY_META[c]?.symbol} {c} —{" "}
                                {CURRENCY_META[c]?.name}
                              </option>
                            ))}
                          </select>
                          <div className={styles.currencyPreview}>
                            <span className={styles.currencyPreviewSymbol}>
                              {CURRENCY_META[pricing.currency || "USD"]?.symbol}
                            </span>
                            <span className={styles.currencyPreviewName}>
                              {CURRENCY_META[pricing.currency || "USD"]?.name}
                            </span>
                          </div>
                        </div>
                        <SaveBtn
                          label="Save Profile Currency"
                          loading={saving === "pricing"}
                          onClick={async () => {
                            setSaving("pricing");
                            try {
                              await api.patch("/settings/worker-profile", {
                                currency: pricing.currency,
                              });
                              showToast("Profile currency saved");
                            } catch {
                              showToast("Save failed", "error");
                            } finally {
                              setSaving("");
                            }
                          }}
                        />
                      </Section>
                    </>
                  )}
                </Card>

                <Card
                  title="Currency Summary"
                  icon={<FiFileText size={20} />}
                  desc="How your currencies are configured"
                >
                  <div className={styles.currencySummaryGrid}>
                    <CurrencySummaryItem
                      icon={<FiBarChart2 size={20} />}
                      label="Dashboard shows stats in"
                      value={`${CURRENCY_META[dashboardCurrency]?.symbol} ${dashboardCurrency}`}
                      hint="Change anytime — display only"
                    />
                    <CurrencySummaryItem
                      icon={<FiCreditCard size={20} />}
                      label={
                        isWorker ? "You receive payments in" : "You pay in"
                      }
                      value={`${CURRENCY_META[paymentCurrency]?.symbol} ${paymentCurrency}`}
                      hint="Used for actual transactions"
                    />
                    {isWorker && (
                      <CurrencySummaryItem
                        icon={<FiTag size={20} />}
                        label="Your profile rates shown in"
                        value={`${CURRENCY_META[pricing.currency || "USD"]?.symbol} ${pricing.currency || "USD"}`}
                        hint="Displayed to hirers searching"
                      />
                    )}
                  </div>
                </Card>
              </>
            )}

            {/* ── HIRER COMPANY ── */}
            {tab === "company" && !isWorker && (
              <Card
                title="Company Profile"
                icon={<FiBriefcase size={20} />}
                desc="Company information visible to workers you hire"
              >
                <FI
                  label="Company Name"
                  value={companyForm.companyName}
                  onChange={(v) =>
                    setCompanyForm((f) => ({ ...f, companyName: v }))
                  }
                  placeholder="Acme Corp"
                />
                <SF
                  label="Company Size"
                  value={companyForm.companySize}
                  onChange={(v) =>
                    setCompanyForm((f) => ({ ...f, companySize: v }))
                  }
                  options={[
                    { value: "", label: "Select size" },
                    ...COMPANY_SIZES.map((s) => ({
                      value: s,
                      label: s + " employees",
                    })),
                  ]}
                />
                <FI
                  label="Website"
                  value={companyForm.website}
                  type="url"
                  onChange={(v) =>
                    setCompanyForm((f) => ({ ...f, website: v }))
                  }
                  placeholder="https://yourcompany.com"
                />
                <SaveBtn
                  label="Save Company Profile"
                  loading={saving === "company"}
                  onClick={saveCompany}
                />
              </Card>
            )}

            {/* ── HIRER HIRING PREFS ── */}
            {tab === "hiring" && !isWorker && (
              <Card
                title="Hiring Preferences"
                icon={<FiClipboard size={20} />}
                desc="Default settings when creating bookings"
              >
                <p className={styles.sectionNote}>
                  Choose your default estimated duration format when creating
                  new bookings.
                </p>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Default Estimated Duration Unit
                  </label>
                  <div className={styles.unitGrid}>
                    {DURATION_UNITS.map((u) => (
                      <button
                        key={u.value}
                        className={`${styles.unitBtn} ${hiringPrefs.defaultEstimatedUnit === u.value ? styles.unitBtnActive : ""}`}
                        onClick={() =>
                          setHiringPrefs((p) => ({
                            ...p,
                            defaultEstimatedUnit: u.value,
                          }))
                        }
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hiringPrefs.defaultEstimatedUnit !== "" && (
                  <FI
                    label={`Default Estimated Value (${hiringPrefs.defaultEstimatedUnit === "custom" ? "describe" : hiringPrefs.defaultEstimatedUnit})`}
                    value={hiringPrefs.defaultEstimatedValue}
                    onChange={(v) =>
                      setHiringPrefs((p) => ({
                        ...p,
                        defaultEstimatedValue: v,
                      }))
                    }
                    placeholder={
                      hiringPrefs.defaultEstimatedUnit === "custom"
                        ? "e.g. 2 weeks + weekend"
                        : "e.g. 8"
                    }
                    type={
                      hiringPrefs.defaultEstimatedUnit === "custom"
                        ? "text"
                        : "number"
                    }
                  />
                )}

                <div className={styles.infoBox}>
                  <FiInfo size={14} />
                  <span>
                    These are defaults only — you can always change duration per
                    booking when creating it.
                  </span>
                </div>

                <SaveBtn
                  label="Save Hiring Preferences"
                  loading={saving === "hiring"}
                  onClick={saveHiringPrefs}
                />
              </Card>
            )}

            {/* ── APPEARANCE ── */}
            {tab === "appearance" && (
              <Card
                title="Appearance"
                icon={<FiSun size={20} />}
                desc="Theme and language preferences"
              >
                <Section label="Theme" labelIcon={<FiMoon size={13} />}>
                  <p className={styles.sectionNote}>
                    Choose how SkilledProz looks on your device.
                  </p>
                  <div className={styles.themeGrid}>
                    {[
                      { id: "light", icon: FiSun, label: "Light" },
                      { id: "dark", icon: FiMoon, label: "Dark" },
                      { id: "system", icon: FiMonitor, label: "System" },
                    ].map((t) => {
                      const ThemeIcon = t.icon;
                      return (
                        <button
                          key={t.id}
                          className={`${styles.themeCard} ${theme === t.id ? styles.themeCardActive : ""}`}
                          onClick={() => changeTheme(t.id)}
                        >
                          <span className={styles.themeIcon}>
                            <ThemeIcon size={20} />
                          </span>
                          <span className={styles.themeLabel}>{t.label}</span>
                          {theme === t.id && (
                            <span className={styles.themeCheck}>
                              <FiCheck size={12} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section label="Language" labelIcon={<FiGlobe size={13} />}>
                  <p className={styles.sectionNote} translate="no">
                    Select your preferred language.
                  </p>
                  <div translate="no" className="notranslate">
                    <LangSelect value={language} onChange={changeLanguage} />
                  </div>
                  <div className={styles.infoBox} translate="no">
                    <FiInfo size={14} />
                    <span>
                      Select <strong>English</strong> to revert back.
                    </span>
                  </div>
                </Section>
              </Card>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === "notifications" && (
              <Card
                title="Notifications"
                icon={<FiBell size={20} />}
                desc="Choose what you get notified about"
              >
                {[
                  {
                    key: "notifBookings",
                    label: "Booking updates",
                    desc: "New bookings, status changes, confirmations",
                    icon: FiClipboard,
                  },
                  {
                    key: "notifMessages",
                    label: "Messages",
                    desc: "New messages from hirers or workers",
                    icon: FiMessageCircle,
                  },
                  {
                    key: "notifPayments",
                    label: "Payment alerts",
                    desc: "Escrow releases, payment confirmations",
                    icon: FiCreditCard,
                  },
                  {
                    key: "notifReviews",
                    label: "Reviews",
                    desc: "New reviews on your profile",
                    icon: FiStar,
                  },
                  {
                    key: "notifMarketing",
                    label: "Product updates",
                    desc: "New features and platform news",
                    icon: FiTrendingUp,
                  },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Toggle
                      key={item.key}
                      label={
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <ItemIcon size={14} />
                          {item.label}
                        </span>
                      }
                      desc={item.desc}
                      checked={notifs[item.key] ?? true}
                      onChange={(v) =>
                        setNotifs((n) => ({ ...n, [item.key]: v }))
                      }
                    />
                  );
                })}
                <SaveBtn
                  label="Save Notification Preferences"
                  loading={saving === "notifs"}
                  onClick={saveNotifs}
                />
              </Card>
            )}

            {/* ── PRIVACY ── */}
            {tab === "privacy" && (
              <Card
                title="Privacy"
                icon={<FiLock size={20} />}
                desc="Control who sees your information"
              >
                <Toggle
                  label="Public Profile"
                  desc="Allow your profile to appear public or private"
                  checked={privacy.profileVisible ?? true}
                  onChange={(v) =>
                    setPrivacy((p) => ({ ...p, profileVisible: v }))
                  }
                />
                <Toggle
                  label="Show Phone Number"
                  desc="Display your phone number to hirers or workers"
                  checked={privacy.showPhone ?? false}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showPhone: v }))}
                />
                <Toggle
                  label="Show Location"
                  desc="Display your city and country on your profile"
                  checked={privacy.showLocation ?? true}
                  onChange={(v) =>
                    setPrivacy((p) => ({ ...p, showLocation: v }))
                  }
                />
                <Toggle
                  label="Show Email Address"
                  desc="Display your email on your public profile"
                  checked={privacy.showEmail ?? false}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showEmail: v }))}
                />
                <Toggle
                  label="Show Gender"
                  desc="Display your gender on your public profile"
                  checked={privacy.showGender ?? false}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showGender: v }))}
                />
                <SaveBtn
                  label="Save Privacy Settings"
                  loading={saving === "privacy"}
                  onClick={savePrivacy}
                />
              </Card>
            )}

            {/* ── SECURITY ── */}
            {tab === "security" && (
              <>
                <Card
                  title="Change Password"
                  icon={<FiKey size={20} />}
                  desc="Keep your account secure"
                >
                  <FI
                    label="Current Password"
                    value={pw.current}
                    type="password"
                    onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                    full
                  />
                  <FI
                    label="New Password (min 8 chars)"
                    value={pw.next}
                    type="password"
                    onChange={(v) => setPw((p) => ({ ...p, next: v }))}
                    full
                  />
                  <FI
                    label="Confirm New Password"
                    value={pw.confirm}
                    type="password"
                    onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                    full
                  />
                  {pwError && <p className={styles.fieldErr}>{pwError}</p>}
                  <SaveBtn
                    label="Update Password"
                    loading={saving === "password"}
                    onClick={savePassword}
                  />
                </Card>

                {isWorker && (
                  <Card
                    title="Withdrawal PIN"
                    icon={<FiLock size={20} />}
                    desc="4-digit PIN required to authorise every withdrawal"
                  >
                    {pinStatus === null ? (
                      <Skeleton />
                    ) : (
                      <>
                        <div className={styles.pinStatusRow}>
                          {pinStatus.pinSet ? (
                            <div
                              className={styles.pinStatusBadge}
                              style={{
                                background: "var(--green-dim)",
                                border: "1px solid var(--green)",
                                color: "var(--green)",
                              }}
                            >
                              <FiCheckCircle size={14} /> PIN is set — required
                              for all withdrawals
                            </div>
                          ) : (
                            <div
                              className={styles.pinStatusBadge}
                              style={{
                                background: "var(--red-dim)",
                                border: "1px solid var(--red)",
                                color: "var(--red)",
                              }}
                            >
                              <FiAlertTriangle size={14} /> No PIN set — you
                              must set one before withdrawing
                            </div>
                          )}
                          {pinStatus.isLocked && (
                            <div
                              className={styles.pinStatusBadge}
                              style={{
                                background: "rgba(251,191,36,0.12)",
                                border: "1px solid rgba(251,191,36,0.4)",
                                color: "#fbbf24",
                                marginTop: 6,
                              }}
                            >
                              <FiLock size={14} /> PIN locked — too many wrong
                              attempts
                            </div>
                          )}
                          {!pinStatus.isLocked &&
                            pinStatus.pinSet &&
                            pinStatus.attemptsRemaining < 3 && (
                              <p className={styles.pinAttemptsNote}>
                                <FiAlertTriangle size={13} />{" "}
                                {pinStatus.attemptsRemaining} attempt
                                {pinStatus.attemptsRemaining !== 1
                                  ? "s"
                                  : ""}{" "}
                                remaining before lockout
                              </p>
                            )}
                        </div>

                        {!pinStatus.pinSet && (
                          <>
                            <p className={styles.sectionNote}>
                              Set a 4-digit PIN to secure your withdrawals.
                              You'll enter this every time you request a payout.
                            </p>
                            <div className={styles.pinFields}>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  New PIN{" "}
                                  <span style={{ color: "var(--red)" }}>*</span>
                                </label>
                                <input
                                  className={`${styles.input} ${styles.pinInput}`}
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder="••••"
                                  value={pin.new}
                                  onChange={(e) => {
                                    setPin((p) => ({
                                      ...p,
                                      new: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4),
                                    }));
                                    setPinError("");
                                  }}
                                />
                              </div>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  Confirm PIN{" "}
                                  <span style={{ color: "var(--red)" }}>*</span>
                                </label>
                                <input
                                  className={`${styles.input} ${styles.pinInput}`}
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder="••••"
                                  value={pin.confirm}
                                  onChange={(e) => {
                                    setPin((p) => ({
                                      ...p,
                                      confirm: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4),
                                    }));
                                    setPinError("");
                                  }}
                                />
                              </div>
                            </div>
                            {pinError && (
                              <p className={styles.fieldErr}>{pinError}</p>
                            )}
                            <SaveBtn
                              label="Set Withdrawal PIN"
                              loading={saving === "pin"}
                              onClick={setPins}
                            />
                          </>
                        )}

                        {pinStatus.pinSet && (
                          <>
                            <p className={styles.sectionNote}>
                              Enter your current PIN then choose a new one.
                            </p>
                            <div className={styles.pinFields}>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  Current PIN{" "}
                                  <span style={{ color: "var(--red)" }}>*</span>
                                </label>
                                <input
                                  className={`${styles.input} ${styles.pinInput}`}
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder="••••"
                                  value={pin.current}
                                  onChange={(e) => {
                                    setPin((p) => ({
                                      ...p,
                                      current: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4),
                                    }));
                                    setPinError("");
                                  }}
                                />
                              </div>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  New PIN{" "}
                                  <span style={{ color: "var(--red)" }}>*</span>
                                </label>
                                <input
                                  className={`${styles.input} ${styles.pinInput}`}
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder="••••"
                                  value={pin.new}
                                  onChange={(e) => {
                                    setPin((p) => ({
                                      ...p,
                                      new: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4),
                                    }));
                                    setPinError("");
                                  }}
                                />
                              </div>
                              <div className={styles.field}>
                                <label className={styles.label}>
                                  Confirm New PIN{" "}
                                  <span style={{ color: "var(--red)" }}>*</span>
                                </label>
                                <input
                                  className={`${styles.input} ${styles.pinInput}`}
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder="••••"
                                  value={pin.confirm}
                                  onChange={(e) => {
                                    setPin((p) => ({
                                      ...p,
                                      confirm: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4),
                                    }));
                                    setPinError("");
                                  }}
                                />
                              </div>
                            </div>
                            {pinError && (
                              <p className={styles.fieldErr}>{pinError}</p>
                            )}
                            <SaveBtn
                              label="Change PIN"
                              loading={saving === "pin"}
                              onClick={changePin}
                            />
                          </>
                        )}
                      </>
                    )}
                  </Card>
                )}

                <Card
                  title="Account Info"
                  icon={<FiShield size={20} />}
                  desc="Your verification and account status"
                >
                  {security ? (
                    <div className={styles.secRows}>
                      <SecRow label="Email" value={security.email} />
                      <SecRow
                        label="Email Verified"
                        value={
                          security.isEmailVerified ? (
                            <>
                              <FiCheckCircle size={13} /> Verified
                            </>
                          ) : (
                            <>
                              <FiXCircle size={13} /> Not verified
                            </>
                          )
                        }
                      />
                      <SecRow
                        label="Phone Verified"
                        value={
                          security.isPhoneVerified ? (
                            <>
                              <FiCheckCircle size={13} /> Verified
                            </>
                          ) : (
                            <>
                              <FiXCircle size={13} /> Not verified
                            </>
                          )
                        }
                      />
                      <SecRow
                        label="2FA"
                        value={
                          security.twoFactorEnabled ? (
                            <>
                              <FiCheckCircle size={13} /> Enabled
                            </>
                          ) : (
                            <>
                              <FiAlertTriangle size={13} /> Not enabled (coming
                              soon)
                            </>
                          )
                        }
                      />
                      <SecRow
                        label="Member Since"
                        value={
                          security.accountCreated
                            ? new Date(
                                security.accountCreated,
                              ).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "—"
                        }
                      />
                      <SecRow
                        label="Last Seen"
                        value={
                          security.lastSeen
                            ? new Date(security.lastSeen).toLocaleString()
                            : "—"
                        }
                      />
                    </div>
                  ) : (
                    <Skeleton />
                  )}
                </Card>

                <Card
                  title="Account Status"
                  icon={<FiAlertTriangle size={20} />}
                  desc="Pause or permanently delete your account"
                >
                  {/* Current state banner */}
                  {deactivationCheck?.currentState?.deletionScheduledAt && (
                    <div className={styles.stateBannerDanger}>
                      <FiAlertCircle size={14} />
                      <span>
                        Your account is scheduled for permanent deletion on{" "}
                        <strong>
                          {new Date(
                            deactivationCheck.currentState.deletionScheduledAt,
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </strong>
                        . Log in to cancel.
                      </span>
                      <button
                        className={styles.stateBannerBtn}
                        onClick={async () => {
                          try {
                            await api.post("/settings/cancel-deletion");
                            showToast("Deletion cancelled. Welcome back!");
                            setDeactivationCheck(null);
                          } catch {
                            showToast("Failed to cancel deletion", "error");
                          }
                        }}
                      >
                        Cancel deletion
                      </button>
                    </div>
                  )}

                  {deactivationCheck?.currentState?.isPaused &&
                    !deactivationCheck?.currentState?.deletionScheduledAt && (
                      <div className={styles.stateBannerWarning}>
                        <FiPauseCircle size={14} />
                        <span>Your account is currently paused.</span>
                        <button
                          className={styles.stateBannerBtn}
                          onClick={async () => {
                            try {
                              await api.post("/settings/resume");
                              showToast("Account resumed. Welcome back!");
                              setDeactivationCheck(null);
                            } catch {
                              showToast("Failed to resume account", "error");
                            }
                          }}
                        >
                          Resume account
                        </button>
                      </div>
                    )}

                  {/* Blocker notice */}
                  {checkLoading ? (
                    <div className={styles.eligibilityLoading}>
                      <span className={styles.spinnerDark} />
                      <span>Checking your account status…</span>
                    </div>
                  ) : deactivationCheck &&
                    !deactivationCheck.canPause &&
                    deactivationCheck.blockers.length > 0 ? (
                    <div className={styles.blockerNotice}>
                      <div className={styles.blockerNoticeHead}>
                        <FiAlertTriangle size={16} />
                        <span>
                          {deactivationCheck.blockers.length} issue
                          {deactivationCheck.blockers.length === 1
                            ? ""
                            : "s"}{" "}
                          to resolve first
                        </span>
                      </div>
                      <ul className={styles.blockerList}>
                        {deactivationCheck.blockers.slice(0, 3).map((b) => (
                          <li key={b.code}>
                            <strong>{b.label}</strong>
                            <span>{b.hint}</span>
                          </li>
                        ))}
                        {deactivationCheck.blockers.length > 3 && (
                          <li className={styles.blockerMore}>
                            +{deactivationCheck.blockers.length - 3} more…
                          </li>
                        )}
                      </ul>
                      <button
                        type="button"
                        className={styles.blockerSeeAllBtn}
                        onClick={() => setShowBlockerModal(true)}
                      >
                        See all blockers →
                      </button>
                    </div>
                  ) : null}

                  {/* Two options side by side */}
                  <div className={styles.dangerGrid}>
                    {/* Option A — Pause */}
                    <div className={styles.dangerOption}>
                      <div className={styles.dangerOptionHead}>
                        <span className={styles.dangerOptionIcon}>
                          <FiPauseCircle size={20} />
                        </span>
                        <div>
                          <p className={styles.dangerOptionTitle}>
                            Take a break
                          </p>
                          <p className={styles.dangerOptionSub}>
                            Temporary · Reversible
                          </p>
                        </div>
                      </div>
                      <p className={styles.dangerOptionDesc}>
                        Hide your profile and pause new bookings. Your data is
                        saved. Log back in any time to reactivate your account.
                      </p>
                      <button
                        type="button"
                        className={styles.dangerOptionBtn}
                        onClick={openPauseFlow}
                        disabled={saving === "pause" || checkLoading}
                      >
                        {saving === "pause" ? "Pausing…" : "Pause Account"}
                      </button>
                    </div>

                    {/* Option B — Delete */}
                    <div
                      className={`${styles.dangerOption} ${styles.dangerOptionDanger}`}
                    >
                      <div className={styles.dangerOptionHead}>
                        <span
                          className={`${styles.dangerOptionIcon} ${styles.dangerOptionIconRed}`}
                        >
                          <FiTrash2 size={20} />
                        </span>
                        <div>
                          <p className={styles.dangerOptionTitle}>
                            Leave SkilledProz
                          </p>
                          <p className={styles.dangerOptionSub}>
                            Permanent · 30-day grace period
                          </p>
                        </div>
                      </div>
                      <p className={styles.dangerOptionDesc}>
                        Permanently delete your profile, portfolio, and personal
                        data after a 30-day grace period. This cannot be undone
                        once the period ends.
                      </p>
                      <button
                        type="button"
                        className={`${styles.dangerOptionBtn} ${styles.dangerOptionBtnRed}`}
                        onClick={openDeleteFlow}
                        disabled={saving === "delete" || checkLoading}
                      >
                        {saving === "delete" ? "Processing…" : "Delete Account"}
                      </button>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* ── ACTIVITY ── */}
            {tab === "activity" && (
              <Card
                title="Account Activity"
                icon={<FiBarChart2 size={20} />}
                desc="Your recent platform activity"
              >
                {activity ? (
                  <>
                    <div className={styles.statsGrid}>
                      <StatCard
                        icon={<FiBell size={18} />}
                        label="Unread notifications"
                        value={activity.summary.unreadNotifications}
                      />
                      <StatCard
                        icon={<FiClipboard size={18} />}
                        label="Total bookings"
                        value={activity.summary.totalBookings}
                      />
                      <StatCard
                        icon={<FiStar size={18} />}
                        label="Reviews received"
                        value={activity.summary.totalReviews}
                      />
                    </div>
                    <Divider label="Recent Activity" />
                    {activity.recentActivity?.length === 0 ? (
                      <p className={styles.emptyNote}>
                        No recent activity yet.
                      </p>
                    ) : (
                      activity.recentActivity?.map((n) => (
                        <div
                          key={n.id}
                          className={`${styles.actItem} ${!n.isRead ? styles.actItemUnread : ""}`}
                        >
                          <span className={styles.actIcon}>
                            <FiBell size={14} />
                          </span>
                          <div className={styles.actBody}>
                            <p className={styles.actTitle}>{n.title}</p>
                            <p className={styles.actDesc}>{n.body}</p>
                            <p className={styles.actTime}>
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!n.isRead && <span className={styles.actDot} />}
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <Skeleton />
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ── Pause Account Modal ── */}
      {showPauseModal && (
        <div
          className={styles.blockerOverlay}
          onClick={() => setShowPauseModal(false)}
        >
          <div
            className={styles.blockerBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.blockerHeader}>
              <span className={styles.blockerIconWarn}>
                <FiPauseCircle size={22} />
              </span>
              <div>
                <h3 className={styles.blockerTitle}>Pause your account?</h3>
                <p className={styles.blockerSubtitle}>
                  Reversible anytime — just log back in
                </p>
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Password</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className={styles.blockerActions}>
              <button
                className={styles.blockerCancelBtn}
                onClick={() => setShowPauseModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.blockerConfirmBtn}
                onClick={confirmPause}
                disabled={saving === "pause"}
              >
                {saving === "pause" ? "Pausing…" : "Pause Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div
          className={styles.blockerOverlay}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className={styles.blockerBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.blockerHeader}>
              <span className={styles.blockerIconDanger}>
                <FiTrash2 size={22} />
              </span>
              <div>
                <h3 className={styles.blockerTitle}>Delete your account?</h3>
                <p className={styles.blockerSubtitle}>
                  Permanent · 30-day grace period
                </p>
              </div>
            </div>

            <div className={styles.deleteNoticeList}>
              <p>Here&apos;s what happens when you delete:</p>
              <ul>
                <li>Your profile is hidden immediately</li>
                <li>Your data is deleted permanently after 30 days</li>
                <li>
                  Your reviews remain (anonymised as &quot;Former User&quot;)
                </li>
                <li>Transaction records are kept for legal compliance</li>
                <li>Log in within 30 days to cancel</li>
              </ul>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Password</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>
                Why are you leaving? (optional)
              </label>
              <textarea
                className={styles.textarea}
                placeholder="Tell us what went wrong — helps us improve"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                maxLength={300}
                rows={2}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                className={styles.input}
                type="text"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className={styles.blockerActions}>
              <button
                className={styles.blockerCancelBtn}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </button>
              <button
                className={styles.blockerDeleteBtn}
                onClick={confirmDeleteAccount}
                disabled={
                  saving === "delete" ||
                  deleteConfirmText !== "DELETE" ||
                  !deletePassword
                }
              >
                {saving === "delete" ? "Processing…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Blocker Modal ── */}
      {showBlockerModal && deactivationCheck && (
        <div
          className={styles.blockerOverlay}
          onClick={() => setShowBlockerModal(false)}
        >
          <div
            className={styles.blockerBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.blockerHeader}>
              <span className={styles.blockerIconDanger}>
                <FiAlertTriangle size={22} />
              </span>
              <div>
                <h3 className={styles.blockerTitle}>Before you can proceed</h3>
                <p className={styles.blockerSubtitle}>
                  Please resolve these first
                </p>
              </div>
            </div>

            <div className={styles.blockerItems}>
              {deactivationCheck.blockers.map((b) => (
                <div key={b.code} className={styles.blockerItem}>
                  <div className={styles.blockerItemHead}>
                    <span className={styles.blockerCount}>{b.count}</span>
                    <strong>{b.label}</strong>
                  </div>
                  <p className={styles.blockerHint}>{b.hint}</p>
                  {b.route && (
                    <Link
                      to={b.route}
                      className={styles.blockerLink}
                      onClick={() => setShowBlockerModal(false)}
                    >
                      Go fix this →
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.blockerActions}>
              <button
                className={styles.blockerCloseBtn}
                onClick={() => setShowBlockerModal(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Card({ title, icon, desc, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          {desc && <p className={styles.cardDesc}>{desc}</p>}
        </div>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

function CurrencySummaryItem({ icon, label, value, hint }) {
  return (
    <div className={styles.currencySummaryItem}>
      <span className={styles.currencySummaryIcon}>{icon}</span>
      <div>
        <p className={styles.currencySummaryLabel}>{label}</p>
        <p className={styles.currencySummaryValue}>{value}</p>
        <p className={styles.currencySummaryHint}>{hint}</p>
      </div>
    </div>
  );
}

function Section({ label, labelIcon, children }) {
  return (
    <div className={styles.section}>
      <p
        className={styles.sectionLabel}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {labelIcon}
        {label}
      </p>
      {children}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className={styles.divider}>
      {label && <span className={styles.dividerLabel}>{label}</span>}
    </div>
  );
}

function Grid({ children }) {
  return <div className={styles.grid}>{children}</div>;
}

function Row({ children }) {
  return <div className={styles.row}>{children}</div>;
}

function FI({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
  full,
}) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ""}`}>
      <label className={styles.label}>{label}</label>
      {multiline ? (
        <textarea
          className={styles.textarea}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          className={styles.input}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function SF({ label, value, onChange, options }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <select
        className={styles.select}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PriceField({ label, suffix, value, onChange }) {
  return (
    <div className={styles.priceField}>
      <label className={styles.label}>{label}</label>
      <div className={styles.priceInputWrap}>
        <input
          className={styles.input}
          type="number"
          min="0"
          step="0.01"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
        />
        <span className={styles.priceSuffix}>{suffix}</span>
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className={styles.toggleRow}>
      <div>
        <p className={styles.toggleLabel}>{label}</p>
        <p className={styles.toggleDesc}>{desc}</p>
      </div>
      <button
        className={`${styles.toggleBtn} ${checked ? styles.toggleOn : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}

function SaveBtn({ label, loading, onClick }) {
  return (
    <button className={styles.saveBtn} onClick={onClick} disabled={!!loading}>
      {loading ? (
        <>
          <span className={styles.spinner} /> Saving...
        </>
      ) : (
        label
      )}
    </button>
  );
}

function SecRow({ label, value }) {
  return (
    <div className={styles.secRow}>
      <span className={styles.secLabel}>{label}</span>
      <span className={styles.secValue}>{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <p className={styles.statVal}>{value}</p>
      <p className={styles.statLbl}>{label}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className={styles.skWrap}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skLine} />
      ))}
    </div>
  );
}

function LangSelect({ value, onChange }) {
  const [search, setSearch] = useState("");
  const filtered = ALL_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()),
  );
  const current = ALL_LANGUAGES.find((l) => l.code === value);

  return (
    <div className={styles.langWrap} translate="no">
      <input
        className={styles.input}
        placeholder="Search language..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        translate="no"
      />
      <select
        className={styles.select}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSearch("");
        }}
        size={search ? Math.min(filtered.length, 6) : 1}
        translate="no"
      >
        {!search && (
          <option value="en" style={{ fontWeight: 600 }}>
            English (Default)
          </option>
        )}
        {(search ? filtered : ALL_LANGUAGES.filter((l) => l.code !== "en")).map(
          (l) => (
            <option key={l.code} value={l.code} translate="no">
              {l.name}
            </option>
          ),
        )}
      </select>
      {current && !search && (
        <div className={styles.langCurrentWrap}>
          <span
            className={styles.langCurrentDot}
            style={{
              background: value === "en" ? "var(--green)" : "var(--orange)",
            }}
          />
          <p className={styles.langCurrent} translate="no">
            Active: <strong>{current.name}</strong>
            {value !== "en" && (
              <button
                className={styles.langRevertBtn}
                onClick={() => onChange("en")}
              >
                Switch to English
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
