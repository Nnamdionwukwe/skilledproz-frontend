import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function AuthGuard({ children, requireVerified = false }) {
  const { user, accessToken, isHydrated } = useAuthStore();

  // Wait for store to rehydrate from localStorage before making any decision
  if (!isHydrated) return null;

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !user.isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
}
