import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./SubscriptionSuccess.module.css";
import { useSubscription } from "../context/SubscriptionContext";

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const planId = searchParams.get("plan");
  const { user } = useAuthStore();
  const { refresh } = useSubscription();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying");
  const [data, setData] = useState(null);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }

    api
      .post("/subscriptions/verify", { sessionId })
      .then(async (res) => {
        setData(res.data.data);
        setStatus("success");
        refresh();

        // Fetch invoice
        try {
          const inv = await api.get(`/subscriptions/invoice/${sessionId}`);
          setInvoice(inv.data.data);
        } catch {}
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  const role = user?.role?.toLowerCase();

  if (status === "verifying") {
    return (
      <div className={styles.page}>
        <div className={styles.verifying}>
          <span className={styles.spinner} />
          <p>Activating your subscription...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Payment verification failed</h2>
          <p>Please contact support with your session ID: {sessionId}</p>
          <Link
            to={`/dashboard/${role}/subscription`}
            className={styles.backBtn}
          >
            Back to Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Success header */}
        <div className={styles.successHeader}>
          <div className={styles.checkCircle}>✓</div>
          <h1 className={styles.successTitle}>You're all set!</h1>
          <p className={styles.successSub}>
            <strong>{data?.plan?.name}</strong> is now active on your account.
          </p>
        </div>

        {/* Plan highlights */}
        {data?.plan && (
          <div className={styles.planHighlights}>
            <div className={styles.highlightRow}>
              <span className={styles.highlightLabel}>Plan</span>
              <span className={styles.highlightValue}>{data.plan.name}</span>
            </div>
            <div className={styles.highlightRow}>
              <span className={styles.highlightLabel}>Billing</span>
              <span className={styles.highlightValue}>
                USD ${data.plan.price}/month
              </span>
            </div>
            {data.subscription?.expiresAt && (
              <div className={styles.highlightRow}>
                <span className={styles.highlightLabel}>Next renewal</span>
                <span className={styles.highlightValue}>
                  {new Date(data.subscription.expiresAt).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Features unlocked */}
        {data?.plan?.features && (
          <div className={styles.featuresUnlocked}>
            <p className={styles.featuresTitle}>Features now unlocked:</p>
            <div className={styles.featuresList}>
              {data.plan.features.map((f, i) => (
                <div key={i} className={styles.featureItem}>
                  <span className={styles.featureCheck}>✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice */}
        <div className={styles.invoiceSection}>
          {invoice?.invoiceUrl ? (
            <>
              <a
                href={invoice.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.invoiceBtn}
              >
                📄 View Invoice
              </a>
              {invoice.pdfUrl && (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.invoiceBtn}
                >
                  ⬇️ Download PDF
                </a>
              )}
            </>
          ) : (
            <button
              className={styles.invoicePrint}
              onClick={() => window.print()}
            >
              🖨️ Print Receipt
            </button>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Link to={`/dashboard/${role}`} className={styles.dashboardBtn}>
            Go to Dashboard →
          </Link>
          <Link
            to={`/dashboard/${role}/subscription`}
            className={styles.manageBtn}
          >
            Manage Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
