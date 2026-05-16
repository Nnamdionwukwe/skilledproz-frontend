// src/pages/auth/Login.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import AuthLayout from "../../components/auth/AuthLayout";
import s from "../../components/auth/form.module.css";

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore(); // no more user/isHydrated needed here

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loggedInUser = await login(form.email, form.password);
      navigate(
        loggedInUser.role === "WORKER"
          ? "/dashboard/worker"
          : "/dashboard/hirer",
        { replace: true },
      );
    } catch (err) {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Login failed. Please try again.";
      setError(message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
              Create one free →
            </Link>
          </p>
        </div>

        {error && (
          <div className={s.alertError}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
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
