// src/pages/hirer/WalletCallback.jsx
// Wallet funding callback page - handles success and failure from Flutterwave

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import styles from "./WalletCallback.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaWallet,
  FaArrowRight,
  FaHome,
  FaHistory,
} from "react-icons/fa";

export default function WalletCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [status, setStatus] = useState("loading"); // loading | success | failed
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("NGN");
  const [reference, setReference] = useState("");
  const [balance, setBalance] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const txRef = searchParams.get("tx_ref");
    const statusParam = searchParams.get("status");
    const transactionId = searchParams.get("transaction_id");

    if (!txRef) {
      setStatus("failed");
      setErrorMessage("No transaction reference found.");
      return;
    }

    setReference(txRef);

    // Verify the transaction
    const verifyTransaction = async () => {
      try {
        const res = await api.get(`/wallet/verify/${txRef}`);
        const data = res.data.data;

        if (data.status === "SUCCESS") {
          setStatus("success");
          setAmount(data.amount || 0);
          setCurrency(data.currency || "NGN");
          setBalance(data.balance || 0);
        } else if (data.status === "FAILED") {
          setStatus("failed");
          setErrorMessage("Payment was not successful. Please try again.");
        } else {
          // PENDING or PROCESSING - check status param from URL
          if (statusParam === "successful" || statusParam === "completed") {
            setStatus("success");
            setAmount(data.amount || 0);
            setCurrency(data.currency || "NGN");
            setBalance(data.balance || 0);
          } else {
            setStatus("failed");
            setErrorMessage(
              "Payment verification failed. Please contact support.",
            );
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
        // Check if it's actually successful based on URL param
        if (statusParam === "successful" || statusParam === "completed") {
          setStatus("success");
          // Try to get amount from URL or localStorage
          const savedAmount = localStorage.getItem("pendingDepositAmount");
          const savedCurrency = localStorage.getItem("pendingDepositCurrency");
          if (savedAmount) {
            setAmount(parseFloat(savedAmount));
            setCurrency(savedCurrency || "NGN");
            // Try to fetch updated balance
            try {
              const balanceRes = await api.get("/wallet/balance");
              setBalance(balanceRes.data.data?.balance || 0);
            } catch (e) {
              // Ignore
            }
          }
        } else {
          setStatus("failed");
          setErrorMessage(
            err.response?.data?.message ||
              "Unable to verify payment. Please check your wallet balance.",
          );
        }
      } finally {
        // Clean up localStorage
        localStorage.removeItem("pendingDepositAmount");
        localStorage.removeItem("pendingDepositCurrency");
      }
    };

    verifyTransaction();

    // Start countdown for auto-redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams]);

  // Auto-redirect after countdown
  useEffect(() => {
    if (countdown === 0 && status !== "loading") {
      navigate("/dashboard/hirer/wallet");
    }
  }, [countdown, status, navigate]);

  // ─── Loading State ──────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <HirerLayout>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.loadingState}>
              <FaSpinner className={styles.spinner} />
              <h2>Verifying Your Payment</h2>
              <p>Please wait while we confirm your transaction...</p>
            </div>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ─── Success State ──────────────────────────────────────────────────────

  if (status === "success") {
    return (
      <HirerLayout>
        <div className={styles.container}>
          <div className={`${styles.card} ${styles.successCard}`}>
            <div className={styles.iconWrapper}>
              <FaCheckCircle className={styles.successIcon} />
            </div>

            <h1 className={styles.title}>Payment Successful! 🎉</h1>
            <p className={styles.subtitle}>
              Your wallet has been funded successfully.
            </p>

            <div className={styles.amountDisplay}>
              <span className={styles.amountLabel}>Amount Funded</span>
              <span className={styles.amountValue}>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: currency,
                }).format(amount)}
              </span>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Reference</span>
                <span className={styles.detailValue}>{reference}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>New Balance</span>
                <span className={styles.detailValue}>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: currency,
                  }).format(balance)}
                </span>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.primaryBtn}
                onClick={() => navigate("/dashboard/hirer/wallet")}
              >
                <FaWallet /> Go to Wallet
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={() => navigate("/dashboard/hirer")}
              >
                <FaHome /> Dashboard
              </button>
            </div>

            <p className={styles.redirectNote}>
              Redirecting to wallet in {countdown} seconds...
            </p>
          </div>
        </div>
      </HirerLayout>
    );
  }

  // ─── Failed State ──────────────────────────────────────────────────────

  return (
    <HirerLayout>
      <div className={styles.container}>
        <div className={`${styles.card} ${styles.failedCard}`}>
          <div className={styles.iconWrapper}>
            <FaTimesCircle className={styles.failedIcon} />
          </div>

          <h1 className={styles.title}>Payment Failed</h1>
          <p className={styles.subtitle}>
            {errorMessage || "Your payment could not be completed."}
          </p>

          <div className={styles.detailsGrid}>
            {reference && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Reference</span>
                <span className={styles.detailValue}>{reference}</span>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={() => navigate("/dashboard/hirer/wallet")}
            >
              <FaWallet /> Go to Wallet
            </button>
            <button
              className={styles.secondaryBtn}
              onClick={() => navigate("/dashboard/hirer")}
            >
              <FaHome /> Dashboard
            </button>
          </div>

          <p className={styles.redirectNote}>
            Redirecting to wallet in {countdown} seconds...
          </p>
        </div>
      </div>
    </HirerLayout>
  );
}
