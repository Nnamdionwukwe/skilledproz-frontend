// src/pages/auth/Login.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import AuthLayout from "../../components/auth/AuthLayout";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import s from "../../components/auth/form.module.css";
import g from "../../components/auth/GoogleSignInButton.module.css";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, isLoading } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [accountBlock, setAccountBlock] = useState(null);
  const [refCode, setRefCode] = useState("");

  // Clear any stale pending Google signup whenever we land on /login.
  useEffect(() => {
    sessionStorage.removeItem("googlePendingSignup");
  }, []);

  // Capture ?ref= from the URL and remember it for the whole auth flow.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      const code = ref.toUpperCase().trim();
      setRefCode(code);
      sessionStorage.setItem("pendingRefCode", code);
    } else {
      // Fall back to anything previously stashed (e.g. after a reload).
      const stored = sessionStorage.getItem("pendingRefCode");
      if (stored) setRefCode(stored);
    }
  }, [searchParams]);

  useEffect(() => {
    const code = searchParams.get("code");
    const reason = searchParams.get("reason");
    if (!code && !reason) return;

    if (code === "ACCOUNT_BANNED") setAccountBlock("banned");
    else if (code === "ACCOUNT_DELETED") setAccountBlock("deleted");
    else if (code === "ACCOUNT_NOT_FOUND") setAccountBlock("not_found");
    else if (reason) setError(reason);

    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("code");
      next.delete("reason");
      setSearchParams(next, { replace: true });
    }, 100);
    return () => clearTimeout(t);
  }, [searchParams, setSearchParams]);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError("");
    if (accountBlock) setAccountBlock(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAccountBlock(null);
    try {
      const loggedInUser = await login(form.email, form.password);
      const role = loggedInUser.role;
      const dest =
        role === "ADMIN"
          ? "/admin/dashboard"
          : role === "WORKER"
            ? "/dashboard/worker"
            : "/dashboard/hirer";
      navigate(dest, { replace: true });
    } catch (err) {
      const res = err?.response?.data;
      const code = res?.code;

      if (code === "ACCOUNT_BANNED") {
        setAccountBlock("banned");
        return;
      }
      if (code === "ACCOUNT_DELETED") {
        setAccountBlock("deleted");
        return;
      }
      if (code === "ACCOUNT_NOT_FOUND") {
        setAccountBlock("not_found");
        return;
      }

      if (
        code === "GOOGLE_ACCOUNT_NO_PASSWORD" ||
        code === "GOOGLE_ONLY_ACCOUNT"
      ) {
        setError(
          res?.message ||
            "This account was created with Google. Please sign in with Google.",
        );
        return;
      }

      setError(
        res?.message ?? err?.message ?? "Login failed. Please try again.",
      );
    }
  };

  // ── Google: NEW user → route to /register for role selection ──────────
  const handleGoogleNewUser = (googleProfile, accessToken, refFromGoogle) => {
    const code = refFromGoogle || refCode || null;
    sessionStorage.setItem(
      "googlePendingSignup",
      JSON.stringify({ googleProfile, accessToken, refCode: code }),
    );
    navigate("/register", {
      state: { googleProfile, accessToken, refCode: code, from: "google" },
    });
  };

  // ── Google: EXISTING user → go to their dashboard ─────────────────────
  const handleGoogleSuccess = (result) => {
    if (!result?.user) return;
    const role = result.user.role;
    const dest =
      role === "ADMIN"
        ? "/admin/dashboard"
        : role === "WORKER"
          ? "/dashboard/worker"
          : "/dashboard/hirer";
    navigate(dest, { replace: true });
  };

  const blockContent = {
    banned: {
      title: "Account suspended",
      body: "Your account has been suspended by an administrator. If you believe this is a mistake, contact our support team.",
    },
    deleted: {
      title: "Account deactivated",
      body: "This account has been deactivated. Contact support if you'd like to restore access.",
    },
    not_found: {
      title: "Account not found",
      body: "This account no longer exists. It may have been deleted. Contact support if this is unexpected.",
    },
  };

  const block = accountBlock ? blockContent[accountBlock] : null;

  return (
    <AuthLayout>
      <div className={s.container}>
        <div className={s.header}>
          <span className={s.eyebrow}>Welcome back</span>
          <h1 className={s.title}>
            Sign in to
            <br />
            SkilledProz
          </h1>
          <p className={s.subtitle}>
            No account yet?{" "}
            <Link to="/register" className={s.link}>
              Create one free &nbsp;→
            </Link>
          </p>
        </div>

        {block && (
          <div
            className={s.alertError}
            style={{ flexDirection: "column", alignItems: "stretch" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>
                  {block.title}
                </strong>
                <span>{block.body}</span>
              </div>
            </div>
            <a
              href="mailto:support@skilledproz.com"
              className={`${s.btn} ${s.btnOutline}`}
              style={{
                marginTop: 10,
                textDecoration: "none",
                display: "inline-flex",
                justifyContent: "center",
              }}
            >
              Contact support
            </a>
          </div>
        )}

        <GoogleSignInButton
          mode="signin"
          refCode={refCode || undefined}
          onNewUser={handleGoogleNewUser}
          onSuccess={handleGoogleSuccess}
        />

        <div className={g.divider}>or</div>

        {error && !block && (
          <div className={s.alertError}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form className={s.form} onSubmit={handleSubmit} noValidate>
          <div className={s.field}>
            <label className={s.label}>Email address</label>
            <div className={s.inputWrap}>
              <span className={s.iconLeft}>
                <Mail size={15} />
              </span>
              <input
                className={`${s.input} ${s.inputIcon}`}
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className={s.field}>
            <div className={s.labelRow}>
              <label className={s.label}>Password</label>
              <Link to="/forgot-password" className={s.linkSmall}>
                Forgot?
              </Link>
            </div>
            <div className={s.inputWrap}>
              <span className={s.iconLeft}>
                <Lock size={15} />
              </span>
              <input
                className={`${s.input} ${s.inputIcon}`}
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={onChange}
                required
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                className={s.iconRight}
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={isLoading || !form.email.trim() || !form.password}
            style={{ marginTop: 4 }}
          >
            {isLoading && <span className={s.spinner} />}
            {isLoading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
