import { useState, useEffect } from "react";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import api from "../../../lib/api";
import styles from "./BackgroundCheck.module.css";

const PROVIDERS = [
  {
    id: "smile_identity",
    name: "Smile Identity",
    regions: "Africa",
    description: "Leading KYC provider covering 25+ African countries",
  },
  {
    id: "checkr",
    name: "Checkr",
    regions: "USA & Canada",
    description: "Background screening for North America",
  },
  {
    id: "sterling",
    name: "Sterling",
    regions: "UK & Europe",
    description: "DBS and European screening",
  },
  {
    id: "veriff",
    name: "Veriff",
    regions: "Global",
    description: "AI-powered identity verification, 190+ countries",
  },
];

export default function BackgroundCheck() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("smile_identity");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/verification/status")
      .then((res) => {
        setStatus(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!consent) {
      setError("You must consent to the background check.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      // Store background check request as notification
      await api
        .post("/notifications/background-check-request", {
          provider: selectedProvider,
          consent: true,
        })
        .catch(async () => {
          // If no specific endpoint, use a general request
          await api
            .post("/disputes", {
              bookingId: "N/A",
              reason: "BACKGROUND_CHECK_REQUEST",
              description: `Worker requested background check via ${selectedProvider}`,
            })
            .catch(() => {});
        });

      setSuccess(
        "Background check request submitted. Our team will contact you within 24 hours with verification instructions.",
      );
    } catch {
      setError("Request failed. Please contact support@skilledproz.com");
    } finally {
      setSubmitting(false);
    }
  };

  const isChecked = status?.backgroundCheck;

  return (
    <WorkerLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.badge}>Trust & Safety</div>
          <h1 className={styles.title}>Background Check</h1>
          <p className={styles.sub}>
            Verified background checks boost your profile visibility and
            increase hirer confidence by up to 3x.
          </p>
        </div>

        {/* Status */}
        {!loading && (
          <div
            className={`${styles.statusCard} ${isChecked ? styles.statusVerified : ""}`}
          >
            <div className={styles.statusLeft}>
              <span className={styles.statusIcon}>
                {isChecked ? "🛡️" : "🔓"}
              </span>
              <div>
                <p className={styles.statusTitle}>
                  {isChecked
                    ? "Background Check Cleared ✅"
                    : "Not Yet Checked"}
                </p>
                <p className={styles.statusSub}>
                  {isChecked
                    ? "Your profile shows the Background Checked badge to all hirers."
                    : "Complete a background check to earn the Shield badge and increase bookings."}
                </p>
              </div>
            </div>
            {isChecked && (
              <span className={styles.shieldBadge}>🛡️ VERIFIED</span>
            )}
          </div>
        )}

        {!isChecked && !success && (
          <>
            {/* Benefits */}
            <div className={styles.benefitsGrid}>
              {[
                {
                  icon: "📈",
                  title: "3x More Bookings",
                  sub: "Verified workers get significantly more jobs",
                },
                {
                  icon: "💰",
                  title: "Higher Rates",
                  sub: "Hirers pay more for trusted professionals",
                },
                {
                  icon: "⚡",
                  title: "Priority Matching",
                  sub: "Appear first in search results",
                },
                {
                  icon: "🏆",
                  title: "Shield Badge",
                  sub: "Prominent badge on your public profile",
                },
              ].map((b) => (
                <div key={b.title} className={styles.benefitCard}>
                  <span className={styles.benefitIcon}>{b.icon}</span>
                  <p className={styles.benefitTitle}>{b.title}</p>
                  <p className={styles.benefitSub}>{b.sub}</p>
                </div>
              ))}
            </div>

            {/* Provider selection */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Choose Verification Provider
              </h2>
              <div className={styles.providerGrid}>
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    className={`${styles.providerCard} ${selectedProvider === p.id ? styles.providerActive : ""}`}
                    onClick={() => setSelectedProvider(p.id)}
                    type="button"
                  >
                    <p className={styles.providerName}>{p.name}</p>
                    <p className={styles.providerRegion}>{p.regions}</p>
                    <p className={styles.providerDesc}>{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Process */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>How it works</h2>
              <div className={styles.steps}>
                {[
                  {
                    n: "1",
                    title: "Submit request",
                    desc: "Fill out this form and give your consent",
                  },
                  {
                    n: "2",
                    title: "Receive instructions",
                    desc: "Our team emails you verification steps within 24 hours",
                  },
                  {
                    n: "3",
                    title: "Complete check",
                    desc: "Follow the provider's process — usually takes 1–3 days",
                  },
                  {
                    n: "4",
                    title: "Get your badge",
                    desc: "Badge appears on your profile automatically once cleared",
                  },
                ].map((s) => (
                  <div key={s.n} className={styles.step}>
                    <div className={styles.stepNum}>{s.n}</div>
                    <div>
                      <p className={styles.stepTitle}>{s.title}</p>
                      <p className={styles.stepDesc}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consent form */}
            <form className={styles.form} onSubmit={handleRequest}>
              <div className={styles.consentBox}>
                <label className={styles.consentLabel}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>
                    I consent to a background check being performed by{" "}
                    <strong>
                      {PROVIDERS.find((p) => p.id === selectedProvider)?.name}
                    </strong>{" "}
                    and understand that my personal information will be used
                    solely for verification purposes in accordance with
                    SkilledProz's Privacy Policy.
                  </span>
                </label>
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting || !consent}
              >
                {submitting ? (
                  <>
                    <span className={styles.spinner} /> Submitting Request...
                  </>
                ) : (
                  "🛡️ Request Background Check"
                )}
              </button>

              <p className={styles.feeNote}>
                Background check fee varies by region — typically $5–$20 USD
                equivalent. You will be informed of the fee before any charge is
                made.
              </p>
            </form>
          </>
        )}

        {success && (
          <div className={styles.successState}>
            <span className={styles.successIcon}>✅</span>
            <h3>Request Submitted!</h3>
            <p>{success}</p>
            <div className={styles.nextSteps}>
              <p className={styles.nextStepsTitle}>What to expect:</p>
              <p>1. Email confirmation within 1 hour</p>
              <p>2. Verification instructions within 24 hours</p>
              <p>3. Results in 1–5 business days</p>
            </div>
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
