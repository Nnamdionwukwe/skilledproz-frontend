import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";
import AuthLayout from "../../components/auth/AuthLayout";
import s from "../../components/auth/form.module.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Reset token missing from URL.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    setStatus("loading");
    try {
      await api.post("/auth/reset-password", {
        token,
        password: form.password,
      });
      setStatus("success");
      setTimeout(() => navigate("/login"), 2800);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Reset failed. Link may have expired.",
      );
      setStatus("idle");
    }
  };

  if (status === "success")
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
            <div className={s.stateTitle}>Password reset!</div>
            <p className={s.stateSub}>Redirecting you to sign in…</p>
          </div>
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout>
      <div className={s.container}>
        <div className={s.header}>
          <span className={s.eyebrow}>New password</span>
          <h1 className={s.title}>
            Reset your
            <br />
            password
          </h1>
          <p className={s.subtitle}>Choose a strong new password.</p>
        </div>
        {error && (
          <div className={s.alertError}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}
        <form className={s.form} onSubmit={handleSubmit} noValidate>
          <div className={s.field}>
            <label className={s.label}>New password</label>
            <div className={s.inputWrap}>
              <span className={s.iconLeft}>
                <Lock size={15} />
              </span>
              <input
                className={`${s.input} ${s.inputIcon}`}
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="Min 8 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={onChange}
                required
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                className={s.iconRight}
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Confirm new password</label>
            <div className={s.inputWrap}>
              <span className={s.iconLeft}>
                <Lock size={15} />
              </span>
              <input
                className={`${s.input} ${s.inputIcon}`}
                type={showPw ? "text" : "password"}
                name="confirm"
                placeholder="Repeat password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={onChange}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={
              status === "loading" || !form.password || !form.confirm || !token
            }
            style={{ marginTop: 4 }}
          >
            {status === "loading" && <span className={s.spinner} />}
            {status === "loading" ? "Resetting…" : "Set New Password →"}
          </button>
        </form>
        <p className={s.footer}>
          <Link to="/forgot-password" className={s.link}>
            Request a new reset link
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
