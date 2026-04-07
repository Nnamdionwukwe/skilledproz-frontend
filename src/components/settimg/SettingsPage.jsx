import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../context/ThemeContext";
import api from "../../lib/api";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import styles from "./SettingsPage.module.css";

// ── All world languages ──────────────────────────────────────────────────────
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
  { code: "ceb", name: "Cebuano" },
  { code: "ny", name: "Chichewa" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "co", name: "Corsican" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "eo", name: "Esperanto" },
  { code: "et", name: "Estonian" },
  { code: "tl", name: "Filipino" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "fy", name: "Frisian" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "ht", name: "Haitian Creole" },
  { code: "ha", name: "Hausa" },
  { code: "haw", name: "Hawaiian" },
  { code: "iw", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hmn", name: "Hmong" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "ig", name: "Igbo" },
  { code: "id", name: "Indonesian" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "jw", name: "Javanese" },
  { code: "kn", name: "Kannada" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "ko", name: "Korean" },
  { code: "ku", name: "Kurdish" },
  { code: "ky", name: "Kyrgyz" },
  { code: "lo", name: "Lao" },
  { code: "la", name: "Latin" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "lb", name: "Luxembourgish" },
  { code: "mk", name: "Macedonian" },
  { code: "mg", name: "Malagasy" },
  { code: "ms", name: "Malay" },
  { code: "ml", name: "Malayalam" },
  { code: "mt", name: "Maltese" },
  { code: "mi", name: "Maori" },
  { code: "mr", name: "Marathi" },
  { code: "mn", name: "Mongolian" },
  { code: "my", name: "Myanmar (Burmese)" },
  { code: "ne", name: "Nepali" },
  { code: "no", name: "Norwegian" },
  { code: "ps", name: "Pashto" },
  { code: "fa", name: "Persian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "pa", name: "Punjabi" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sm", name: "Samoan" },
  { code: "gd", name: "Scots Gaelic" },
  { code: "sr", name: "Serbian" },
  { code: "st", name: "Sesotho" },
  { code: "sn", name: "Shona" },
  { code: "sd", name: "Sindhi" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "es", name: "Spanish" },
  { code: "su", name: "Sundanese" },
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
  { code: "yi", name: "Yiddish" },
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

const TABS = [
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "appearance", icon: "🎨", label: "Appearance" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "privacy", icon: "🔒", label: "Privacy" },
  { id: "security", icon: "🛡️", label: "Security" },
  { id: "payment", icon: "💳", label: "Payment" },
];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, language, changeTheme, changeLanguage } = useTheme();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [toast, setToast] = useState(null);

  // Profile state
  const [form, setForm] = useState({});
  // Password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  // Notifications
  const [notifs, setNotifs] = useState({});
  // Privacy
  const [privacy, setPrivacy] = useState({});

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
        });
      })
      .catch(() => {});
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  async function saveProfile() {
    setSaving(true);
    setSavingKey("profile");
    try {
      const res = await api.patch("/settings/profile", form);
      setProfile(res.data.data.user);
      if (setUser) setUser({ ...user, ...res.data.data.user });
      showToast("Profile saved successfully");
    } catch {
      showToast("Failed to save profile", "error");
    } finally {
      setSaving(false);
      setSavingKey("");
    }
  }

  async function savePassword() {
    if (pw.next !== pw.confirm) {
      setPwError("Passwords do not match");
      return;
    }
    if (pw.next.length < 8) {
      setPwError("Must be at least 8 characters");
      return;
    }
    setPwError("");
    setSaving(true);
    setSavingKey("password");
    try {
      await api.patch("/settings/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPw({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully");
    } catch (e) {
      showToast(e.response?.data?.message || "Password change failed", "error");
    } finally {
      setSaving(false);
      setSavingKey("");
    }
  }

  async function saveNotifs() {
    setSaving(true);
    setSavingKey("notifs");
    try {
      await api.patch("/settings/notifications", notifs);
      showToast("Notification preferences saved");
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
      setSavingKey("");
    }
  }

  async function savePrivacy() {
    setSaving(true);
    setSavingKey("privacy");
    try {
      await api.patch("/settings/privacy", privacy);
      showToast("Privacy settings saved");
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
      setSavingKey("");
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    setSaving(true);
    setSavingKey("avatar");
    try {
      const res = await api.post("/settings/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((p) => ({ ...p, avatar: res.data.data.user.avatar }));
      if (setUser) setUser({ ...user, avatar: res.data.data.user.avatar });
      showToast("Photo updated");
    } catch {
      showToast("Photo upload failed", "error");
    } finally {
      setSaving(false);
      setSavingKey("");
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Are you sure? This will deactivate your account immediately.",
      )
    )
      return;
    try {
      await api.delete("/settings/account");
      window.location.href = "/login";
    } catch {
      showToast("Failed to deactivate account", "error");
    }
  }

  return (
    <Layout>
      <div className={styles.page}>
        {toast && (
          <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
            {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
          </div>
        )}

        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSub}>
            Manage your account, appearance, and preferences
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

          {/* ── Content ── */}
          <div className={styles.content}>
            {/* ── PROFILE ── */}
            {tab === "profile" && (
              <Card title="Profile" subtitle="Your personal information">
                {/* Avatar */}
                <div className={styles.avatarRow}>
                  <div className={styles.avatarWrap}>
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt=""
                        className={styles.avatarImg}
                      />
                    ) : (
                      <span className={styles.avatarInitials}>
                        {profile?.firstName?.[0]}
                        {profile?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className={styles.avatarUploadBtn}>
                      {savingKey === "avatar"
                        ? "Uploading..."
                        : "📷 Change Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <p className={styles.avatarHint}>
                      JPG, PNG or WebP · max 5MB
                    </p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <Field label="First Name">
                    <input
                      className={styles.input}
                      value={form.firstName || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      className={styles.input}
                      value={form.lastName || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Phone" full>
                    <input
                      className={styles.input}
                      value={form.phone || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="+1 234 567 8900"
                    />
                  </Field>
                  <Field label="Bio" full>
                    <textarea
                      className={styles.textarea}
                      value={form.bio || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bio: e.target.value }))
                      }
                      rows={3}
                      placeholder="Tell people about yourself..."
                    />
                  </Field>
                  <Field label="Country">
                    <input
                      className={styles.input}
                      value={form.country || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, country: e.target.value }))
                      }
                      placeholder="e.g. Nigeria"
                    />
                  </Field>
                  <Field label="City">
                    <input
                      className={styles.input}
                      value={form.city || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, city: e.target.value }))
                      }
                      placeholder="e.g. Lagos"
                    />
                  </Field>
                  <Field label="State">
                    <input
                      className={styles.input}
                      value={form.state || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, state: e.target.value }))
                      }
                      placeholder="e.g. Lagos State"
                    />
                  </Field>
                  <Field label="Address">
                    <input
                      className={styles.input}
                      value={form.address || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                      placeholder="Street address"
                    />
                  </Field>
                  <Field label="Currency">
                    <select
                      className={styles.select}
                      value={form.currency || "USD"}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, currency: e.target.value }))
                      }
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <SaveBtn
                  label="Save Profile"
                  loading={saving && savingKey === "profile"}
                  onClick={saveProfile}
                />
              </Card>
            )}

            {/* ── APPEARANCE ── */}
            {tab === "appearance" && (
              <Card
                title="Appearance"
                subtitle="Theme and language preferences"
              >
                <Section label="🌗 Theme">
                  <p className={styles.sectionHint}>
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
                        <span className={styles.themeCardIcon}>{t.icon}</span>
                        <span className={styles.themeCardLabel}>{t.label}</span>
                        {theme === t.id && (
                          <span className={styles.themeCheck}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="🌐 Language">
                  <p className={styles.sectionHint}>
                    Select your preferred language. The platform UI will update
                    immediately.
                  </p>
                  <div className={styles.langSearchWrap}>
                    <LangSelect value={language} onChange={changeLanguage} />
                  </div>
                  <div className={styles.langNote}>
                    ℹ️ For full translation of user-generated content, use the
                    Translate button in messages and bookings.
                  </div>
                </Section>
              </Card>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === "notifications" && (
              <Card
                title="Notifications"
                subtitle="Choose what you want to be notified about"
              >
                {[
                  {
                    key: "notifBookings",
                    label: "Bookings",
                    desc: "New bookings, status updates, confirmations",
                  },
                  {
                    key: "notifMessages",
                    label: "Messages",
                    desc: "New messages from hirers or workers",
                  },
                  {
                    key: "notifPayments",
                    label: "Payments",
                    desc: "Payment received, escrow releases, refunds",
                  },
                  {
                    key: "notifReviews",
                    label: "Reviews",
                    desc: "New reviews on your profile",
                  },
                  {
                    key: "notifMarketing",
                    label: "Product updates",
                    desc: "New features, tips, and SkilledProz news",
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
                  label="Save Preferences"
                  loading={saving && savingKey === "notifs"}
                  onClick={saveNotifs}
                />
              </Card>
            )}

            {/* ── PRIVACY ── */}
            {tab === "privacy" && (
              <Card
                title="Privacy"
                subtitle="Control who can see your information"
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
                  desc="Show your city and country on your profile"
                  checked={privacy.showLocation ?? true}
                  onChange={(v) =>
                    setPrivacy((p) => ({ ...p, showLocation: v }))
                  }
                />
                <SaveBtn
                  label="Save Privacy Settings"
                  loading={saving && savingKey === "privacy"}
                  onClick={savePrivacy}
                />
              </Card>
            )}

            {/* ── SECURITY ── */}
            {tab === "security" && (
              <>
                <Card
                  title="Change Password"
                  subtitle="Use a strong password you don't use elsewhere"
                >
                  <Field label="Current Password" full>
                    <input
                      className={styles.input}
                      type="password"
                      value={pw.current}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, current: e.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </Field>
                  <Field label="New Password" full>
                    <input
                      className={styles.input}
                      type="password"
                      value={pw.next}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, next: e.target.value }))
                      }
                      placeholder="Min 8 characters"
                    />
                  </Field>
                  <Field label="Confirm New Password" full>
                    <input
                      className={styles.input}
                      type="password"
                      value={pw.confirm}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, confirm: e.target.value }))
                      }
                      placeholder="Repeat new password"
                    />
                  </Field>
                  {pwError && <p className={styles.fieldError}>{pwError}</p>}
                  <SaveBtn
                    label="Update Password"
                    loading={saving && savingKey === "password"}
                    onClick={savePassword}
                  />
                </Card>

                <Card
                  title="Account Info"
                  subtitle="Your account status and verification"
                >
                  <div className={styles.securityRows}>
                    <SecRow label="Email" value={profile?.email} />
                    <SecRow
                      label="Verified"
                      value={profile?.isEmailVerified ? "✅ Yes" : "❌ Not yet"}
                    />
                    <SecRow
                      label="Member since"
                      value={
                        profile?.createdAt
                          ? new Date(profile.createdAt).toLocaleDateString(
                              "en-GB",
                            )
                          : "—"
                      }
                    />
                    <SecRow label="Role" value={profile?.role} />
                  </div>
                </Card>

                <Card
                  title="Danger Zone"
                  subtitle="Permanent actions — proceed carefully"
                >
                  <div className={styles.dangerCard}>
                    <div>
                      <p className={styles.dangerTitle}>Deactivate Account</p>
                      <p className={styles.dangerDesc}>
                        Your profile will be hidden and you will be logged out.
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

            {/* ── PAYMENT ── */}
            {tab === "payment" && (
              <Card
                title="Payment Settings"
                subtitle="Your preferred currency and payment info"
              >
                <Field label="Preferred Currency" full>
                  <select
                    className={styles.select}
                    value={form.currency || "USD"}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value }))
                    }
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <p
                  className={styles.sectionHint}
                  style={{ marginTop: "0.5rem" }}
                >
                  This currency is used as your default for bookings and
                  payments.
                </p>
                <SaveBtn
                  label="Save Currency"
                  loading={saving && savingKey === "profile"}
                  onClick={saveProfile}
                />

                <div className={styles.divider} />
                <Section label="Payment Methods">
                  <p className={styles.sectionHint}>
                    Payment methods are added automatically when you make a
                    payment. Supported: Card (Stripe/Paystack), Bank Transfer,
                    Crypto.
                  </p>
                </Section>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, subtitle, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {subtitle && <p className={styles.cardSub}>{subtitle}</p>}
      </div>
      <div className={styles.cardBody}>{children}</div>
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

function Field({ label, children, full }) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ""}`}>
      <label className={styles.label}>{label}</label>
      {children}
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
        className={`${styles.toggleBtn} ${checked ? styles.toggleBtnOn : ""}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}

function SaveBtn({ label, loading, onClick }) {
  return (
    <button className={styles.saveBtn} onClick={onClick} disabled={loading}>
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

function LangSelect({ value, onChange }) {
  const [search, setSearch] = useState("");
  const filtered = ALL_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()),
  );
  const current = ALL_LANGUAGES.find((l) => l.code === value);

  return (
    <div className={styles.langWrap}>
      <input
        className={styles.input}
        placeholder="🔍 Search language..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        className={styles.select}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSearch("");
        }}
        size={search ? Math.min(filtered.length, 8) : 1}
      >
        {(search ? filtered : ALL_LANGUAGES).map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
      {current && !search && (
        <p className={styles.langCurrent}>
          Selected: <strong>{current.name}</strong>
        </p>
      )}
    </div>
  );
}
