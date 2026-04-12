import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Phone,
  Globe,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import AuthLayout from "../../components/auth/AuthLayout";
import s from "../../components/auth/form.module.css";

const INIT = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  country: "",
  city: "",
  agree: false,
};

export default function RegisterHirer() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState(INIT);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim()) e.email = "Required";
    if (form.password.length < 8) e.password = "Min 8 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Doesn't match";
    if (!form.agree) e.agree = "You must accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: "HIRER",
        phone: form.phone || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
      });
      navigate("/verify-email");
    } catch (err) {
      setErrors({
        api: err?.response?.data?.message || "Registration failed.",
      });
    }
  };

  return (
    <AuthLayout>
      <div className={`${s.container} ${s.containerWide}`}>
        <button className={s.backBtn} onClick={() => navigate("/register")}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className={s.header}>
          <span className={s.eyebrow}>Hirer account</span>
          <h1 className={s.title}>
            Find your next
            <br />
            skilled proz
          </h1>
        </div>
        {errors.api && (
          <div className={s.alertError}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {errors.api}
          </div>
        )}
        <form className={s.form} onSubmit={handleSubmit} noValidate>
          <div className={s.row}>
            <div
              className={`${s.field} ${errors.firstName ? s.fieldError : ""}`}
            >
              <label className={s.label}>First name</label>
              <div className={s.inputWrap}>
                <span className={s.iconLeft}>
                  <User size={14} />
                </span>
                <input
                  className={`${s.input} ${s.inputIcon}`}
                  type="text"
                  name="firstName"
                  placeholder="John"
                  value={form.firstName}
                  onChange={onChange}
                />
              </div>
              {errors.firstName && (
                <span className={s.errMsg}>{errors.firstName}</span>
              )}
            </div>
            <div
              className={`${s.field} ${errors.lastName ? s.fieldError : ""}`}
            >
              <label className={s.label}>Last name</label>
              <div className={s.inputWrap}>
                <input
                  className={s.input}
                  type="text"
                  name="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={onChange}
                />
              </div>
              {errors.lastName && (
                <span className={s.errMsg}>{errors.lastName}</span>
              )}
            </div>
          </div>
          <div className={`${s.field} ${errors.email ? s.fieldError : ""}`}>
            <label className={s.label}>Email address</label>
            <div className={s.inputWrap}>
              <span className={s.iconLeft}>
                <Mail size={14} />
              </span>
              <input
                className={`${s.input} ${s.inputIcon}`}
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={onChange}
              />
            </div>
            {errors.email && <span className={s.errMsg}>{errors.email}</span>}
          </div>
          <div className={s.field}>
            <label className={s.label}>
              Phone{" "}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <div className={s.inputWrap}>
              <span className={s.iconLeft}>
                <Phone size={14} />
              </span>
              <input
                className={`${s.input} ${s.inputIcon}`}
                type="tel"
                name="phone"
                placeholder="+234 801 234 5678"
                value={form.phone}
                onChange={onChange}
              />
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>Country</label>
              <div className={s.inputWrap}>
                <span className={s.iconLeft}>
                  <Globe size={14} />
                </span>
                <input
                  className={`${s.input} ${s.inputIcon}`}
                  type="text"
                  name="country"
                  placeholder="Nigeria"
                  value={form.country}
                  onChange={onChange}
                />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>City</label>
              <div className={s.inputWrap}>
                <span className={s.iconLeft}>
                  <MapPin size={14} />
                </span>
                <input
                  className={`${s.input} ${s.inputIcon}`}
                  type="text"
                  name="city"
                  placeholder="Lagos"
                  value={form.city}
                  onChange={onChange}
                />
              </div>
            </div>
          </div>
          <div className={s.row}>
            <div
              className={`${s.field} ${errors.password ? s.fieldError : ""}`}
            >
              <label className={s.label}>Password</label>
              <div className={s.inputWrap}>
                <span className={s.iconLeft}>
                  <Lock size={14} />
                </span>
                <input
                  className={`${s.input} ${s.inputIcon}`}
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="Min 8 chars"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={onChange}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className={s.iconRight}
                  onClick={() => setShowPw(!showPw)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <span className={s.errMsg}>{errors.password}</span>
              )}
            </div>
            <div
              className={`${s.field} ${errors.confirmPassword ? s.fieldError : ""}`}
            >
              <label className={s.label}>Confirm</label>
              <div className={s.inputWrap}>
                <input
                  className={s.input}
                  type={showPw ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={onChange}
                />
              </div>
              {errors.confirmPassword && (
                <span className={s.errMsg}>{errors.confirmPassword}</span>
              )}
            </div>
          </div>
          <label className={s.checkRow}>
            <input
              type="checkbox"
              name="agree"
              checked={form.agree}
              onChange={onChange}
            />
            I agree to the{" "}
            <Link to="/terms" className={s.link} style={{ marginLeft: 3 }}>
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className={s.link}>
              Privacy Policy
            </Link>
          </label>
          {errors.agree && <span className={s.errMsg}>{errors.agree}</span>}
          <button
            type="submit"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={isLoading}
            style={{ marginTop: 2 }}
          >
            {isLoading && <span className={s.spinner} />}
            {isLoading ? "Creating account…" : "Create Hirer Account →"}
          </button>
        </form>
        <p className={s.footer}>
          Already have an account?{" "}
          <Link to="/login" className={s.link}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
