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
import StripeConfirm from "./components/payment/FlutterwaveConfirm";
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
import FeaturedBoost from "./components/featured/FeaturedBoost";
import SubscriptionPlans from "./components/subscription/SubscriptionPlans";
import SubscriptionSuccess from "./components/subscription/SubscriptionSuccess";
import FeaturedSuccess from "./components/subscription/FeaturedSuccess";
import MyPostsPage from "./pages/feed/MyPosts";
import FeedPage from "./pages/feed/FeedPage";
import InsuranceSuccess from "./components/hirer/InsuranceSuccess";
import SettingsPage from "./components/settimg/SettingsPage";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions.module";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminVideoCalls from "./pages/admin/AdminVideoCalls";
import AdminFeatured from "./pages/admin/AdminFeatured";
import FlutterwaveConfirm from "./components/payment/FlutterwaveConfirm";
import ReferralDashboard from "./pages/referral/ReferralDashboard";
import CampaignDashboard from "./pages/referral/CampaignDashboard";
import AdminCampaign from "./pages/admin/AdminCampaign";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminManualPayments from "./pages/admin/AdminManualPayments";
import MyReports from "./pages/reports/MyReports";
import AdminReports from "./pages/admin/AdminReports";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminInsurance from "./pages/admin/AdminInsurance";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the correct home path for a given role */
function homePath(role) {
  if (role === "WORKER") return "/dashboard/worker";
  if (role === "HIRER") return "/dashboard/hirer";
  if (role === "ADMIN") return "/admin";
  return "/landingpage";
}

// ── Route guards (defined OUTSIDE App so they don't re-create on every render) ─

/** Redirect logged-in users away from auth pages */
function GuestOnly({ children }) {
  const { accessToken, isHydrated, user } = useAuthStore();
  if (!isHydrated) return null; // wait for localStorage restore
  if (accessToken && user) return <Navigate to={homePath(user.role)} replace />;
  return children;
}

/** Require any authenticated user; optionally require verified email */
function RequireAuth({ children, requireVerified = false }) {
  return <AuthGuard requireVerified={requireVerified}>{children}</AuthGuard>;
}

/** Require ADMIN role specifically */
function RequireAdmin({ children }) {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN")
    return <Navigate to={homePath(user.role)} replace />;
  return children;
}

/** Require WORKER role specifically */
function RequireWorker({ children }) {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "WORKER")
    return <Navigate to={homePath(user.role)} replace />;
  return children;
}

/** Require HIRER role specifically */
function RequireHirer({ children }) {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "HIRER")
    return <Navigate to={homePath(user.role)} replace />;
  return children;
}

