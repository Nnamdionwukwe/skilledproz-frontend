import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  HardHat,
  Tag,
  Wallet,
  Check,
  Star,
  Plus,
  Search,
  Rocket,
  AlertTriangle,
} from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import g from "../../components/auth/GoogleSignInButton.module.css";
import styles from "./WorkerRegister.module.css";
import tracker from "../../lib/analytics/tracker";

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
  { id: "account", label: "Account", Icon: User },
  { id: "profile", label: "Profile", Icon: HardHat },
  { id: "category", label: "Category", Icon: Tag },
  { id: "pricing", label: "Pricing", Icon: Wallet },
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
    referralCode: "",
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

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.workerRegister.view", {
      hasRefFromUrl: !!new URLSearchParams(window.location.search).get("ref"),
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setAccount((p) => ({ ...p, referralCode: ref.toUpperCase() }));
  }, []);

  function toggleCat(cat) {
    setSelectedCats((prev) => {
      const exists = prev.find((c) => c.id === cat.id);
      if (exists) {
        const next = prev.filter((c) => c.id !== cat.id);
        if (primaryCatId === cat.id) setPrimaryCatId(next[0]?.id || "");
        tracker.track("workerRegister.category.removed", {
          categoryId: cat.id,
          categoryName: cat.name,
        });
        return next;
      }
      if (prev.length >= 5) return prev;
      const next = [...prev, cat];
      if (!primaryCatId) setPrimaryCatId(cat.id);
      tracker.track("workerRegister.category.added", {
        categoryId: cat.id,
        categoryName: cat.name,
        totalSelected: next.length,
      });
      return next;
    });
  }

  async function handleAddCustomCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);
    tracker.action("workerRegister.customCategory.attempt", {
      name: customCatName.trim(),
    });
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
      tracker.action("workerRegister.customCategory.created", {
        categoryId: cat.id,
        categoryName: cat.name,
      });
    } catch {
      setError("Failed to add custom category");
      tracker.action("workerRegister.customCategory.failed", {
        name: customCatName.trim(),
      });
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
      tracker.track("workerRegister.step.validationFailed", {
        step,
        stepId: STEPS[step]?.id,
        reason: err,
      });
      return;
    }
    setError("");
    const nextStep = step + 1;
    setStep(nextStep);
    tracker.track("workerRegister.step.advanced", {
      from: step,
      to: nextStep,
      fromId: STEPS[step]?.id,
      toId: STEPS[nextStep]?.id,
    });
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) {
      setError(err);
      tracker.track("workerRegister.submit.validationFailed", {
        reason: err,
      });
      return;
    }

    setLoading(true);
    setError("");

    tracker.action("workerRegister.submit.attempt", {
      hasPhone: !!account.phone,
      hasCountry: !!account.country,
      hasCity: !!account.city,
      hasReferralCode: !!account.referralCode?.trim(),
      categoryCount: selectedCats.length,
      hasPrimaryCategory: !!primaryCatId,
      currency: pricing.currency,
      hasHourly: !!pricing.hourlyRate,
      hasDaily: !!pricing.dailyRate,
      hasWeekly: !!pricing.weeklyRate,
      hasMonthly: !!pricing.monthlyRate,
      hasCustom: !!pricing.customRate,
    });

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

        ...(account.referralCode?.trim()
          ? { referralCode: account.referralCode.trim().toUpperCase() }
          : {}),
      };

      const res = await api.post("/auth/register", payload);
      setAuth(
        res.data.data.user,
        res.data.data.accessToken,
        res.data.data.refreshToken,
      );

      tracker.action("workerRegister.success", {
        categoryCount: selectedCats.length,
        primaryCategoryId: primaryCatId || null,
        currency: pricing.currency,
        hasReferralCode: !!account.referralCode?.trim(),
        emailDomain: account.email.split("@")[1] || null,
      });

      navigate("/dashboard/worker");
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed");
      tracker.action("workerRegister.failed", {
        reason: e.response?.data?.message || "unknown",
        emailDomain: account.email.split("@")[1] || null,
      });
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
          onClick={() => {
            tracker.track("workerRegister.back.clicked");
            navigate("/register");
          }}
          data-track-id="workerRegister.back"
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
          {STEPS.map((s, i) => {
            const StepIcon = s.Icon;
            return (
              <div
                key={s.id}
                className={`${styles.stepItem} ${i <= step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}
              >
                <div className={styles.stepDot}>
                  {i < step ? <Check size={15} /> : <StepIcon size={15} />}
                </div>
                <span className={styles.stepLabel}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ""}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className={styles.errorBox}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.card}>
          {/* ── STEP 0: Account ── */}
          {step === 0 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Create your account</h2>

              {/* ── Google Sign-Up ── */}
              <GoogleSignInButton mode="signup" role="WORKER" />
              <div className={g.divider}>or continue with email</div>

              <div className={styles.row2}>
                <Field
                  label="First Name *"
                  value={account.firstName}
                  onChange={(v) => a("firstName", v)}
                  placeholder="John"
                  trackId="workerRegister.firstName"
                />
                <Field
                  label="Last Name *"
                  value={account.lastName}
                  onChange={(v) => a("lastName", v)}
                  placeholder="Doe"
                  trackId="workerRegister.lastName"
                />
              </div>
              <Field
                label="Email *"
                value={account.email}
                onChange={(v) => a("email", v)}
                type="email"
                placeholder="you@example.com"
                trackId="workerRegister.email"
              />
              <Field
                label="Phone"
                value={account.phone}
                onChange={(v) => a("phone", v)}
                type="tel"
                placeholder="+234..."
                trackId="workerRegister.phone"
              />
              <div className={styles.row2}>
                <Field
                  label="Country"
                  value={account.country}
                  onChange={(v) => a("country", v)}
                  placeholder="Nigeria"
                  trackId="workerRegister.country"
                />
                <Field
                  label="City"
                  value={account.city}
                  onChange={(v) => a("city", v)}
                  placeholder="Lagos"
                  trackId="workerRegister.city"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Referral code{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. SPTEST01"
                  value={account.referralCode}
                  onChange={(e) =>
                    a("referralCode", e.target.value.toUpperCase())
                  }
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
                  maxLength={12}
                  data-track-id="workerRegister.referralCode"
                />
              </div>
              <Field
                label="Password * (min 8 chars)"
                value={account.password}
                onChange={(v) => a("password", v)}
                type="password"
                trackId="workerRegister.password"
              />
              <Field
                label="Confirm Password *"
                value={account.confirm}
                onChange={(v) => a("confirm", v)}
                type="password"
                trackId="workerRegister.confirmPassword"
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
                trackId="workerRegister.profileTitle"
              />
              <Field
                label="Description *"
                value={profile.description}
                onChange={(v) => p("description", v)}
                multiline
                placeholder="Describe your skills, experience, specializations..."
                trackId="workerRegister.profileDescription"
              />
              <div className={styles.row2}>
                <Field
                  label="Years of Experience"
                  value={profile.yearsExperience}
                  onChange={(v) => p("yearsExperience", v)}
                  type="number"
                  placeholder="0"
                  trackId="workerRegister.yearsExperience"
                />
                <Field
                  label="Service Radius (km)"
                  value={profile.serviceRadius}
                  onChange={(v) => p("serviceRadius", v)}
                  type="number"
                  placeholder="25"
                  trackId="workerRegister.serviceRadius"
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
                        onClick={() => {
                          setPrimaryCatId(c.id);
                          tracker.track("workerRegister.category.primarySet", {
                            categoryId: c.id,
                            categoryName: c.name,
                          });
                        }}
                        className={styles.setPrimaryBtn}
                        title={
                          c.id === primaryCatId ? "Primary" : "Set as primary"
                        }
                        data-track-id={`workerRegister.category.setPrimary.${c.id}`}
                      >
                        <Star
                          size={13}
                          fill={c.id === primaryCatId ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCat(c)}
                        className={styles.removeCatBtn}
                        aria-label="Remove category"
                        data-track-id={`workerRegister.category.remove.${c.id}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  className={styles.input}
                  placeholder="Search categories..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  data-track-id="workerRegister.categorySearch"
                />
              </div>

              <div className={styles.catGrid}>
                {filteredCats.slice(0, 60).map((c) => {
                  const selected = selectedCats.find((s) => s.id === c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      className={`${styles.catChip} ${selected ? styles.catChipSelected : ""}`}
                      onClick={() => toggleCat(c)}
                      data-track-id={`workerRegister.category.${c.id}`}
                    >
                      {c.icon && <span>{c.icon}</span>}
                      <span>{c.name}</span>
                      {selected && (
                        <span className={styles.catCheck}>
                          <Check size={11} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!showCustomCat ? (
                <button
                  type="button"
                  className={styles.addCatBtn}
                  onClick={() => {
                    setShowCustomCat(true);
                    tracker.track("workerRegister.customCategory.opened");
                  }}
                  data-track-id="workerRegister.customCategory.open"
                >
                  <Plus size={13} /> Add a custom category
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
                    data-track-id="workerRegister.customCategory.input"
                  />
                  <div className={styles.row2}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={handleAddCustomCategory}
                      disabled={addingCat || !customCatName.trim()}
                      data-track-id="workerRegister.customCategory.submit"
                    >
                      {addingCat ? "Adding..." : "Add Category"}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => {
                        setShowCustomCat(false);
                        setCustomCatName("");
                        tracker.track(
                          "workerRegister.customCategory.cancelled",
                        );
                      }}
                      data-track-id="workerRegister.customCategory.cancel"
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
                  onChange={(e) => {
                    const val = e.target.value;
                    pr("currency", val);
                    tracker.track("workerRegister.currency.changed", {
                      currency: val,
                    });
                  }}
                  data-track-id="workerRegister.currency"
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
                  label="Hourly Rate"
                  suffix="/hr"
                  value={pricing.hourlyRate}
                  onChange={(v) => pr("hourlyRate", v)}
                  trackId="workerRegister.hourlyRate"
                />
                <PriceField
                  label="Daily Rate"
                  suffix="/day"
                  value={pricing.dailyRate}
                  onChange={(v) => pr("dailyRate", v)}
                  trackId="workerRegister.dailyRate"
                />
                <PriceField
                  label="Weekly Rate"
                  suffix="/wk"
                  value={pricing.weeklyRate}
                  onChange={(v) => pr("weeklyRate", v)}
                  trackId="workerRegister.weeklyRate"
                />
                <PriceField
                  label="Monthly Rate"
                  suffix="/mo"
                  value={pricing.monthlyRate}
                  onChange={(v) => pr("monthlyRate", v)}
                  trackId="workerRegister.monthlyRate"
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
                  trackId="workerRegister.customRate"
                />
                <Field
                  label="Custom Label"
                  value={pricing.customRateLabel}
                  onChange={(v) => pr("customRateLabel", v)}
                  placeholder="e.g. per project"
                  trackId="workerRegister.customRateLabel"
                />
              </div>
              <Field
                label="Pricing Note (optional)"
                value={pricing.pricingNote}
                multiline
                onChange={(v) => pr("pricingNote", v)}
                placeholder="Discounts, terms, travel fees..."
                trackId="workerRegister.pricingNote"
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
                    tracker.track("workerRegister.terms.toggled", {
                      agreed: e.target.checked,
                    });
                  }}
                  data-track-id="workerRegister.terms.agree"
                />
                I agree to the{" "}
                <Link
                  to="/terms"
                  className={styles.link}
                  style={{ marginLeft: 3 }}
                  data-track-id="workerRegister.terms.link"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className={styles.link}
                  data-track-id="workerRegister.privacy.link"
                >
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
                  const prevStep = step - 1;
                  setStep(prevStep);
                  setError("");
                  tracker.track("workerRegister.step.wentBack", {
                    from: step,
                    to: prevStep,
                    fromId: STEPS[step]?.id,
                    toId: STEPS[prevStep]?.id,
                  });
                }}
                data-track-id="workerRegister.step.back"
              >
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                className={styles.primaryBtn}
                onClick={next}
                data-track-id={`workerRegister.step.${STEPS[step]?.id}.next`}
              >
                Continue →
              </button>
            ) : (
              <button
                className={styles.primaryBtn}
                onClick={handleSubmit}
                disabled={loading || !agreed}
                data-track-id="workerRegister.submit"
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} /> Creating account...
                  </>
                ) : (
                  <>
                    <Rocket size={14} /> Create Account
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link
            to="/login"
            className={styles.link}
            data-track-id="workerRegister.login.link"
          >
            Sign in
          </Link>
        </p>
        <p className={styles.footer} style={{ marginTop: 6 }}>
          Hiring someone?{" "}
          <Link
            to="/register/hirer"
            className={styles.link}
            data-track-id="workerRegister.hirer.link"
          >
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
  trackId,
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
          onFocus={() => {
            if (trackId && !value) {
              tracker.track(`${trackId}.focused`);
            }
          }}
          placeholder={placeholder}
          data-track-id={trackId}
        />
      ) : (
        <input
          className={styles.input}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (trackId && !value) {
              tracker.track(`${trackId}.focused`);
            }
          }}
          placeholder={placeholder}
          data-track-id={trackId}
        />
      )}
    </div>
  );
}

function PriceField({ label, suffix, value, onChange, trackId }) {
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
          data-track-id={trackId}
        />
        <span className={styles.priceSuffix}>{suffix}</span>
      </div>
    </div>
  );
}
