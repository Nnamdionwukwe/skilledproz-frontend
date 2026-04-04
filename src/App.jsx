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
import WorkerNotifications from "./pages/worker/dashboard/notifications/Notifications";
import WorkerPortfolio from "./pages/worker/dashboard/portfolio/Portfolio";
import WorkerProfile from "./pages/worker/dashboard/profile/Profile";

// Hirer pages
import HirerDashboard from "./components/hirer/HirerDashboard";
import HirerNotifications from "./components/hirer/HirerNotifications";
import HirerProfile from "./components/hirer/HirerProfile";
import PostJob from "./components/hirer/PostJob";

// Booking pages
import BookingList from "./components/booking/BookingList";
import BookingDetail from "./components/booking/BookingDetail";
import CreateBooking from "./components/booking/CreateBooking";

// User / shared
import UserProfile from "./components/user/UserProfile";

// Fallback
import DashboardPlaceholder from "./pages/worker/dashboard/DashboardPlaceholder";
import LandingPage from "./app/LandingPage";
import HirerSavedWorkers from "./components/hirer/HirerSavedWorkers";
import CategoriesBrowse from "./components/categories/CategoriesBrowse";
import CategoryDetail from "./components/categories/CategoryDetail";
import WorkerPublicProfile from "./components/worker/WorkerPublicProfile";
import SearchPage from "./components/search/SearchPage";
import About from "./pages/Terms pages/About";
import Contact from "./pages/Terms pages/Contact";
import PrivacyPolicy from "./pages/Terms pages/PrivacyPolicy";
import Terms from "./pages/Terms pages/Terms";
import InitiatePayment from "./components/payment/InitiatePayment";
import ReleasePayment from "./components/payment/ReleasePayment";
import PaystackVerify from "./components/payment/PaystackVerify";
import StripeConfirm from "./components/payment/StripeConfirm";
import LeaveReview from "./components/review/LeaveReview";
import WorkerReviewsPage from "./components/review/WorkerReviewsPage";
import HirerReviewsGiven from "./components/hirer/HirerReviewsGiven";
import HirerReviewsReceived from "./components/hirer/HirerReviewsReceived";
import Messages from "./components/messages/Messages";
import HirerPaymentHistory from "./components/hirer/HirerPaymentHistory";
import WorkerVerification from "./pages/worker/verification/WorkerVerification";
import HirerVerification from "./components/hirer/verification/HirerVerification";
import HirerPublicProfile from "./components/hirer/HirerPublicProfile";
import HirerJobBoard from "./components/hirer/hirerjobs/HirerJobBoard";
import JobDetail from "./components/hirer/JobDetail";
import HirerJobBoardManagement from "./components/hirer/hirerjobs/HirerJobBoardManagement";
import JobApplications from "./components/hirer/JobApplications";
import MyJobApplications from "./pages/worker/MyJobApplications/MyJobApplications";
import WorkerWithdrawals from "./pages/worker/dashboard/earnings/WorkerWithdrawals";
import WorkerEarningsPage from "./pages/worker/dashboard/earnings/WorkerEarningsPage";
import MyDisputes from "./components/disputes/MyDisputes";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import BackgroundCheck from "./pages/worker/verification/BackgroundCheck";

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
  const isAdmin = user?.role === "ADMIN";

  function RequireAdmin({ children }) {
    const { user } = useAuthStore();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== "ADMIN") return <Navigate to="/" replace />;
    return children;
  }

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
        {/* ── ADMIN dashboard ── */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>
              <AdminUsers />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/disputes"
          element={
            <RequireAdmin>
              <AdminDisputes />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/broadcast"
          element={
            <RequireAdmin>
              <AdminBroadcast />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <RequireAdmin>
              <AdminAnalytics />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/verifications"
          element={
            <RequireAdmin>
              <AdminVerifications />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <RequireAdmin>
              <AdminBookings />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RequireAdmin>
              <AdminCategories />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <RequireAdmin>
              <AdminReviews />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <RequireAdmin>
              <AdminPayments />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RequireAdmin>
              <AdminSettings />
            </RequireAdmin>
          }
        />

        {/* ── Hirer/Worker Messages ── */}
        <Route
          path="/messages"
          element={
            <RequireAuth>
              <Messages />
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
              <WorkerEarningsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/withdrawals"
          element={
            <RequireAuth requireVerified>
              <WorkerWithdrawals />
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
              <WorkerReviewsPage />
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
          path="/dashboard/worker/certifications"
          element={
            <RequireAuth requireVerified>
              <WorkerCertifications />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/applications"
          element={
            <RequireAuth requireVerified>
              <MyJobApplications />
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
        <Route path="/hirers/:userId" element={<HirerPublicProfile />} />
        <Route path="/jobs/:id" element={<JobDetail />} />

        <Route
          path="/jobs"
          element={
            <RequireAuth>
              <HirerJobBoard />
            </RequireAuth>
          }
        />
        <Route
          path="/jobs/:id/applications"
          element={
            <RequireAuth requireVerified>
              <JobApplications />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/hirer/jobs-management"
          element={
            <RequireAuth>
              <HirerJobBoardManagement />
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

        <Route
          path="/dashboard/hirer/reviews/received"
          element={
            <RequireAuth requireVerified>
              <HirerReviewsReceived />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/hirer/reviews/given"
          element={
            <RequireAuth requireVerified>
              <HirerReviewsGiven />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/hirer/payment-history"
          element={
            <RequireAuth requireVerified>
              <HirerPaymentHistory />
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

        <Route
          path="/bookings/:bookingId/pay"
          element={
            <RequireAuth>
              <InitiatePayment />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings/:bookingId/release"
          element={
            <RequireAuth>
              <ReleasePayment />
            </RequireAuth>
          }
        />
        <Route path="/payments/verify/paystack" element={<PaystackVerify />} />
        <Route
          path="/bookings/:bookingId/stripe-confirm"
          element={
            <RequireAuth>
              <StripeConfirm />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings/:bookingId/review"
          element={
            <RequireAuth>
              <LeaveReview />
            </RequireAuth>
          }
        />
        <Route
          path="/disputes"
          element={
            <RequireAuth>
              <MyDisputes />
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

        {/* ── Public Aceess ── */}
        <Route path="/workers/:userId" element={<WorkerPublicProfile />} />
        <Route path="/search" element={<SearchPage />} />

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

        {/* ── Verification ── */}
        <Route
          path="/dashboard/worker/verification"
          element={
            <RequireAuth requireVerified>
              <WorkerVerification />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/hirer/verification"
          element={
            <RequireAuth requireVerified>
              <HirerVerification />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/worker/background-check"
          element={
            <RequireAuth requireVerified>
              <BackgroundCheck />
            </RequireAuth>
          }
        />

        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
