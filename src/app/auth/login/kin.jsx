import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, AlertCircle } from "lucide-react";
import api from "../../lib/api";
import AuthLayout from "../../components/auth/AuthLayout";
import s from "../../components/auth/form.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await api.post("/auth/forgot-password", { email });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <AuthLayout>
        <div className={s.container}>
          <div className={s.stateBox}>
            <div className={s.stateIcon}>✉️</div>
            <div className={s.stateTitle}>Reset link sent!</div>
            <p className={s.stateSub}>
              If <span className={s.stateEmail}>{email}</span> is registered,
              you'll receive a reset link within a few minutes. Check your spam
              too.
            </p>
          </div>
          <Link
            to="/login"
            className={`${s.btn} ${s.btnOutline}`}
            style={{ textDecoration: "none", textAlign: "center" }}
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className={s.container}>
        <Link to="/login" className={s.backBtn}>
          <ArrowLeft size={15} /> Back to sign in
        </Link>

        <div className={s.header}>
          <span className={s.eyebrow}>Account recovery</span>
          <h1 className={s.title}>
            Forgot your
            <br />
            password?
          </h1>
          <p className={s.subtitle}>
            Enter your email and we'll send you a secure reset link.
          </p>
        </div>

        {status === "error" && (
          <div className={s.alertError}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            Something went wrong. Please try again.
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
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={status === "loading" || !email}
          >
            {status === "loading" && <span className={s.spinner} />}
            {status === "loading" ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
