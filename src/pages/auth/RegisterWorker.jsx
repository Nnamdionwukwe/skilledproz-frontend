import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./WorkerRegister.module.css";
import { ArrowLeft } from "lucide-react";

const ALL_CURRENCIES = [
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

const STEPS = [
  { id: "account", label: "Account", icon: "👤" },
  { id: "profile", label: "Profile", icon: "👷" },
  { id: "category", label: "Category", icon: "🏷️" },
  { id: "pricing", label: "Pricing", icon: "💰" },
];

export default function WorkerRegister() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false); // ← fixed: own state

  // Step 0 — Account
  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    country: "",
    city: "",
  });

  // Step 1 — Profile
  const [profile, setProfile] = useState({
    title: "",
    description: "",
    yearsExperience: "",
    serviceRadius: "25",
  });

  // Step 2 — Categories
  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [primaryCatId, setPrimaryCatId] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  // Step 3 — Pricing
  const [pricing, setPricing] = useState({
    currency: "USD",
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    customRate: "",
    customRateLabel: "",
    pricingNote: "",
  });

  // Load categories
  useEffect(() => {
    api
      .get(`/categories?limit=1000`)
      .then((res) => {
        const data = res.data.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {});
  }, []);

  const filteredCats = categories.filter(
    (c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  function toggleCat(cat) {
    setSelectedCats((prev) => {
      const exists = prev.find((c) => c.id === cat.id);
      if (exists) {
        const next = prev.filter((c) => c.id !== cat.id);
        if (primaryCatId === cat.id) setPrimaryCatId(next[0]?.id || "");
        return next;
      }
      if (prev.length >= 5) return prev;
      const next = [...prev, cat];
      if (!primaryCatId) setPrimaryCatId(cat.id);
      return next;
    });
  }

  async function handleAddCustomCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await api.post("/categories/suggest", {
        name: customCatName.trim(),
      });
      const cat = res.data.data.category;
      setCategories((prev) =>
        prev.find((c) => c.id === cat.id) ? prev : [...prev, cat],
      );
      toggleCat(cat);
      setCustomCatName("");
      setShowCustomCat(false);
      setCatSearch("");
    } catch {
      setError("Failed to add custom category");
    } finally {
      setAddingCat(false);
    }
  }

  function validateStep() {
    if (step === 0) {
      if (!account.firstName || !account.lastName)
        return "First and last name required";
      if (!account.email) return "Email required";
      if (account.password.length < 8)
        return "Password must be at least 8 characters";
      if (account.password !== account.confirm) return "Passwords do not match";
    }
    if (step === 1) {
      if (!profile.title) return "Professional title required";
      if (!profile.description) return "Description required";
    }
    if (step === 2) {
      if (selectedCats.length === 0) return "Select at least one category";
    }
    if (step === 3) {
      const hasRate =
        pricing.hourlyRate ||
        pricing.dailyRate ||
        pricing.weeklyRate ||
        pricing.monthlyRate ||
        pricing.customRate;
      if (!hasRate)
        return "Set at least one rate (hourly, daily, weekly, monthly, or custom)";
      if (!agreed) return "Please agree to the Terms and Privacy Policy";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        // Account fields (top-level)
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone || undefined,
        password: account.password,
        country: account.country || undefined,
        city: account.city || undefined,
        role: "WORKER",

        // Worker profile nested object — matches auth.controller.js
        workerProfile: {
          title: profile.title,
          description: profile.description,
          yearsExperience: parseInt(profile.yearsExperience) || 0,
          serviceRadius: parseInt(profile.serviceRadius) || 25,
          currency: pricing.currency,
          hourlyRate: parseFloat(pricing.hourlyRate) || 0,
          dailyRate: pricing.dailyRate ? parseFloat(pricing.dailyRate) : null,
          weeklyRate: pricing.weeklyRate
            ? parseFloat(pricing.weeklyRate)
            : null,
          monthlyRate: pricing.monthlyRate
            ? parseFloat(pricing.monthlyRate)
            : null,
          customRate: pricing.customRate
            ? parseFloat(pricing.customRate)
            : null,
          customRateLabel: pricing.customRateLabel || null,
          pricingNote: pricing.pricingNote || null,
        },

        // Categories array
        categories: selectedCats.map((c) => ({
          categoryId: c.id,
          isPrimary: c.id === primaryCatId,
        })),
      };

      const res = await api.post("/auth/register", payload);
      setAuth(
        res.data.data.user,
        res.data.data.accessToken,
        res.data.data.refreshToken,
      );
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  // Shorthand setters
  const a = (k, v) => setAccount((p) => ({ ...p, [k]: v }));
  const p = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const pr = (k, v) => setPricing((p) => ({ ...p, [k]: v }));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button
          className={styles.backBtn}
          onClick={() => navigate("/register")}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className={styles.header}>
          <span className={styles.eyebrow}>Worker account</span>
          <h1 className={styles.title}>Start earning on your terms</h1>
        </div>
        <p className={styles.sub}>
          Set up your profile and start getting hired
        </p>

        {/* Step indicators */}
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.stepItem} ${i <= step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}
            >
              <div className={styles.stepDot}>{i < step ? "✓" : s.icon}</div>
              <span className={styles.stepLabel}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <div
                  className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ""}`}
                />
              )}
            </div>
          ))}
        </div>

        {error && <div className={styles.errorBox}>⚠️ {error}</div>}

        <div className={styles.card}>
          {/* ── STEP 0: Account ── */}
          {step === 0 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Create your account</h2>
              <div className={styles.row2}>
                <Field
                  label="First Name *"
                  value={account.firstName}
                  onChange={(v) => a("firstName", v)}
                  placeholder="John"
                />
                <Field
                  label="Last Name *"
                  value={account.lastName}
                  onChange={(v) => a("lastName", v)}
                  placeholder="Doe"
                />
              </div>
              <Field
                label="Email *"
                value={account.email}
                onChange={(v) => a("email", v)}
                type="email"
                placeholder="you@example.com"
              />
              <Field
                label="Phone"
                value={account.phone}
                onChange={(v) => a("phone", v)}
                type="tel"
                placeholder="+234..."
              />
              <div className={styles.row2}>
                <Field
                  label="Country"
                  value={account.country}
                  onChange={(v) => a("country", v)}
                  placeholder="Nigeria"
                />
                <Field
                  label="City"
                  value={account.city}
                  onChange={(v) => a("city", v)}
                  placeholder="Lagos"
                />
              </div>
              <Field
                label="Password * (min 8 chars)"
                value={account.password}
                onChange={(v) => a("password", v)}
                type="password"
              />
              <Field
                label="Confirm Password *"
                value={account.confirm}
                onChange={(v) => a("confirm", v)}
                type="password"
              />
            </div>
          )}

          {/* ── STEP 1: Profile ── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Your professional profile</h2>
              <Field
                label="Professional Title *"
                value={profile.title}
                onChange={(v) => p("title", v)}
                placeholder="e.g. Certified Electrician"
              />
              <Field
                label="Description *"
                value={profile.description}
                onChange={(v) => p("description", v)}
                multiline
                placeholder="Describe your skills, experience, specializations..."
              />
              <div className={styles.row2}>
                <Field
                  label="Years of Experience"
                  value={profile.yearsExperience}
                  onChange={(v) => p("yearsExperience", v)}
                  type="number"
                  placeholder="0"
                />
                <Field
                  label="Service Radius (km)"
                  value={profile.serviceRadius}
                  onChange={(v) => p("serviceRadius", v)}
                  type="number"
                  placeholder="25"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Categories ── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Your service categories</h2>
              <p className={styles.stepHint}>
                Select up to 5 categories. Mark one as primary.
              </p>

              {selectedCats.length > 0 && (
                <div className={styles.selectedCats}>
                  {selectedCats.map((c) => (
                    <div
                      key={c.id}
                      className={`${styles.selectedChip} ${c.id === primaryCatId ? styles.selectedChipPrimary : ""}`}
                    >
                      <span>
                        {c.icon} {c.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrimaryCatId(c.id)}
                        className={styles.setPrimaryBtn}
                        title={
                          c.id === primaryCatId ? "Primary" : "Set as primary"
                        }
                      >
                        {c.id === primaryCatId ? "⭐" : "☆"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCat(c)}
                        className={styles.removeCatBtn}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                className={styles.input}
                placeholder="🔍 Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
              />

              <div className={styles.catGrid}>
                {filteredCats.slice(0, 60).map((c) => {
                  const selected = selectedCats.find((s) => s.id === c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      className={`${styles.catChip} ${selected ? styles.catChipSelected : ""}`}
                      onClick={() => toggleCat(c)}
                    >
                      {c.icon && <span>{c.icon}</span>}
                      <span>{c.name}</span>
                      {selected && <span className={styles.catCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {!showCustomCat ? (
                <button
                  type="button"
                  className={styles.addCatBtn}
                  onClick={() => setShowCustomCat(true)}
                >
                  + Add a custom category
                </button>
              ) : (
                <div className={styles.customCatBox}>
                  <input
                    className={styles.input}
                    autoFocus
                    placeholder="e.g. Solar Panel Installation"
                    value={customCatName}
                    onChange={(e) => setCustomCatName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddCustomCategory()
                    }
                  />
                  <div className={styles.row2}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={handleAddCustomCategory}
                      disabled={addingCat || !customCatName.trim()}
                    >
                      {addingCat ? "Adding..." : "Add Category"}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => {
                        setShowCustomCat(false);
                        setCustomCatName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Pricing ── */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Set your rates</h2>
              <p className={styles.stepHint}>
                Leave blank to hide that option from your profile. Set at least
                one rate.
              </p>

              <div className={styles.field}>
                <label className={styles.label}>Currency</label>
                <select
                  className={styles.select}
                  value={pricing.currency}
                  onChange={(e) => pr("currency", e.target.value)}
                >
                  {ALL_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.pricingGrid}>
                <PriceField
                  label="⏱ Hourly Rate"
                  suffix="/hr"
                  value={pricing.hourlyRate}
                  onChange={(v) => pr("hourlyRate", v)}
                />
                <PriceField
                  label="📅 Daily Rate"
                  suffix="/day"
                  value={pricing.dailyRate}
                  onChange={(v) => pr("dailyRate", v)}
                />
                <PriceField
                  label="📆 Weekly Rate"
                  suffix="/wk"
                  value={pricing.weeklyRate}
                  onChange={(v) => pr("weeklyRate", v)}
                />
                <PriceField
                  label="🗓 Monthly Rate"
                  suffix="/mo"
                  value={pricing.monthlyRate}
                  onChange={(v) => pr("monthlyRate", v)}
                />
              </div>

              <div className={styles.divider}>Custom Rate</div>
              <div className={styles.row2}>
                <Field
                  label="Custom Rate Amount"
                  value={pricing.customRate}
                  type="number"
                  onChange={(v) => pr("customRate", v)}
                  placeholder="0.00"
                />
                <Field
                  label="Custom Label"
                  value={pricing.customRateLabel}
                  onChange={(v) => pr("customRateLabel", v)}
                  placeholder="e.g. per project"
                />
              </div>
              <Field
                label="Pricing Note (optional)"
                value={pricing.pricingNote}
                multiline
                onChange={(v) => pr("pricingNote", v)}
                placeholder="Discounts, terms, travel fees..."
              />

              {/* Live preview */}
              {(pricing.hourlyRate ||
                pricing.dailyRate ||
                pricing.weeklyRate ||
                pricing.monthlyRate ||
                pricing.customRate) && (
                <div className={styles.pricingPreview}>
                  <p className={styles.previewTitle}>Your rates preview</p>
                  <div className={styles.previewPills}>
                    {pricing.hourlyRate && (
                      <span className={styles.previewPill}>
                        {pricing.currency} {pricing.hourlyRate}/hr
                      </span>
                    )}
                    {pricing.dailyRate && (
                      <span className={styles.previewPill}>
                        {pricing.currency} {pricing.dailyRate}/day
                      </span>
                    )}
                    {pricing.weeklyRate && (
                      <span className={styles.previewPill}>
                        {pricing.currency} {pricing.weeklyRate}/wk
                      </span>
                    )}
                    {pricing.monthlyRate && (
                      <span className={styles.previewPill}>
                        {pricing.currency} {pricing.monthlyRate}/mo
                      </span>
                    )}
                    {pricing.customRate && (
                      <span className={styles.previewPill}>
                        {pricing.currency} {pricing.customRate}
                        {pricing.customRateLabel
                          ? `/${pricing.customRateLabel}`
                          : "/custom"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Terms agreement — only on final step ── */}
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setError("");
                  }}
                />
                I agree to the{" "}
                <Link
                  to="/terms"
                  className={styles.link}
                  style={{ marginLeft: 3 }}
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className={styles.link}>
                  Privacy Policy
                </Link>
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className={styles.navRow}>
            {step > 0 && (
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setStep((s) => s - 1);
                  setError("");
                }}
              >
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button className={styles.primaryBtn} onClick={next}>
                Continue →
              </button>
            ) : (
              <button
                className={styles.primaryBtn}
                onClick={handleSubmit}
                disabled={loading || !agreed}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} /> Creating account...
                  </>
                ) : (
                  "🚀 Create Account"
                )}
              </button>
            )}
          </div>
        </div>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
        <p className={styles.footer} style={{ marginTop: 6 }}>
          Hiring someone?{" "}
          <Link to="/register/hirer" className={styles.link}>
            Register as Hirer
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {multiline ? (
        <textarea
          className={styles.textarea}
          value={value || ""}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
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

function PriceField({ label, suffix, value, onChange }) {
  return (
    <div className={styles.priceField}>
      <label className={styles.label}>{label}</label>
      <div className={styles.priceWrap}>
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