/** /dashboard → correct dashboard by role */
function RoleRedirect() {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePath(user.role)} replace />;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <div id="google_translate_element" style={{ display: "none" }} />
      <Routes>
        {/* ── Root ── */}
        <Route path="/" element={<Navigate to="/landingpage" replace />} />
        <Route path="/landingpage" element={<LandingPage />} />

        {/* ── Guest-only auth pages ── */}
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

        {/* ── /dashboard → role-based redirect ── */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <RoleRedirect />
            </RequireAuth>
          }
        />

        {/* ════════════════════════════════════════
            ADMIN ROUTES
        ════════════════════════════════════════ */}
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
          path="/admin/manual-payments"
          element={
            <RequireAdmin>
              <AdminManualPayments />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <RequireAdmin>
              <AdminWithdrawals />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <RequireAdmin>
              <AdminSubscriptions />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/FeatueredBoosts"
          element={
            <RequireAdmin>
              <AdminSubscriptions />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/Posts"
          element={
            <RequireAdmin>
              <AdminPosts />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <RequireAdmin>
              <AdminMessages />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/video-calls"
          element={
            <RequireAdmin>
              <AdminVideoCalls />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/jobs"
          element={
            <RequireAdmin>
              <AdminJobs />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/featured"
          element={
            <RequireAdmin>
              <AdminFeatured />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/campaigns"
          element={
            <RequireAdmin>
              <AdminCampaign />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/referrals"
          element={
            <RequireAdmin>
              <AdminReferrals />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RequireAdmin>
              <AdminReports />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RequireAdmin>
              <AdminAuditLog />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/insurance"
          element={
            <RequireAdmin>
              <AdminInsurance />
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

        {/* ════════════════════════════════════════
            WORKER ROUTES
        ════════════════════════════════════════ */}
        <Route
          path="/dashboard/worker"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerDashboard />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/earnings"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerEarningsPage />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/withdrawals"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerWithdrawals />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/notifications"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerNotifications />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/portfolio"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerPortfolio />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/profile"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerProfile />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/reviews"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerReviewsPage />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/availability"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerAvailability />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/categories"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerCategories />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/certifications"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerCertifications />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/applications"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <MyJobApplications />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/verification"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <WorkerVerification />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/background-check"
          element={
            <RequireWorker>
              <RequireAuth requireVerified>
                <BackgroundCheck />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/subscription"
          element={
            <RequireWorker>
              <RequireAuth>
                <SubscriptionPlans />
              </RequireAuth>
            </RequireWorker>
          }
        />
        <Route
          path="/dashboard/worker/featured"
          element={
            <RequireWorker>
              <RequireAuth>
                <FeaturedBoost />
              </RequireAuth>
            </RequireWorker>
          }
        />

        {/* ════════════════════════════════════════
            HIRER ROUTES
        ════════════════════════════════════════ */}
        <Route
          path="/dashboard/hirer"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerDashboard />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/notifications"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerNotifications />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/profile"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerProfile />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/post-job"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <PostJob />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/saved-workers"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerSavedWorkers />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/reviews/received"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerReviewsReceived />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/reviews/given"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerReviewsGiven />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/payment-history"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerPaymentHistory />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/jobs-management"
          element={
            <RequireHirer>
              <RequireAuth>
                <HirerJobBoardManagement />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/verification"
          element={
            <RequireHirer>
              <RequireAuth requireVerified>
                <HirerVerification />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/subscription"
          element={
            <RequireHirer>
              <RequireAuth>
                <SubscriptionPlans />
              </RequireAuth>
            </RequireHirer>
          }
        />
        <Route
          path="/dashboard/hirer/featured"
          element={
            <RequireHirer>
              <RequireAuth>
                <FeaturedBoost />
              </RequireAuth>
            </RequireHirer>
          }
        />

        {/* ════════════════════════════════════════
            SHARED AUTHENTICATED ROUTES
            (both hirers and workers can access)
        ════════════════════════════════════════ */}
        <Route
          path="/messages"
          element={
            <RequireAuth>
              <Messages />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
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
        <Route path="/feed" element={<FeedPage />} />
        <Route
          path="/my-posts"
          element={
            <RequireAuth>
              <MyPostsPage />
            </RequireAuth>
          }
        />

        {/* ── Refrreals (both roles) ── */}
        <Route
          path="/referrals"
          element={
            <RequireAuth>
              <ReferralDashboard />
            </RequireAuth>
          }
        />

        <Route path="/campaign" element={<CampaignDashboard />} />

        {/* ── Bookings (both roles) ── */}
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
        <Route
          path="/bookings/:bookingId/stripe-confirm"
          element={
            <RequireAuth>
              <FlutterwaveConfirm />
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
        <Route path="/payments/verify/paystack" element={<PaystackVerify />} />
        <Route
          path="/insurance/success"
          element={
            <RequireAuth>
              <InsuranceSuccess />
            </RequireAuth>
          }
        />

        {/* ── Jobs (both roles can view, hirer creates) ── */}
        <Route
          path="/jobs"
          element={
            <RequireAuth>
              <HirerJobBoard />
            </RequireAuth>
          }
        />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route
          path="/jobs/:id/applications"
          element={
            <RequireAuth requireVerified>
              <JobApplications />
            </RequireAuth>
          }
        />

        {/* ── Profiles ── */}
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

        <Route
          path="/my-reports"
          element={
            <RequireAuth>
              <MyReports />
            </RequireAuth>
          }
        />

        {/* ── Subscriptions / Featured (shared success pages) ── */}
        <Route
          path="/subscription/success"
          element={
            <RequireAuth>
              <SubscriptionSuccess />
            </RequireAuth>
          }
        />
        <Route
          path="/featured/success"
          element={
            <RequireAuth>
              <FeaturedSuccess />
            </RequireAuth>
          }
        />

        {/* ── Public pages ── */}
        <Route path="/categories" element={<CategoriesBrowse />} />
        <Route path="/categories/:slug" element={<CategoryDetail />} />
        <Route path="/workers/:userId" element={<WorkerPublicProfile />} />
        <Route path="/hirers/:userId" element={<HirerPublicProfile />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
