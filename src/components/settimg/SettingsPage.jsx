import { useState, useEffect, useRef } from "react";
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

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "INR",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "BRL",
  "MXN",
  "EGP",
  "TZS",
  "UGX",
  "RWF",
  "XOF",
  "MAD",
  "PHP",
  "IDR",
  "VND",
  "THB",
  "BDT",
  "PKR",
  "AED",
  "SAR",
  "QAR",
  "MYR",
  "SGD",
  "HKD",
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
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "work", icon: "👷", label: "Work Profile" },
  { id: "pricing", icon: "💰", label: "Pricing" },
  { id: "currencies", icon: "💱", label: "Currencies" },
  { id: "appearance", icon: "🎨", label: "Appearance" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "privacy", icon: "🔒", label: "Privacy" },
  { id: "security", icon: "🛡️", label: "Security" },
  { id: "activity", icon: "📊", label: "Activity" },
];

const TABS_HIRER = [
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "company", icon: "🏢", label: "Company" },
  { id: "hiring", icon: "📋", label: "Hiring Prefs" },
  { id: "currencies", icon: "💱", label: "Currencies" },
  { id: "appearance", icon: "🎨", label: "Appearance" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "privacy", icon: "🔒", label: "Privacy" },
  { id: "security", icon: "🛡️", label: "Security" },
  { id: "activity", icon: "📊", label: "Activity" },
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

  // Profile form — pre-populated from user store immediately
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

  // Worker pricing
  const [pricing, setPricing] = useState({
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    customRate: "",
    customRateLabel: "",
    pricingNote: "",
    currency: "USD",
  });

  // Worker work profile
  const [workForm, setWorkForm] = useState({
    title: "",
    description: "",
    yearsExperience: "",
    serviceRadius: "25",
    isAvailable: true,
  });

  // Hirer company
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companySize: "",
    website: "",
  });

  // Hirer hiring prefs (default estimated unit)
  const [hiringPrefs, setHiringPrefs] = useState({
    defaultEstimatedUnit: user?.defaultEstUnit || "hours",
    defaultEstimatedValue: user?.defaultEstValue || "",
  });

  // Password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  // Activity
  const [activity, setActivity] = useState(null);
  const [security, setSecurity] = useState(null);

  const [saving, setSaving] = useState("");
  const fileRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load full profile from API on mount
  useEffect(() => {
    api
      .get("/settings/profile")
      .then((res) => {
        const u = res.data.data.user;
        setProfile(u);
        // Update form states
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
        // Also update Zustand store with latest data
        updateUser?.(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Savers ──────────────────────────────────────────────────────────────────

  async function saveProfile() {
    setSaving("profile");
    try {
      const res = await api.patch("/settings/profile", form);
      const updated = res.data.data.user;
      setProfile((p) => ({ ...p, ...updated }));
      updateUser?.(updated); // Instant update across platform
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

    // ── Size check — show alert for > 5MB ──
    if (file.size > 5 * 1024 * 1024) {
      showToast(
        "Image is larger than 5MB. Please choose a smaller photo.",
        "error",
      );
      e.target.value = ""; // reset input
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

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Deactivate your account? You can contact support to reactivate.",
      )
    )
      return;
    try {
      await api.delete("/settings/account");
      window.location.href = "/login";
    } catch {
      showToast("Failed", "error");
    }
  }

  // Load activity/security lazily
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
  }, [tab]);

  return (
    <Layout>
      <div className={styles.page}>
        {/* Toast */}
        {toast && (
          <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
            {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
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
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.navBtn} ${tab === t.id ? styles.navBtnActive : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className={styles.navIcon}>{t.icon}</span>
                <span className={styles.navLabel}>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className={styles.content}>
            {/* ── PROFILE ── */}
            {tab === "profile" && (
              <Card
                title="Profile Information"
                icon="👤"
                desc="Your personal details visible to others"
              >
                {/* Avatar */}
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
                        "📷"
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
                icon="👷"
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
                icon="💰"
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
                    label="⏱ Hourly Rate"
                    suffix="/hr"
                    value={pricing.hourlyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, hourlyRate: v }))
                    }
                  />
                  <PriceField
                    label="📅 Daily Rate"
                    suffix="/day"
                    value={pricing.dailyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, dailyRate: v }))
                    }
                  />
                  <PriceField
                    label="📆 Weekly Rate"
                    suffix="/wk"
                    value={pricing.weeklyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, weeklyRate: v }))
                    }
                  />
                  <PriceField
                    label="🗓 Monthly Rate"
                    suffix="/mo"
                    value={pricing.monthlyRate}
                    onChange={(v) =>
                      setPricing((p) => ({ ...p, monthlyRate: v }))
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
                  icon="💱"
                  desc="Control how currencies appear across the platform"
                >
                  <div className={styles.infoBox}>
                    💡 SkilledProz supports multi-currency. Each setting serves
                    a different purpose — set them independently for the best
                    experience.
                  </div>

                  {/* ── Dashboard Currency ── */}
                  <Section label="📊 Dashboard Display Currency">
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

                  {/* ── Payment Currency ── */}
                  <Section
                    label={
                      isWorker ? "💳 Payout Currency" : "💳 Payment Currency"
                    }
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

                  {/* ── Profile Currency (Workers only) ── */}
                  {isWorker && (
                    <>
                      <Divider />
                      <Section label="🏷️ Profile Rate Currency">
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
                  icon="📋"
                  desc="How your currencies are configured"
                >
                  <div className={styles.currencySummaryGrid}>
                    <CurrencySummaryItem
                      icon="📊"
                      label="Dashboard shows stats in"
                      value={`${CURRENCY_META[dashboardCurrency]?.symbol} ${dashboardCurrency}`}
                      hint="Change anytime — display only"
                    />
                    <CurrencySummaryItem
                      icon="💳"
                      label={
                        isWorker ? "You receive payments in" : "You pay in"
                      }
                      value={`${CURRENCY_META[paymentCurrency]?.symbol} ${paymentCurrency}`}
                      hint="Used for actual transactions"
                    />
                    {isWorker && (
                      <CurrencySummaryItem
                        icon="🏷️"
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
                icon="🏢"
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
                icon="📋"
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
                  ℹ️ These are defaults only — you can always change duration
                  per booking when creating it.
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
                icon="🎨"
                desc="Theme and language preferences"
              >
                <Section label="🌗 Theme">
                  <p className={styles.sectionNote}>
                    Choose how SkilledProz looks on your device.
                  </p>
                  <div className={styles.themeGrid}>
                    {[
                      { id: "light", icon: "☀️", label: "Light" },
                      { id: "dark", icon: "🌙", label: "Dark" },
                      { id: "system", icon: "💻", label: "System" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        className={`${styles.themeCard} ${theme === t.id ? styles.themeCardActive : ""}`}
                        onClick={() => changeTheme(t.id)}
                      >
                        <span className={styles.themeIcon}>{t.icon}</span>
                        <span className={styles.themeLabel}>{t.label}</span>
                        {theme === t.id && (
                          <span className={styles.themeCheck}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="🌐 Language">
                  <p className={styles.sectionNote} translate="no">
                    Select your preferred language. The platform will
                    auto-translate via Google Translate.
                  </p>
                  {/* translate="no" prevents GT from translating UI chrome */}
                  <div translate="no">
                    <LangSelect value={language} onChange={changeLanguage} />
                  </div>
                  <div className={styles.infoBox} translate="no">
                    ℹ️ Select <strong>English</strong> to revert the platform
                    back to English.
                  </div>
                </Section>
              </Card>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === "notifications" && (
              <Card
                title="Notifications"
                icon="🔔"
                desc="Choose what you get notified about"
              >
                {[
                  {
                    key: "notifBookings",
                    label: "📋 Booking updates",
                    desc: "New bookings, status changes, confirmations",
                  },
                  {
                    key: "notifMessages",
                    label: "💬 Messages",
                    desc: "New messages from hirers or workers",
                  },
                  {
                    key: "notifPayments",
                    label: "💳 Payment alerts",
                    desc: "Escrow releases, payment confirmations",
                  },
                  {
                    key: "notifReviews",
                    label: "⭐ Reviews",
                    desc: "New reviews on your profile",
                  },
                  {
                    key: "notifMarketing",
                    label: "📣 Product updates",
                    desc: "New features and platform news",
                  },
                ].map((item) => (
                  <Toggle
                    key={item.key}
                    label={item.label}
                    desc={item.desc}
                    checked={notifs[item.key] ?? true}
                    onChange={(v) =>
                      setNotifs((n) => ({ ...n, [item.key]: v }))
                    }
                  />
                ))}
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
                icon="🔒"
                desc="Control who sees your information"
              >
                <Toggle
                  label="Public Profile"
                  desc="Allow your profile to appear in search results"
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
                  icon="🔑"
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

                <Card
                  title="Account Info"
                  icon="🛡️"
                  desc="Your verification and account status"
                >
                  {security ? (
                    <div className={styles.secRows}>
                      <SecRow label="Email" value={security.email} />
                      <SecRow
                        label="Email Verified"
                        value={
                          security.isEmailVerified
                            ? "✅ Verified"
                            : "❌ Not verified"
                        }
                      />
                      <SecRow
                        label="Phone Verified"
                        value={
                          security.isPhoneVerified
                            ? "✅ Verified"
                            : "❌ Not verified"
                        }
                      />
                      <SecRow
                        label="2FA"
                        value={
                          security.twoFactorEnabled
                            ? "✅ Enabled"
                            : "⚠️ Not enabled (coming soon)"
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

                <Card title="Danger Zone" icon="⚠️" desc="Irreversible actions">
                  <div className={styles.dangerBlock}>
                    <div>
                      <p className={styles.dangerTitle}>Deactivate Account</p>
                      <p className={styles.dangerDesc}>
                        Your profile will be hidden and you'll be logged out.
                        Contact support to reactivate.
                      </p>
                    </div>
                    <button
                      className={styles.dangerBtn}
                      onClick={handleDeleteAccount}
                    >
                      Deactivate
                    </button>
                  </div>
                </Card>
              </>
            )}

            {/* ── ACTIVITY ── */}
            {tab === "activity" && (
              <Card
                title="Account Activity"
                icon="📊"
                desc="Your recent platform activity"
              >
                {activity ? (
                  <>
                    <div className={styles.statsGrid}>
                      <StatCard
                        icon="🔔"
                        label="Unread notifications"
                        value={activity.summary.unreadNotifications}
                      />
                      <StatCard
                        icon="📋"
                        label="Total bookings"
                        value={activity.summary.totalBookings}
                      />
                      <StatCard
                        icon="⭐"
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
                          <span className={styles.actIcon}>🔔</span>
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
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function Section({ label, children }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>{label}</p>
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

// Field Input
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

// Select Field
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
        placeholder="🔍 Search language..."
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
        {/* Always show English as first option for easy revert */}
        {!search && (
          <option value="en" style={{ fontWeight: 600 }}>
            🇬🇧 English (Default)
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
