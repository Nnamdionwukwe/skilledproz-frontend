import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import styles from "./SettingsPage.module.css";

const CURRENCIES = [
  "USD",
  "NGN",
  "GBP",
  "EUR",
  "GHS",
  "KES",
  "ZAR",
  "INR",
  "CAD",
  "AUD",
  "SAR",
  "AED",
];
const LANGUAGES = [
  "English",
  "French",
  "Arabic",
  "Yoruba",
  "Hausa",
  "Igbo",
  "Swahili",
  "Portuguese",
  "Spanish",
  "Mandarin",
];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"];

const SECTIONS = [
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "role", icon: "🏷️", label: "Role Settings" },
  { id: "password", icon: "🔑", label: "Password" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "privacy", icon: "🛡️", label: "Privacy" },
  { id: "security", icon: "🔒", label: "Security" },
  { id: "activity", icon: "📊", label: "Activity" },
  { id: "danger", icon: "⚠️", label: "Danger Zone" },
];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;
  const [active, setActive] = useState("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Layout>
      <div className={styles.page}>
        {/* ── Mobile header ── */}
        <div className={styles.mobileHeader}>
          <button
            className={styles.menuToggle}
            onClick={() => setSidebarOpen((s) => !s)}
          >
            <span />
            <span />
            <span />
          </button>
          <p className={styles.mobileTitle}>Settings</p>
        </div>

        <div className={styles.shell}>
          {/* ── Sidebar nav ── */}
          <nav className={`${styles.nav} ${sidebarOpen ? styles.navOpen : ""}`}>
            <div className={styles.navHeader}>
              <div className={styles.navAvatar}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  <span>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </span>
                )}
              </div>
              <div>
                <p className={styles.navName}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className={styles.navRole}>{user?.role}</p>
              </div>
            </div>

            <div className={styles.navLinks}>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  className={`${styles.navLink} ${active === s.id ? styles.navLinkActive : ""}`}
                  onClick={() => {
                    setActive(s.id);
                    setSidebarOpen(false);
                  }}
                >
                  <span className={styles.navIcon}>{s.icon}</span>
                  <span>{s.label}</span>
                  {s.id === "danger" && <span className={styles.dangerDot} />}
                </button>
              ))}
            </div>
          </nav>

          {sidebarOpen && (
            <div
              className={styles.overlay}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ── Content panels ── */}
          <main className={styles.content}>
            {active === "profile" && (
              <ProfileSection user={user} setUser={setUser} />
            )}
            {active === "role" && <RoleSection user={user} />}
            {active === "password" && <PasswordSection />}
            {active === "notifications" && <NotifSection />}
            {active === "privacy" && <PrivacySection />}
            {active === "security" && <SecuritySection />}
            {active === "activity" && <ActivitySection />}
            {active === "danger" && <DangerSection />}
          </main>
        </div>
      </div>
    </Layout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROFILE SECTION
───────────────────────────────────────────────────────────────────────────── */
function ProfileSection({ user, setUser }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    country: user?.country || "",
    city: user?.city || "",
    state: user?.state || "",
    address: user?.address || "",
    currency: user?.currency || "USD",
    language: user?.language || "English",
    gender: user?.gender || "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const fileRef = useRef();

  function handleChange(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setSuccess("");
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch("/settings/profile", form);
      setUser?.({ ...user, ...res.data.data.user });
      setSuccess("Profile saved successfully ✓");
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await api.post("/settings/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser?.({ ...user, avatar: res.data.data.avatar });
      setSuccess("Avatar updated ✓");
    } catch {
      setError("Avatar upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Panel
      title="Profile Information"
      icon="👤"
      desc="Manage your public profile and personal details"
    >
      {/* Avatar */}
      <div className={styles.avatarRow}>
        <div
          className={styles.avatarWrap}
          onClick={() => fileRef.current?.click()}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarInitials}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          )}
          <div className={styles.avatarOverlay}>
            {uploading ? <span className={styles.spinner} /> : "📷"}
          </div>
        </div>
        <div className={styles.avatarMeta}>
          <p className={styles.avatarName}>
            {user?.firstName} {user?.lastName}
          </p>
          <p className={styles.avatarHint}>
            Click avatar to upload a new photo. Max 5 MB.
          </p>
          <button
            className={styles.avatarBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Change Photo"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={styles.hidden}
          onChange={handleAvatarChange}
        />
      </div>

      <Divider />

      {/* Name */}
      <FieldRow>
        <Field
          label="First Name"
          value={form.firstName}
          onChange={(v) => handleChange("firstName", v)}
          placeholder="John"
        />
        <Field
          label="Last Name"
          value={form.lastName}
          onChange={(v) => handleChange("lastName", v)}
          placeholder="Doe"
        />
      </FieldRow>

      <Field
        label="Phone Number"
        value={form.phone}
        onChange={(v) => handleChange("phone", v)}
        placeholder="+234 801 234 5678"
        type="tel"
      />

      <Field
        label="Bio"
        value={form.bio}
        onChange={(v) => handleChange("bio", v)}
        placeholder="Tell people about yourself..."
        multiline
      />

      <Divider label="Location" />

      <FieldRow>
        <Field
          label="Country"
          value={form.country}
          onChange={(v) => handleChange("country", v)}
          placeholder="Nigeria"
        />
        <Field
          label="State"
          value={form.state}
          onChange={(v) => handleChange("state", v)}
          placeholder="Lagos State"
        />
      </FieldRow>
      <FieldRow>
        <Field
          label="City"
          value={form.city}
          onChange={(v) => handleChange("city", v)}
          placeholder="Ikeja"
        />
        <Field
          label="Address"
          value={form.address}
          onChange={(v) => handleChange("address", v)}
          placeholder="Street address"
        />
      </FieldRow>

      <Divider label="Preferences" />

      <FieldRow>
        <SelectField
          label="Default Currency"
          value={form.currency}
          onChange={(v) => handleChange("currency", v)}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
        <SelectField
          label="Language"
          value={form.language}
          onChange={(v) => handleChange("language", v)}
          options={LANGUAGES.map((l) => ({ value: l, label: l }))}
        />
      </FieldRow>
      <SelectField
        label="Gender"
        value={form.gender}
        onChange={(v) => handleChange("gender", v)}
        options={[
          { value: "", label: "Prefer not to say" },
          ...GENDERS.map((g) => ({ value: g, label: g })),
        ]}
      />

      <StatusBar success={success} error={error} />

      <div className={styles.saveRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className={styles.spinner} /> Saving…
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROLE SECTION
───────────────────────────────────────────────────────────────────────────── */
function RoleSection({ user }) {
  const isWorker = user?.role === "WORKER";
  return isWorker ? <WorkerProfileSection /> : <HirerProfileSection />;
}

function WorkerProfileSection() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    hourlyRate: "",
    currency: "USD",
    yearsExperience: "",
    serviceRadius: "25",
    isAvailable: true,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/settings/profile")
      .then((r) => {
        const wp = r.data.data.user?.workerProfile;
        if (wp)
          setForm({
            title: wp.title || "",
            description: wp.description || "",
            hourlyRate: wp.hourlyRate || "",
            currency: wp.currency || "USD",
            yearsExperience: wp.yearsExperience || "",
            serviceRadius: wp.serviceRadius || "25",
            isAvailable: wp.isAvailable ?? true,
          });
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch("/settings/worker-profile", form);
      setSuccess("Worker profile updated ✓");
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setSuccess("");
    setError("");
  }

  return (
    <Panel
      title="Worker Profile"
      icon="👷"
      desc="Manage your professional profile visible to hirers"
    >
      <Field
        label="Professional Title"
        value={form.title}
        onChange={(v) => set("title", v)}
        placeholder="e.g. Certified Electrician"
      />
      <Field
        label="Professional Description"
        value={form.description}
        onChange={(v) => set("description", v)}
        placeholder="Describe your skills and experience…"
        multiline
      />

      <FieldRow>
        <Field
          label="Hourly Rate"
          value={form.hourlyRate}
          onChange={(v) => set("hourlyRate", v)}
          type="number"
          placeholder="0.00"
        />
        <SelectField
          label="Currency"
          value={form.currency}
          onChange={(v) => set("currency", v)}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
      </FieldRow>

      <FieldRow>
        <Field
          label="Years of Experience"
          value={form.yearsExperience}
          onChange={(v) => set("yearsExperience", v)}
          type="number"
          placeholder="0"
        />
        <Field
          label="Service Radius (km)"
          value={form.serviceRadius}
          onChange={(v) => set("serviceRadius", v)}
          type="number"
          placeholder="25"
        />
      </FieldRow>

      <div className={styles.toggleRow}>
        <div>
          <p className={styles.toggleLabel}>Available for Work</p>
          <p className={styles.toggleDesc}>Toggle off to pause new bookings</p>
        </div>
        <button
          className={`${styles.toggleSwitch} ${form.isAvailable ? styles.toggleOn : styles.toggleOff}`}
          onClick={() => set("isAvailable", !form.isAvailable)}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      <StatusBar success={success} error={error} />
      <div className={styles.saveRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className={styles.spinner} /> Saving…
            </>
          ) : (
            "Save Worker Profile"
          )}
        </button>
      </div>
    </Panel>
  );
}

function HirerProfileSection() {
  const [form, setForm] = useState({
    companyName: "",
    companySize: "",
    website: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/settings/profile")
      .then((r) => {
        const hp = r.data.data.user?.hirerProfile;
        if (hp)
          setForm({
            companyName: hp.companyName || "",
            companySize: hp.companySize || "",
            website: hp.website || "",
          });
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch("/settings/hirer-profile", form);
      setSuccess("Company profile updated ✓");
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setSuccess("");
    setError("");
  }

  return (
    <Panel
      title="Company Profile"
      icon="🏢"
      desc="Manage your company information visible to workers"
    >
      <Field
        label="Company Name"
        value={form.companyName}
        onChange={(v) => set("companyName", v)}
        placeholder="Acme Corp"
      />
      <SelectField
        label="Company Size"
        value={form.companySize}
        onChange={(v) => set("companySize", v)}
        options={[
          { value: "", label: "Select size" },
          ...COMPANY_SIZES.map((s) => ({ value: s, label: s + " employees" })),
        ]}
      />
      <Field
        label="Website"
        value={form.website}
        onChange={(v) => set("website", v)}
        placeholder="https://yourcompany.com"
        type="url"
      />

      <StatusBar success={success} error={error} />
      <div className={styles.saveRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className={styles.spinner} /> Saving…
            </>
          ) : (
            "Save Company Profile"
          )}
        </button>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PASSWORD SECTION
───────────────────────────────────────────────────────────────────────────── */
function PasswordSection() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  async function handleSave() {
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch("/settings/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("Password changed successfully ✓");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      setError(e.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  const strength = getPasswordStrength(form.newPassword);

  return (
    <Panel
      title="Change Password"
      icon="🔑"
      desc="Use a strong, unique password to protect your account"
    >
      <PasswordField
        label="Current Password"
        value={form.currentPassword}
        onChange={(v) => setForm((f) => ({ ...f, currentPassword: v }))}
        show={show.current}
        onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
      />
      <PasswordField
        label="New Password"
        value={form.newPassword}
        onChange={(v) => setForm((f) => ({ ...f, newPassword: v }))}
        show={show.new}
        onToggle={() => setShow((s) => ({ ...s, new: !s.new }))}
      />

      {form.newPassword && (
        <div className={styles.strengthBar}>
          <div
            className={`${styles.strengthFill} ${styles[`strength_${strength.level}`]}`}
            style={{ width: `${strength.pct}%` }}
          />
          <span className={styles.strengthLabel}>{strength.label}</span>
        </div>
      )}

      <PasswordField
        label="Confirm New Password"
        value={form.confirmPassword}
        onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
        show={show.confirm}
        onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
        error={
          form.confirmPassword && form.newPassword !== form.confirmPassword
            ? "Passwords do not match"
            : ""
        }
      />

      <div className={styles.passwordTips}>
        {[
          "At least 8 characters",
          "Mix of letters and numbers",
          "At least one special character",
        ].map((tip) => (
          <div
            key={tip}
            className={`${styles.tip} ${form.newPassword.length >= 8 ? styles.tipMet : ""}`}
          >
            <span className={styles.tipIcon}>
              {form.newPassword.length >= 8 ? "✓" : "○"}
            </span>
            <span>{tip}</span>
          </div>
        ))}
      </div>

      <StatusBar success={success} error={error} />
      <div className={styles.saveRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !form.currentPassword || !form.newPassword}
        >
          {saving ? (
            <>
              <span className={styles.spinner} /> Updating…
            </>
          ) : (
            "Update Password"
          )}
        </button>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATIONS SECTION
───────────────────────────────────────────────────────────────────────────── */
function NotifSection() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .get("/settings/notifications")
      .then((r) => setPrefs(r.data.data.prefs))
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/settings/notifications", prefs);
      setSuccess("Notification preferences saved ✓");
    } catch {
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  function toggle(k) {
    setPrefs((p) => ({ ...p, [k]: !p[k] }));
  }

  if (!prefs) return <PanelSkeleton />;

  const emailToggles = [
    {
      key: "emailBookingUpdates",
      label: "Booking updates",
      desc: "Status changes, confirmations, cancellations",
    },
    {
      key: "emailPaymentReceipts",
      label: "Payment receipts",
      desc: "Payment confirmations and escrow releases",
    },
    {
      key: "emailReviewRequests",
      label: "Review requests",
      desc: "Reminders to leave reviews after jobs",
    },
    {
      key: "emailMarketing",
      label: "Marketing emails",
      desc: "Tips, promotions, and platform news",
    },
  ];

  const pushToggles = [
    {
      key: "pushBookings",
      label: "Booking alerts",
      desc: "New bookings and status changes",
    },
    {
      key: "pushMessages",
      label: "Messages",
      desc: "New message notifications",
    },
    {
      key: "pushPayments",
      label: "Payment alerts",
      desc: "Escrow updates and releases",
    },
    {
      key: "pushSOS",
      label: "SOS alerts",
      desc: "Emergency notifications (always on for safety)",
    },
  ];

  return (
    <Panel
      title="Notification Preferences"
      icon="🔔"
      desc="Choose how and when you receive notifications"
    >
      <NotifGroup
        title="📧 Email Notifications"
        toggles={emailToggles}
        prefs={prefs}
        onToggle={toggle}
      />
      <Divider />
      <NotifGroup
        title="📱 Push Notifications"
        toggles={pushToggles}
        prefs={prefs}
        onToggle={toggle}
      />

      {success && <div className={styles.successBar}>{success}</div>}
      <div className={styles.saveRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className={styles.spinner} /> Saving…
            </>
          ) : (
            "Save Preferences"
          )}
        </button>
      </div>
    </Panel>
  );
}

function NotifGroup({ title, toggles, prefs, onToggle }) {
  return (
    <div className={styles.notifGroup}>
      <p className={styles.notifGroupTitle}>{title}</p>
      {toggles.map((t) => (
        <div key={t.key} className={styles.toggleRow}>
          <div>
            <p className={styles.toggleLabel}>{t.label}</p>
            <p className={styles.toggleDesc}>{t.desc}</p>
          </div>
          <button
            className={`${styles.toggleSwitch} ${prefs[t.key] ? styles.toggleOn : styles.toggleOff}`}
            onClick={() => onToggle(t.key)}
            disabled={t.key === "pushSOS"}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRIVACY SECTION
───────────────────────────────────────────────────────────────────────────── */
function PrivacySection() {
  const [privacy, setPrivacy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .get("/settings/privacy")
      .then((r) => setPrivacy(r.data.data.privacy))
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/settings/privacy", privacy);
      setSuccess("Privacy settings saved ✓");
    } catch {
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  function toggle(k) {
    setPrivacy((p) => ({ ...p, [k]: !p[k] }));
  }
  function set(k, v) {
    setPrivacy((p) => ({ ...p, [k]: v }));
  }

  if (!privacy) return <PanelSkeleton />;

  return (
    <Panel
      title="Privacy Settings"
      icon="🛡️"
      desc="Control who can see your information and how you appear"
    >
      <p className={styles.privacySection}>Profile Visibility</p>
      {[
        {
          key: "profilePublic",
          label: "Public profile",
          desc: "Allow anyone to view your profile",
        },
        {
          key: "showPhone",
          label: "Show phone number",
          desc: "Display your phone number on your profile",
        },
        {
          key: "showLocation",
          label: "Show location",
          desc: "Display your city and country on your profile",
        },
        {
          key: "showEarnings",
          label: "Show earnings",
          desc: "Display earnings stats on worker profile",
        },
        {
          key: "showOnlineStatus",
          label: "Show online status",
          desc: "Let others see when you're active",
        },
        {
          key: "indexableBySearch",
          label: "Appear in search",
          desc: "Allow your profile to appear in search results",
        },
      ].map((t) => (
        <div key={t.key} className={styles.toggleRow}>
          <div>
            <p className={styles.toggleLabel}>{t.label}</p>
            <p className={styles.toggleDesc}>{t.desc}</p>
          </div>
          <button
            className={`${styles.toggleSwitch} ${privacy[t.key] ? styles.toggleOn : styles.toggleOff}`}
            onClick={() => toggle(t.key)}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      ))}

      <Divider label="Messaging" />

      <div className={styles.radioGroup}>
        <p className={styles.toggleLabel}>Who can send you messages</p>
        {[
          { value: "all", label: "Everyone" },
          { value: "verified", label: "Verified users only" },
          { value: "none", label: "Nobody (disable messages)" },
        ].map((opt) => (
          <label key={opt.value} className={styles.radioLabel}>
            <input
              type="radio"
              name="allowMessages"
              value={opt.value}
              checked={privacy.allowMessagesFrom === opt.value}
              onChange={() => set("allowMessagesFrom", opt.value)}
              className={styles.radioInput}
            />
            <span className={styles.radioCustom} />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {success && <div className={styles.successBar}>{success}</div>}
      <div className={styles.saveRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className={styles.spinner} /> Saving…
            </>
          ) : (
            "Save Privacy Settings"
          )}
        </button>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECURITY SECTION
───────────────────────────────────────────────────────────────────────────── */
function SecuritySection() {
  const [sec, setSec] = useState(null);

  useEffect(() => {
    api
      .get("/settings/security")
      .then((r) => setSec(r.data.data))
      .catch(() => {});
  }, []);

  if (!sec) return <PanelSkeleton />;

  return (
    <Panel
      title="Security"
      icon="🔒"
      desc="Monitor your account security and active sessions"
    >
      <div className={styles.securityGrid}>
        <SecurityItem
          icon={sec.isEmailVerified ? "✅" : "⚠️"}
          label="Email Verification"
          value={sec.isEmailVerified ? "Verified" : "Not verified"}
          status={sec.isEmailVerified ? "good" : "warn"}
          sub={sec.email}
        />
        <SecurityItem
          icon={sec.isPhoneVerified ? "✅" : "⚠️"}
          label="Phone Verification"
          value={sec.isPhoneVerified ? "Verified" : "Not verified"}
          status={sec.isPhoneVerified ? "good" : "warn"}
          sub={sec.phone || "No phone added"}
        />
        <SecurityItem
          icon="🔐"
          label="Two-Factor Auth"
          value="Not enabled"
          status="neutral"
          sub="Coming soon"
        />
        <SecurityItem
          icon="📅"
          label="Account Created"
          value={new Date(sec.accountCreated).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          status="good"
        />
      </div>

      <Divider label="Active Sessions" />

      <div className={styles.sessions}>
        {sec.sessions.map((s) => (
          <div key={s.id} className={styles.session}>
            <div className={styles.sessionIcon}>
              {s.isCurrent ? "💻" : "📱"}
            </div>
            <div className={styles.sessionInfo}>
              <p className={styles.sessionDevice}>{s.device}</p>
              <p className={styles.sessionMeta}>
                Last active: {new Date(s.lastSeen).toLocaleString()}
                {s.isCurrent && (
                  <span className={styles.currentBadge}>Current</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SecurityItem({ icon, label, value, status, sub }) {
  return (
    <div className={`${styles.securityItem} ${styles[`security_${status}`]}`}>
      <span className={styles.securityIcon}>{icon}</span>
      <div>
        <p className={styles.securityLabel}>{label}</p>
        <p className={styles.securityValue}>{value}</p>
        {sub && <p className={styles.securitySub}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVITY SECTION
───────────────────────────────────────────────────────────────────────────── */
function ActivitySection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/settings/activity")
      .then((r) => setData(r.data.data))
      .catch(() => {});
  }, []);

  if (!data) return <PanelSkeleton />;

  const NOTIF_ICONS = {
    BOOKING_CHECKIN: "🟢",
    BOOKING_CHECKOUT: "🔴",
    BOOKING_CANCELLED: "❌",
    SOS_ACTIVATED: "🚨",
    SOS_RESOLVED: "✅",
    VIDEO_CALL_INCOMING: "📹",
    BANK_TRANSFER_PROOF: "🏦",
    CRYPTO_TX_SUBMITTED: "₿",
  };

  return (
    <Panel
      title="Account Activity"
      icon="📊"
      desc="Your recent account activity and summary"
    >
      <div className={styles.activityStats}>
        <StatCard
          icon="🔔"
          label="Unread Notifications"
          value={data.summary.unreadNotifications}
        />
        <StatCard
          icon="📋"
          label="Total Bookings"
          value={data.summary.totalBookings}
        />
        <StatCard
          icon="⭐"
          label="Reviews Received"
          value={data.summary.totalReviews}
        />
      </div>

      <Divider label="Recent Activity" />

      {data.recentActivity.length === 0 ? (
        <div className={styles.emptyActivity}>
          <span>📭</span>
          <p>No recent activity</p>
        </div>
      ) : (
        <div className={styles.activityList}>
          {data.recentActivity.map((n) => (
            <div
              key={n.id}
              className={`${styles.activityItem} ${!n.isRead ? styles.activityUnread : ""}`}
            >
              <span className={styles.activityIcon}>
                {NOTIF_ICONS[n.type] || "🔔"}
              </span>
              <div className={styles.activityBody}>
                <p className={styles.activityTitle}>{n.title}</p>
                <p className={styles.activityDesc}>{n.body}</p>
                <p className={styles.activityTime}>
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && <span className={styles.unreadDot} />}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DANGER ZONE
───────────────────────────────────────────────────────────────────────────── */
function DangerSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const { logout } = useAuthStore();

  async function handleDelete() {
    if (!password) {
      setError("Password is required");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await api.delete("/settings/account", { data: { password, reason } });
      logout?.();
      window.location.href = "/";
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Panel
      title="Danger Zone"
      icon="⚠️"
      desc="Irreversible actions — proceed with caution"
    >
      <div className={styles.dangerCard}>
        <div className={styles.dangerCardHeader}>
          <span className={styles.dangerCardIcon}>💣</span>
          <div>
            <p className={styles.dangerCardTitle}>Delete Account</p>
            <p className={styles.dangerCardDesc}>
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
          </div>
        </div>

        {!showConfirm ? (
          <button
            className={styles.dangerBtn}
            onClick={() => setShowConfirm(true)}
          >
            Delete My Account
          </button>
        ) : (
          <div className={styles.dangerConfirm}>
            <div className={styles.dangerWarning}>
              ⚠️ This will permanently delete your account, bookings history,
              and all personal data.
            </div>

            <Field
              label="Reason for leaving (optional)"
              value={reason}
              onChange={setReason}
              placeholder="Tell us why you're leaving..."
              multiline
            />

            <PasswordField
              label="Confirm your password to proceed"
              value={password}
              onChange={setPassword}
              show={false}
              onToggle={() => {}}
            />

            {error && <div className={styles.errorBar}>{error}</div>}

            <div className={styles.dangerBtns}>
              <button
                className={styles.dangerConfirmBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className={styles.spinner} /> Deleting…
                  </>
                ) : (
                  "Yes, Delete My Account"
                )}
              </button>
              <button
                className={styles.dangerCancelBtn}
                onClick={() => {
                  setShowConfirm(false);
                  setPassword("");
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function Panel({ title, icon, desc, children }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon}>{icon}</span>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          {desc && <p className={styles.panelDesc}>{desc}</p>}
        </div>
      </div>
      <div className={styles.panelBody}>{children}</div>
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

function FieldRow({ children }) {
  return <div className={styles.fieldRow}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
  error,
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {multiline ? (
        <textarea
          className={`${styles.fieldInput} ${styles.fieldTextarea} ${error ? styles.fieldError : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          className={`${styles.fieldInput} ${error ? styles.fieldError : ""}`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {error && <p className={styles.fieldErrorMsg}>{error}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <select
        className={`${styles.fieldInput} ${styles.fieldSelect}`}
        value={value}
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

function PasswordField({ label, value, onChange, show, onToggle, error }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          className={`${styles.fieldInput} ${styles.passwordInput} ${error ? styles.fieldError : ""}`}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle}>
          {show ? "🙈" : "👁️"}
        </button>
      </div>
      {error && <p className={styles.fieldErrorMsg}>{error}</p>}
    </div>
  );
}

function StatusBar({ success, error }) {
  if (!success && !error) return null;
  return success ? (
    <div className={styles.successBar}>{success}</div>
  ) : (
    <div className={styles.errorBar}>{error}</div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className={styles.panel}>
      <div className={styles.skHeader} />
      <div className={styles.panelBody}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skField} />
        ))}
      </div>
    </div>
  );
}

function getPasswordStrength(pw) {
  if (!pw) return { level: "empty", pct: 0, label: "" };
  if (pw.length < 6) return { level: "weak", pct: 25, label: "Weak" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: "fair", pct: 50, label: "Fair" };
  if (score === 2) return { level: "good", pct: 75, label: "Good" };
  return { level: "strong", pct: 100, label: "Strong" };
}
