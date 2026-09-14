// src/components/auth/GoogleSignInButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "../../store/authStore";
import s from "./GoogleSignInButton.module.css";

export default function GoogleSignInButton({ mode = "signin" }) {
  const navigate = useNavigate();
  const { googleSignIn } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const { user, isNewUser } = await googleSignIn(
        credentialResponse.credential,
      );
      const dest =
        user.role === "WORKER" ? "/dashboard/worker" : "/dashboard/hirer";
      navigate(dest, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Google sign-in failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.wrap}>
      {!loading && (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("Google sign-in was cancelled or failed.")}
          shape="rectangular"
          theme="outline"
          size="large"
          text={mode === "signup" ? "signup_with" : "continue_with"}
          logo_alignment="left"
          width="340"
        />
      )}
      {loading && <div className={s.loading}>Connecting to Google…</div>}
      {error && <div className={s.error}>{error}</div>}
    </div>
  );
}
