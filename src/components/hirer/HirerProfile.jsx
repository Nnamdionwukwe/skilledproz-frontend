import { useState, useEffect } from "react";
import styles from "./HirerProfile.module.css";
import api from "../../lib/api";

export default function HirerProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    companySize: "",
    website: "",
  });

  useEffect(() => {
    api.get("/hirers/me/profile").then((res) => {
      const p = res.data.data.profile;
      setProfile(p);
      setForm({
        companyName: p.companyName || "",
        companySize: p.companySize || "",
        website: p.website || "",
      });
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await api.put("/hirers/me/profile", form);
    const res = await api.get("/hirers/me/profile");
    setProfile(res.data.data.profile);
    setSaving(false);
    setEditing(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) return <ProfileSkeleton />;

  const { user } = profile;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.title}>Profile</h1>
      </div>

      {success && (
        <div className={styles.successBanner}>
          <span>✅</span> Profile updated successfully
        </div>
      )}

      <div className={styles.layout}>
        {/* Left — identity card */}
        <div className={styles.identityCard}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                <span>
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </span>
              )}
            </div>
            <div className={styles.avatarGlow} />
          </div>

          <h2 className={styles.name}>
            {user.firstName} {user.lastName}
          </h2>
          <p className={styles.email}>{user.email}</p>

          <div className={styles.verifiedRow}>
            {user.isEmailVerified ? (
              <span className={styles.verified}>✅ Email verified</span>
            ) : (
              <span className={styles.unverified}>⚠️ Email not verified</span>
            )}
          </div>

          <div className={styles.infoGrid}>
            {user.phone && (
              <InfoItem icon="📱" label="Phone" value={user.phone} />
            )}
            {user.city && user.country && (
              <InfoItem
                icon="📍"
                label="Location"
                value={`${user.city}, ${user.country}`}
              />
            )}
            <InfoItem
              icon="🗓️"
              label="Member since"
              value={new Date(user.createdAt).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            />
            <InfoItem
              icon="💳"
              label="Currency"
              value={user.currency || "USD"}
            />
          </div>

          {/* Stats */}
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{profile.totalHires}</span>
              <span className={styles.statLabel}>Hires</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={`${styles.statNum} ${styles.orange}`}>
                ${profile.totalSpent?.toLocaleString()}
              </span>
              <span className={styles.statLabel}>Spent</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>
                {profile.avgRating > 0 ? profile.avgRating?.toFixed(1) : "—"}
              </span>
              <span className={styles.statLabel}>Rating</span>
            </div>
          </div>
        </div>

        {/* Right — company details */}
        <div className={styles.detailsPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Company Details</h3>
            {!editing ? (
              <button
                className={styles.editBtn}
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ) : (
              <div className={styles.editActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <span className={styles.spinner} /> : "Save"}
                </button>
              </div>
            )}
          </div>

          <div className={styles.fields}>
            <Field
              label="Company Name"
              value={form.companyName}
              editing={editing}
              placeholder="e.g. Acme Corp"
              onChange={(v) => setForm((f) => ({ ...f, companyName: v }))}
            />
            <Field
              label="Company Size"
              value={form.companySize}
              editing={editing}
              placeholder="e.g. 1-10, 11-50, 51-200"
              onChange={(v) => setForm((f) => ({ ...f, companySize: v }))}
            />
            <Field
              label="Website"
              value={form.website}
              editing={editing}
              placeholder="https://yourcompany.com"
              onChange={(v) => setForm((f) => ({ ...f, website: v }))}
            />
          </div>

          {!editing && !profile.companyName && (
            <div className={styles.emptyCompany}>
              <p>No company details added yet.</p>
              <button
                className={styles.editBtn}
                onClick={() => setEditing(true)}
              >
                Add details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, editing, placeholder, onChange }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {editing ? (
        <input
          className={styles.fieldInput}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className={styles.fieldValue}>
          {value || <span className={styles.fieldEmpty}>Not set</span>}
        </p>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoIcon}>{icon}</span>
      <div>
        <p className={styles.infoLabel}>{label}</p>
        <p className={styles.infoValue}>{value}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skeletonTitle} />
      <div className={styles.layout}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonPanel} />
      </div>
    </div>
  );
}
