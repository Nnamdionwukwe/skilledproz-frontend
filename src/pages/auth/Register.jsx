// src/pages/auth/Register.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Briefcase, HardHat, AlertCircle } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import { useAuthStore } from "../../store/authStore";
import s from "../../components/auth/form.module.css";
import tracker from "../../lib/analytics/tracker";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleSignIn } = useAuthStore();

  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Detect a pending Google signup ────────────────────────────────────
  // Preferred: router state passed by Login's onNewUser handler.
  // Fallback: sessionStorage, in case the user reloads /register.
  const locationState = location.state || {};
  const storedPending = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("googlePendingSignup") || "null",
      );
    } catch {
      return null;
    }
  })();

  const pending =
    locationState.from === "google"
      ? {
          googleProfile: locationState.googleProfile,
          accessToken: locationState.accessToken,
          refCode: locationState.refCode || null,
        }
      : storedPending;

  const isGoogleSignup = !!(pending?.accessToken && pending?.googleProfile);

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.register.view", {
      isGoogleSignup,
      hasStoredRefCode: !!sessionStorage.getItem("pendingRefCode"),
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    if (!selected) return;

    // ── ANALYTICS: role selected + continue clicked ─────────────────────
    tracker.action("register.role.submitted", {
      role: selected,
      isGoogleSignup,
    });

    // ── Google signup: create the account with the chosen role ──────────
    if (isGoogleSignup) {
      setLoading(true);
      setError("");
      tracker.action("register.google.attempt", {
        role: selected,
      });
      try {
        const payload = {
          accessToken: pending.accessToken,
          role: selected,
        };
        // Forward the referral code if we captured one.
        const refCode =
          pending.refCode || sessionStorage.getItem("pendingRefCode") || null;
        if (refCode) payload.ref = refCode;

        const result = await googleSignIn(payload);
        sessionStorage.removeItem("googlePendingSignup");
        sessionStorage.removeItem("pendingRefCode");

        if (!result?.user) {
          setError("Could not complete signup. Please try again.");
          setLoading(false);
          tracker.action("register.google.failed", {
            role: selected,
            reason: "no_user_returned",
          });
          return;
        }

        const dest =
          result.user.role === "WORKER"
            ? "/dashboard/worker"
            : "/dashboard/hirer";

        tracker.action("register.google.success", {
          role: result.user.role,
          destination: dest,
          hadRefCode: !!refCode,
        });

        navigate(dest, { replace: true });
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Could not create your account. Please try again.",
        );
        setLoading(false);
        tracker.action("register.google.failed", {
          role: selected,
          reason: err?.response?.data?.message || "unknown",
        });
      }
      return;
    }

    // ── Normal email/password signup: route to the next step ────────────
    // Propagate the referral code so the email signup form can pick it up.
    const refCode = sessionStorage.getItem("pendingRefCode") || "";
    const suffix = refCode ? `?ref=${refCode}` : "";

    tracker.action("register.email.roleSelected", {
      role: selected,
      destination:
        selected === "HIRER" ? "/register/hirer" : "/register/worker",
      hadRefCode: !!refCode,
    });

    navigate(
      selected === "HIRER"
        ? `/register/hirer${suffix}`
        : `/register/worker${suffix}`,
    );
  };

  return (
    <AuthLayout>
      <div className={s.container}>
        <div className={s.header}>
          <span className={s.eyebrow}>
            {isGoogleSignup
              ? `Almost done, ${pending.googleProfile.firstName || ""}`
              : "Get started — it's free"}
          </span>
          <h1 className={s.title}>
            Join
            <br />
            SkilledProz
          </h1>
          <p className={s.subtitle}>
            {isGoogleSignup
              ? "One last step — how will you use the platform?"
              : "How will you use the platform?"}
          </p>
        </div>

        {isGoogleSignup && pending.googleProfile.email && (
          <div
            style={{
              fontSize: 13,
              opacity: 0.75,
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            Signing up as <strong>{pending.googleProfile.email}</strong>
          </div>
        )}

        {error && (
          <div
            className={s.alertError}
            style={{ marginBottom: 12, alignItems: "flex-start" }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div className={s.roleGrid}>
          <button
            type="button"
            className={`${s.roleCard} ${selected === "HIRER" ? s.roleCardActive : ""}`}
            onClick={() => {
              setSelected("HIRER");
              tracker.track("register.role.selected", {
                role: "HIRER",
                isGoogleSignup,
              });
            }}
            disabled={loading}
            data-track-id="register.role.hirer"
          >
            <div className={s.roleIcon}>
              <Briefcase size={20} />
            </div>
            <div className={s.roleTitle}>I'm a Hirer</div>
            <div className={s.roleDesc}>
              Find and book skilled professionals for any job.
            </div>
          </button>
          <button
            type="button"
            className={`${s.roleCard} ${selected === "WORKER" ? s.roleCardActive : ""}`}
            onClick={() => {
              setSelected("WORKER");
              tracker.track("register.role.selected", {
                role: "WORKER",
                isGoogleSignup,
              });
            }}
            disabled={loading}
            data-track-id="register.role.worker"
          >
            <div className={s.roleIcon}>
              <HardHat size={20} />
            </div>
            <div className={s.roleTitle}>I'm a Worker</div>
            <div className={s.roleDesc}>
              Offer your skills and get booked by clients.
            </div>
          </button>
        </div>

        <button
          className={`${s.btn} ${s.btnPrimary}`}
          disabled={!selected || loading}
          onClick={handleContinue}
          data-track-id="register.continue"
        >
          {loading && <span className={s.spinner} />}
          {loading
            ? "Creating account…"
            : `Continue as ${
                selected === "HIRER"
                  ? "Hirer"
                  : selected === "WORKER"
                    ? "Worker"
                    : "…"
              }`}
        </button>

        <p className={s.footer}>
          Already have an account?{" "}
          <Link
            to="/login"
            className={s.link}
            data-track-id="register.login.link"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
