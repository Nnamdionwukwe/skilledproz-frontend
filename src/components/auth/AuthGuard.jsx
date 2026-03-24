import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function AuthGuard({ children, requireVerified = false }) {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken || !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (requireVerified && !user.isEmailVerified) {
      navigate("/verify-email", { replace: true });
    }
  }, [accessToken, user, requireVerified, navigate]);

  if (!accessToken || !user) return null;
  if (requireVerified && !user.isEmailVerified) return null;
  return children;
}
