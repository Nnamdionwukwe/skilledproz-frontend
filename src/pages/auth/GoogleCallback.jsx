// src/pages/auth/GoogleCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import s from "../../components/auth/form.module.css";

/**
 * Handles the redirect from /api/auth/google/callback.
 *
 * Google redirects → backend → backend redirects here with:
 *   /auth/google/callback?accessToken=...&refreshToken=...&isNewUser=0|1
 *
 * We then:
 *   1. Read tokens from query
 *   2. Save to store + fetch user profile
 *   3. Redirect to the appropriate dashboard by role
 */
export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuthStore();

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const isNewUser = params.get("isNewUser") === "1";
    const errorParam = params.get("error");

    // ── Error case ──────────────────────────────────────────────────────────
    if (errorParam) {
      setStatus("error");
      setMessage("Google authentication was cancelled or failed.");
      return;
    }

    // ── Missing tokens ──────────────────────────────────────────────────────
    if (!accessToken || !refreshToken) {
      setStatus("error");
      setMessage("Missing authentication tokens. Please try again.");
      return;
    }

    // ── Success: save tokens + fetch user, then redirect ────────────────────
    (async () => {
      try {
        const user = await handleGoogleCallback(accessToken, refreshToken);
        setStatus("success");
        setMessage(
          isNewUser
            ? "Welcome! Your account is ready."
            : "Signed in successfully. Redirecting…",
        );

        // Brief pause so the user sees the success state
        setTimeout(() => {
          const dest =
            user.role === "WORKER" ? "/dashboard/worker" : "/dashboard/hirer";
          navigate(dest, { replace: true });
        }, 800);
      } catch (err) {
        setStatus("error");
        setMessage(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to complete Google sign-in.",
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthLayout>
      <div className={s.container} style={{ textAlign: "center" }}>
        {status === "loading" && (
          <>
            <div className={s.header}>
              <span className={s.eyebrow}>Signing you in</span>
              <h1 className={s.title}>One moment…</h1>
            </div>
            <div style={{ padding: "24px 0" }}>
              <Loader2
                size={36}
                style={{
                  margin: "0 auto",
                  animation: "spin 1s linear infinite",
                  color: "#0F0F6E",
                }}
              />
            </div>
            <p className={s.subtitle}>Verifying your Google account…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className={s.header}>
              <span className={s.eyebrow}>Success</span>
              <h1 className={s.title}>You're in! 🎉</h1>
            </div>
            <div style={{ padding: "20px 0" }}>
              <CheckCircle2
                size={48}
                style={{ margin: "0 auto", color: "#16a34a" }}
              />
            </div>
            <p className={s.subtitle}>{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className={s.header}>
              <span className={s.eyebrow}>Authentication failed</span>
              <h1 className={s.title}>Something went wrong</h1>
            </div>
            <div style={{ padding: "20px 0" }}>
              <XCircle
                size={48}
                style={{ margin: "0 auto", color: "#dc2626" }}
              />
            </div>
            <p className={s.subtitle}>{message}</p>
            <div style={{ marginTop: 24 }}>
              <Link
                to="/login"
                className={`${s.btn} ${s.btnPrimary}`}
                style={{ display: "inline-block", textDecoration: "none" }}
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
