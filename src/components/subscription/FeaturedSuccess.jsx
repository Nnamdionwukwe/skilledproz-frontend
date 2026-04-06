import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./SubscriptionSuccess.module.css";

export default function FeaturedSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }

    api
      .post("/featured/verify", { sessionId })
      .then((res) => {
        setData(res.data.data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  const role = user?.role?.toLowerCase();

  if (status === "verifying") {
    return (
      <div className={styles.page}>
        <div className={styles.verifying}>
          <span className={styles.spinner} />
          <p>Activating your featured listing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.successHeader}>
          <div
            className={styles.checkCircle}
            style={{ background: "var(--orange)" }}
          >
            ⭐
          </div>
          <h1 className={styles.successTitle}>You're Featured!</h1>
          <p className={styles.successSub}>
            Your listing is now at the top of search results.
          </p>
        </div>

        <div className={styles.planHighlights}>
          <div className={styles.highlightRow}>
            <span className={styles.highlightLabel}>Package</span>
            <span className={styles.highlightValue}>{data?.package?.name}</span>
          </div>
          <div className={styles.highlightRow}>
            <span className={styles.highlightLabel}>Reference</span>
            <span
              className={styles.highlightValue}
              style={{ fontFamily: "monospace", color: "var(--orange)" }}
            >
              {data?.reference}
            </span>
          </div>
          <div className={styles.highlightRow}>
            <span className={styles.highlightLabel}>Active until</span>
            <span className={styles.highlightValue}>
              {data?.expiresAt &&
                new Date(data.expiresAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
            </span>
          </div>
        </div>

        <div className={styles.invoiceSection}>
          <button
            className={styles.invoicePrint}
            onClick={() => window.print()}
          >
            🖨️ Print Receipt
          </button>
        </div>

        <div className={styles.actions}>
          <Link to={`/dashboard/${role}`} className={styles.dashboardBtn}>
            Go to Dashboard →
          </Link>
          <Link to={`/dashboard/${role}/featured`} className={styles.manageBtn}>
            Manage Listing
          </Link>
        </div>
      </div>
    </div>
  );
}
