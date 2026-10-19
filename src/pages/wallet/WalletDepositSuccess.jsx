// src/pages/wallet/WalletDepositSuccess.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import styles from "./WalletDepositSuccess.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaWallet,
} from "react-icons/fa";

export default function WalletDepositSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isHydrated } = useAuthStore();

  const [status, setStatus] = useState("waiting"); // waiting | verifying | success | failed
  const [errorMsg, setErrorMsg] = useState("");
  const [amount, setAmount] = useState(null);
  const [currency, setCurrency] = useState("NGN");

  // Wait for auth hydration before verifying — otherwise the first api.get
  // fires without a token and the axios 401 interceptor kicks the user to
  // /login.
  useEffect(() => {
    if (!isHydrated) return;
    if (status !== "waiting") return;

    const reference =
      searchParams.get("tx_ref") ||
      searchParams.get("reference") ||
      searchParams.get("ref");
    const flwStatus = searchParams.get("status");

    if (!reference) {
      setStatus("failed");
      setErrorMsg("No payment reference found in the callback URL.");
      return;
    }

    if (flwStatus === "cancelled" || flwStatus === "failed") {
      setStatus("failed");
      setErrorMsg("The payment was cancelled or failed.");
      return;
    }

    setStatus("verifying");

    api
      .get(`/wallet/verify/${encodeURIComponent(reference)}`)
      .then((res) => {
        const data = res.data.data || {};
        setAmount(data.amount || null);
        setCurrency(data.currency || "NGN");

        if (data.status === "SUCCESS") {
          setStatus("success");
          setTimeout(() => {
            navigate("/dashboard/hirer/wallet", { replace: true });
          }, 3000);
        } else if (data.status === "FAILED") {
          setStatus("failed");
          setErrorMsg("Payment was not successful.");
        } else {
          // PENDING — retry once
          setTimeout(async () => {
            try {
              const retry = await api.get(
                `/wallet/verify/${encodeURIComponent(reference)}`,
              );
              if (retry.data.data?.status === "SUCCESS") {
                setStatus("success");
                setAmount(retry.data.data.amount);
                setCurrency(retry.data.data.currency || "NGN");
                setTimeout(() => {
                  navigate("/dashboard/hirer/wallet", { replace: true });
                }, 3000);
              } else {
                setStatus("failed");
                setErrorMsg(
                  "We are still verifying your payment. Please check your wallet in a few minutes.",
                );
              }
            } catch {
              setStatus("failed");
              setErrorMsg(
                "Verification is taking longer than expected. Please check your wallet.",
              );
            }
          }, 4000);
        }
      })
      .catch((err) => {
        setStatus("failed");
        setErrorMsg(
          err.response?.data?.message ||
            "We couldn't verify your payment. Please contact support.",
        );
      });
  }, [isHydrated, status, searchParams, navigate]);

  const goToWallet = () =>
    navigate("/dashboard/hirer/wallet", { replace: true });

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.card}>
          {(status === "waiting" || status === "verifying") && (
            <>
              <div className={styles.spinnerWrap}>
                <FaSpinner className={styles.spinner} />
              </div>
              <h1 className={styles.title}>
                {status === "waiting"
                  ? "Preparing verification..."
                  : "Verifying your deposit"}
              </h1>
              <p className={styles.text}>
                Please wait while we confirm your payment with Flutterwave...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className={styles.successIcon}>
                <FaCheckCircle />
              </div>
              <h1 className={styles.title}>Deposit Confirmed 🎉</h1>
              <p className={styles.text}>
                {amount
                  ? `Your wallet has been funded with ${currency} ${Number(
                      amount,
                    ).toLocaleString()}.`
                  : "Your wallet has been funded."}
              </p>
              <p className={styles.subText}>
                Redirecting you back to your wallet...
              </p>
            </>
          )}

          {status === "failed" && (
            <>
              <div className={styles.failIcon}>
                <FaTimesCircle />
              </div>
              <h1 className={styles.title}>Payment Could Not Be Confirmed</h1>
              <p className={styles.text}>{errorMsg}</p>
              <button
                type="button"
                onClick={goToWallet}
                className={styles.button}
              >
                <FaWallet /> Back to Wallet
              </button>
            </>
          )}
        </div>
      </div>
    </HirerLayout>
  );
}
