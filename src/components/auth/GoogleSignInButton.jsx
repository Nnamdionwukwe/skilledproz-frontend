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
 *   - role: "HIRER" | "WORKER"   (optional hint for NEW signups)
 *       Omit it to let the user pick their role on /register.
 *   - onNewUser: (googleProfile, accessToken) => void
 *       Called when the backend says this is a NEW user and no role was
 *       supplied. Parent should route to /register.
 *   - onSuccess: (result) => void
 *       Called on existing-user sign-in. Parent can navigate.
 *
 * On error:
 *   - ACCOUNT_BANNED / ACCOUNT_DELETED → redirect to /login?code=...
 *   - Any other error → show inline message.
 */
export default function GoogleSignInButton({
  mode = "signin",
  role,
  onNewUser,
  onSuccess,
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
        // Only include role when the caller provided one.
        const payload = { accessToken: tokenResponse.access_token };
        if (role) payload.role = role;

        const result = await googleSignIn(payload);

        // ── New user needing a role ─────────────────────────────────────
        if (result?.needsRole) {
          if (onNewUser) {
            onNewUser(result.googleProfile, tokenResponse.access_token);
            return;
          }
          // Fallback — stash + navigate.
          sessionStorage.setItem(
            "googlePendingSignup",
            JSON.stringify({
              googleProfile: result.googleProfile,
              accessToken: tokenResponse.access_token,
            }),
          );
          navigate("/register", { replace: true });
          return;
        }

        // ── Existing user (or completed signup with role) ───────────────
        if (onSuccess) {
          onSuccess(result);
          return;
        }

        const dest =
          result.user.role === "ADMIN"
            ? "/admin/dashboard"
            : result.user.role === "WORKER"
              ? "/dashboard/worker"
              : "/dashboard/hirer";
        navigate(dest, { replace: true });
      } catch (err) {
        const res = err?.response?.data;
        const code = res?.code;

        // ── Account blocked: send the user to login with the ban banner ─────
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

        // ── Any other error: show inline ────────────────────────────────
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
