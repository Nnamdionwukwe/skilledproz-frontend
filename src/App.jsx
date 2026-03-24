import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RegisterHirer from "./pages/auth/RegisterHirer";
import RegisterWorker from "./pages/auth/RegisterWorker";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AuthGuard from "./components/auth/AuthGuard";
import DashboardPlaceholder from "./pages/DashboardPlaceholder";

function GuestOnly({ children }) {
  const { accessToken } = useAuthStore();
  if (accessToken) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route
          path="/register/hirer"
          element={
            <GuestOnly>
              <RegisterHirer />
            </GuestOnly>
          }
        />
        <Route
          path="/register/worker"
          element={
            <GuestOnly>
              <RegisterWorker />
            </GuestOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <ForgotPassword />
            </GuestOnly>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/dashboard/*"
          element={
            <AuthGuard requireVerified>
              <DashboardPlaceholder />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
