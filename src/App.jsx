import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RegisterHirer from "./pages/auth/RegisterHirer";
import RegisterWorker from "./pages/auth/RegisterWorker";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Guards & layout
import AuthGuard from "./components/auth/AuthGuard";

// Worker pages
import WorkerAvailability from "./pages/worker/availability/Availability";
import WorkerCategories from "./pages/worker/categories/Categories";
import WorkerCertifications from "./pages/worker/certifications/Certifications";
import WorkerDashboard from "./pages/worker/dashboard/WorkerDashboard";
import WorkerEarnings from "./pages/worker/dashboard/earnings/Earnings";
import WorkerNotifications from "./pages/worker/dashboard/notifications/Notifications";
import WorkerPortfolio from "./pages/worker/dashboard/portfolio/Portfolio";
import WorkerProfile from "./pages/worker/dashboard/profile/Profile";
import WorkerReviews from "./pages/worker/dashboard/reviews/Profile";

// Hirer pages
import HirerDashboard from "./components/hirer/HirerDashboard";
import HirerBookings from "./components/hirer/HirerBookings";
import HirerNotifications from "./components/hirer/HirerNotifications";
import HirerProfile from "./components/hirer/HirerProfile";
import PostJob from "./components/hirer/PostJob";

// Booking pages
import BookingList from "./components/booking/BookingList";
import BookingDetail from "./components/booking/BookingDetail";
import CreateBooking from "./components/booking/CreateBooking";

// User / shared
import UserProfile from "./components/user/UserProfile";
import EditProfile from "./components/user/EditProfile";

// Fallback
import DashboardPlaceholder from "./pages/worker/dashboard/DashboardPlaceholder";
import LandingPage from "./app/LandingPage";
import HirerSavedWorkers from "./components/hirer/HirerSavedWorkers";
import CategoriesBrowse from "./components/categories/CategoriesBrowse";
import CategoryDetail from "./components/categories/CategoryDetail";

// ── Route guards ──────────────────────────────────────────────────────────────
function GuestOnly({ children }) {
  const { accessToken } = useAuthStore();
  if (accessToken) return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireAuth({ children, requireVerified = false }) {
  return <AuthGuard requireVerified={requireVerified}>{children}</AuthGuard>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuthStore();
  const isWorker = user?.role === "WORKER";
  const isHirer = user?.role === "HIRER";

  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Auth (guest only) ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/hirer" element={<RegisterHirer />} />
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

        {/* ── Dashboard root — redirects by role ── */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth requireVerified>
              <Navigate
                to={
                  isWorker
                    ? "/dashboard/worker"
                    : isHirer
                      ? "/dashboard/hirer"
                      : "/dashboard/placeholder"
                }
                replace
              />
            </RequireAuth>
          }
        />

        {/* ── Worker dashboard ── */}
        <Route
          path="/dashboard/worker"
          element={
            <RequireAuth requireVerified>
              <WorkerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/earnings"
          element={
            <RequireAuth requireVerified>
              <WorkerEarnings />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/notifications"
          element={
            <RequireAuth requireVerified>
              <WorkerNotifications />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/portfolio"
          element={
            <RequireAuth requireVerified>
              <WorkerPortfolio />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/profile"
          element={
            <RequireAuth requireVerified>
              <WorkerProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/reviews"
          element={
            <RequireAuth requireVerified>
              <WorkerReviews />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/availability"
          element={
            <RequireAuth requireVerified>
              <WorkerAvailability />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/categories"
          element={
            <RequireAuth requireVerified>
              <WorkerCategories />
            </RequireAuth>
          }
        />
        <Route
          path="dashboard/worker/certifications"
          element={
            <RequireAuth requireVerified>
              <WorkerCertifications />
            </RequireAuth>
          }
        />

        {/* ── Hirer dashboard ── */}
        <Route
          path="/dashboard/hirer"
          element={
            <RequireAuth requireVerified>
              <HirerDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard/hirer/notifications"
          element={
            <RequireAuth requireVerified>
              <HirerNotifications />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/hirer/profile"
          element={
            <RequireAuth requireVerified>
              <HirerProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/hirer/post-job"
          element={
            <RequireAuth requireVerified>
              <PostJob />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard/hirer/saved-workers"
          element={
            <RequireAuth requireVerified>
              <HirerSavedWorkers />
            </RequireAuth>
          }
        />

        {/* ── Bookings ── */}
        <Route
          path="/bookings"
          element={
            <RequireAuth>
              <BookingList />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings/create"
          element={
            <RequireAuth>
              <CreateBooking />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <RequireAuth>
              <BookingDetail />
            </RequireAuth>
          }
        />

        {/* ── User profile ── */}
        <Route
          path="/profile/me"
          element={
            <RequireAuth>
              <UserProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <RequireAuth>
              <UserProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <RequireAuth>
              <UserProfile />
            </RequireAuth>
          }
        />
        {/* ── Categories ── */}
        <Route
          path="/categories"
          element={
            <RequireAuth>
              <CategoriesBrowse />
            </RequireAuth>
          }
        />
        <Route
          path="/categories/:slug"
          element={
            <RequireAuth>
              <CategoryDetail />
            </RequireAuth>
          }
        />

        {/* ── Fallback ── */}
        <Route
          path="/dashboard/placeholder"
          element={
            <RequireAuth>
              <DashboardPlaceholder />
            </RequireAuth>
          }
        />
        <Route path="landingpage" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
