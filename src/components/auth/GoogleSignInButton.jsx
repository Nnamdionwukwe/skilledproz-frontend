// src/components/auth/GoogleSignInButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "../../store/authStore";
import s from "./GoogleSignInButton.module.css";

/**
 * Google Sign-In button built to match the SkilledProz auth UI.
 *
 * Props:
 *   - mode: "signin" | "signup"  (only affects the label)
 *   - role: "HIRER" | "WORKER"   (hint for NEW signups only)
 *
 * On error:
 *   - ACCOUNT_BANNED / ACCOUNT_DELETED → redirect to /login?code=... so the
 *     Login page shows the correct banner.
 *   - Any other error → show inline message.
 */
export default function GoogleSignInButton({
  mode = "signin",
  role = "HIRER",
}) {
  const navigate = useNavigate();
  const { googleSignIn } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const { user } = await googleSignIn({
          accessToken: tokenResponse.access_token,
          role,
        });

        // Success — send the user to their dashboard.
        const dest =
          user.role === "ADMIN"
            ? "/admin/dashboard"
            : user.role === "WORKER"
              ? "/dashboard/worker"
              : "/dashboard/hirer";
        navigate(dest, { replace: true });
      } catch (err) {
        const res = err?.response?.data;
        const code = res?.code;

        // ── Account blocked: send the user to login with the ban banner ─────
        // The Login page reads ?code=... from the URL and shows the correct
        // "Account suspended" / "Account deactivated" banner with a
        // "Contact support" button.
        if (
          code === "ACCOUNT_BANNED" ||
          code === "ACCOUNT_DELETED" ||
          code === "ACCOUNT_NOT_FOUND"
        ) {
          const params = new URLSearchParams();
          params.set("code", code);
          if (res?.message) params.set("reason", res.message);
          navigate(`/login?${params}`, { replace: true });
          return;
        }

        // ── Any other error: show inline, keep the user on the page ─────────
        const message =
          res?.message ||
          err?.message ||
          "Google sign-in failed. Please try again.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
    },
  });

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.googleBtn}
        onClick={() => googleLogin()}
        disabled={loading}
        aria-label={
          mode === "signup" ? "Sign up with Google" : "Sign in with Google"
        }
      >
        {loading ? (
          <>
            <span className={s.spinner} />
            <span>Connecting…</span>
          </>
        ) : (
          <>
            <GoogleGlyph />
            <span>
              {mode === "signup"
                ? "Sign up with Google"
                : "Continue with Google"}
            </span>
          </>
        )}
      </button>

      {error && <div className={s.error}>{error}</div>}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg
      className={s.glyph}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
