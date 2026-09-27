import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import api from "../../lib/api";
import AuthLayout from "../../components/auth/AuthLayout";
import s from "../../components/auth/form.module.css";
import tracker from "../../lib/analytics/tracker";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [verifyStatus, setVerifyStatus] = useState(
    token ? "verifying" : "idle",
  );
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("idle");
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token || hasVerified.current) return;
    hasVerified.current = true;

    // ── ANALYTICS: verification link opened ──────────────────────────────
    tracker.action("verifyEmail.token.attempt", {
      hasToken: true,
    });

    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setVerifyStatus("success");
        // ── ANALYTICS: verification succeeded ─────────────────────────
        tracker.action("verifyEmail.token.success");
      })
      .catch(() => {
        setVerifyStatus("error");
        // ── ANALYTICS: verification failed (expired/invalid token) ────
        tracker.action("verifyEmail.token.failed", {
          reason: "invalid_or_expired",
        });
      });
  }, [token]);

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.verifyEmail.view", {
      cameWithToken: !!token,
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendStatus("sending");

    // ── ANALYTICS: resend requested ──────────────────────────────────────
    tracker.action("verifyEmail.resend.attempt", {
      emailDomain: resendEmail.split("@")[1] || null,
    });

    try {
      await api.post("/auth/resend-verification", { email: resendEmail });
      setResendStatus("sent");

      // ── ANALYTICS: resend succeeded ──────────────────────────────────
      tracker.action("verifyEmail.resend.sent", {
        emailDomain: resendEmail.split("@")[1] || null,
      });
    } catch (error) {
      // Check if the backend returned a specific 404 message
      const backendMessage = error.response?.data?.message;

      // If the backend says "User not found", show a helpful message
      if (backendMessage === "User not found") {
        setResendStatus("user_not_found");

        // ── ANALYTICS: resend failed, no account ───────────────────────
        tracker.action("verifyEmail.resend.userNotFound", {
          emailDomain: resendEmail.split("@")[1] || null,
        });
      } else {
        setResendStatus("error");

        // ── ANALYTICS: resend failed, other reason ─────────────────────
        tracker.action("verifyEmail.resend.failed", {
          emailDomain: resendEmail.split("@")[1] || null,
          reason: backendMessage || "unknown",
        });
      }
    }
  };

  if (verifyStatus === "verifying")
    return (
      <AuthLayout>
        <div className={s.container}>
          <div className={s.stateBox}>
            <div
              className={s.stateIcon}
              style={{ animation: "pulse 1.4s ease infinite" }}
            >
              ⏳
            </div>
            <div className={s.stateTitle}>Verifying your email…</div>
          </div>
        </div>
      </AuthLayout>
    );

  if (verifyStatus === "success")
    return (
      <AuthLayout>
        <div className={s.container}>
          <div
            className={s.stateBox}
            style={{
              borderColor: "rgba(34,197,94,0.2)",
              background: "rgba(34,197,94,0.04)",
            }}
          >
            <CheckCircle2 size={44} color="var(--green)" />
            <div className={s.stateTitle}>Email verified! 🎉</div>
            <p className={s.stateSub}>Your account is now active.</p>
          </div>
          <button
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={() => {
              tracker.action("verifyEmail.continueToSignIn.clicked");
              navigate("/login");
            }}
            data-track-id="verifyEmail.continueToSignIn"
          >
            Continue to Sign In →
          </button>
        </div>
      </AuthLayout>
    );

  if (verifyStatus === "error")
    return (
      <AuthLayout>
        <div className={s.container}>
          <div
            className={s.stateBox}
            style={{
              borderColor: "rgba(239,68,68,0.2)",
              background: "var(--red-dim)",
            }}
          >
            <XCircle size={44} color="var(--red)" />
            <div className={s.stateTitle}>Verification failed</div>
            <p className={s.stateSub}>This link is invalid or expired.</p>
          </div>
          <Link
            to="/login"
            className={`${s.btn} ${s.btnOutline}`}
            style={{ textDecoration: "none", textAlign: "center" }}
            data-track-id="verifyEmail.error.backToSignIn"
          >
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout>
      <div className={s.container}>
        <div className={s.header}>
          <span className={s.eyebrow}>One more step</span>
          <h1 className={s.title}>
            Check your
            <br />
            inbox
          </h1>
          <p className={s.subtitle}>
            We sent a verification link to your email. Click it to activate your
            account.
          </p>
        </div>
        <div className={s.stateBox}>
          <div className={s.stateIcon}>📬</div>
          <p className={s.stateSub}>
            Didn't get it? Check spam or resend below.
          </p>
        </div>
        <div className={s.divider}>resend verification</div>
        <form className={s.form} onSubmit={handleResend} noValidate>
          <div className={s.field}>
            <label className={s.label}>Your email address</label>
            <input
              className={s.input}
              type="email"
              placeholder="you@example.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              onFocus={() => {
                if (!resendEmail) {
                  tracker.track("verifyEmail.form.email.focused");
                }
              }}
              required
              data-track-id="verifyEmail.form.email"
            />
          </div>
          {resendStatus === "sent" && (
            <div className={s.alertSuccess}>
              <CheckCircle2 size={14} /> Verification email sent!
            </div>
          )}
          {resendStatus === "error" && (
            <div className={s.alertError}>
              <AlertCircle size={14} /> Failed to send. Try again.
            </div>
          )}
          {resendStatus === "user_not_found" && (
            <div className={s.alertError}>
              <AlertCircle size={14} /> No account found with that email. Please
              use the email you signed up with.
            </div>
          )}
          <button
            type="submit"
            className={`${s.btn} ${s.btnOutline}`}
            disabled={
              resendStatus === "sending" ||
              resendStatus === "sent" ||
              !resendEmail?.trim()
            }
            data-track-id="verifyEmail.form.resend"
          >
            {resendStatus === "sending" && (
              <span className={`${s.spinner} ${s.spinnerLight}`} />
            )}
            <RefreshCw size={14} />
            {resendStatus === "sent"
              ? "Email sent!"
              : "Resend verification email"}
          </button>
        </form>
        <p className={s.footer}>
          <Link
            to="/login"
            className={s.link}
            data-track-id="verifyEmail.footer.backToSignIn"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
