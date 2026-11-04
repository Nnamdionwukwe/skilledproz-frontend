# UI/UX Parity Report

**Website:** `/Users/onwukwennamdi/Desktop/skilledproz-frontend`
**App:** `/Users/onwukwennamdi/Desktop/SkilledProzHirer`
**Generated:** 2026-11-04T08:30:54.195Z

## Font families

| Side | Values |
|---|---|
| Web | var(--font-display), var(--font-body), var(--font-body, "Inter", sans-serif), var(--font-display, "Inter", sans-serif), monospace, var(--font-mono, monospace), "SF Mono", Menlo, monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif, var(--font-display, inherit), inherit, ui-monospace, "SF Mono", monospace, var(--font-display) !important, "Menlo", "Monaco", monospace, theme.fonts?.displayBlack || Syne_800ExtraBold, theme.fonts?.body || DMSans_400Regular, theme.fonts?.bodySemiBold, theme.fonts?.bodyBold || DMSans_700Bold, theme.fonts?.bodyMedium || DMSans_500Medium, theme.fonts?.bodySemiBold || DMSans_600SemiBold, theme.fonts?.bodySemiBold ||, theme.fonts?.display || Syne_700Bold, opt.value === value, label === Reference ? monospace : inherit |
| App | ${val, DMSans_400Regular, (f) => f.displayBlack, (f) => f.display, (f) => f.bodySemiBold, (f) => f.bodyMedium, (f) => f.body, DMSans_700Bold, DMSans_600SemiBold, Syne_800ExtraBold, Syne_700Bold, DMSans_500Medium, theme.fonts?.displayBlack || Syne_800ExtraBold, theme.fonts?.body || DMSans_400Regular, theme.fonts?.bodySemiBold || DMSans_600SemiBold, theme.fonts?.bodyBold || DMSans_700Bold, theme.fonts?.bodyMedium || DMSans_500Medium, theme.fonts?.bodySemiBold ||, theme.fonts?.display || Syne_700Bold, opt.value === value, Courier, mono ? Courier : undefined, monospace, mono ? monospace : undefined, Platform.select({, Platform.OS === ios ? Courier : monospace, item.mono, FONT_DISPLAY, active, mono && Platform.OS === ios ? Courier : undefined |

**Only on web:**
- `var(--font-display)`
- `var(--font-body)`
- `var(--font-body, "Inter", sans-serif)`
- `var(--font-display, "Inter", sans-serif)`
- `var(--font-mono, monospace)`
- `"SF Mono", Menlo, monospace`
- `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- `var(--font-display, inherit)`
- `inherit`
- `ui-monospace, "SF Mono", monospace`
- `var(--font-display) !important`
- `"Menlo", "Monaco", monospace`
- `theme.fonts?.bodySemiBold`
- `label === Reference ? monospace : inherit`

## Font sizes (normalised to phone px)

- web: `6.3, 7, 7, 7.5, 7.5600000000000005, 7.700000000000001, 7.840000000000001, 7.875, 8, 8.12, 8.4, 8.5, 8.68, 8.75, 9, 9.1, 9.24, 9.5, 9.520000000000001, 9.625, 9.799999999999999, 10, 10.08, 10.219999999999999, 10.5, 10.5, 10.85, 10.92, 11, 11.200000000000001, 11.375, 11.479999999999999, 11.5, 11.549999999999999, 11.62, 11.9, 12, 12.25, 12.32, 12.5, 12.6, 12.950000000000001, 13, 13.125, 13.299999999999999, 13.5, 13.65, 14, 14, 14.5, 14.700000000000001, 14.875, 15, 15.400000000000002, 15.75, 16, 16.099999999999998, 16.8, 17, 17.5, 18, 18.2, 18.900000000000002, 19.25, 19.599999999999998, 20, 21, 21, 21.7, 22, 22.400000000000002, 22.75, 24, 24.5, 25.2, 26, 26.25, 28, 28, 30, 30.800000000000004, 31.5, 32, 34, 35, 36, 38.5, 40, 42, 44, 48, 49, 52, 52.5, 56, 64`
- app: `7.88, 8, 8.75, 9, 9.1, 9.63, 10, 10.5, 11, 11.375, 11.38, 11.5, 12, 12.25, 12.5, 12.6, 13, 13.13, 13.3, 13.5, 14, 14.5, 15, 16, 17, 17.5, 18, 19, 19.25, 20, 21, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 44, 48, 52, 64`

**Missing in app:**
- `6.3`
- `7`
- `7`
- `22.75`
- `25.2`
- `30.800000000000004`
- `35`
- `42`
- `49`
- `56`

## Line heights (phone px)


## Letter-spacing

- web: `-0.04em, 0.08em, -0.03em, 0.1em, 0.14em, 0.05em, -0.5px, -0.8px, -1px, 0.8px, 0.1px, 0.6px, 1.8px, -1.5px, 0.2px, -0.3px, 1.5px, 0.04em, 0.06em, 0.07em, 0.12em, -0.02em, -0.01em, 0.02em, 0.03em, 1px, 0.3px, 0, 0.01em, -0.4px, 0.5em, 0.4em, 0.16em, 0.18em, -0.025em, 0.15em, 3px, 0.5px, 1.2px, -0.2px, 0.09em, -0.05em, 0.12em !important, -0.04em !important, 0.1em !important, -0.06em, 2px, -0.02 * rem(1.25), 0.05 * rem(0.75), 0.06 * rem(0.95), labelLs, -0.03 * valueFs, -0.01 * valueFs, 0.8`
- app: `0.8, 1.5, 1.4, 0.6, -0.5, -0.3, 1.2, 0.35, -0.77, 1.26, 0.47, 1.42, 0.7, -0.02 * rem(1.25), 0.05 * rem(0.75), 0.06 * rem(0.95), 0.05 * rem(0.85), 0.06 * rem(0.85), labelLs, -0.03 * valueFs, -0.01 * valueFs, 1.8, -1.2, 0.2, 1, 0.5, 0.4, 0.3, -0.4, -1.5, 12, 0.9, -1, 2, 1.156, -0.2, 8, -0.02 * titleFs, 0.06 * rem(0.65), 0.06 * rem(0.7), 0.05 * rem(0.65), 0.04 * rem(0.65), -0.02 * rem(1.5), -0.01 * rem(1.125)`

## Paddings (phone px)

- `16.8`
- `19.25`
- `25.2`
- `35`
- `42`
- `42`

## Margins (phone px)

- `8.75`
- `11.200000000000001`
- `25.2`
- `35`
- `42`
- `49`
- `50`
- `56`
- `60`
- `260`

## Gaps (phone px)

- `11.200000000000001`
- `16.8`
- `21`
- `22`
- `28`
- `28`
- `35`
- `42`
- `44`
- `56`
- `70`

## Radii (px)

- web: `2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 99, 100, 999, 9999`
- app: `2, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 26, 28, 30, 32, 36, 40, 44, 80, 100, 999`

**Missing in app:**
- `99`
- `9999`

## CSS variables with no app theme key

- `--green=#22c55e`
- `--green-dim=rgba(34, 197, 94, 0.08)`
- `--font-display="Syne", sans-serif`
- `--font-body="DM Sans", sans-serif`
- `--orange=#f97316`
- `--orange-hover=#fb923c`
- `--orange-dim=rgba(249, 115, 22, 0.08)`
- `--orange-glow=rgba(249, 115, 22, 0.2)`
- `--bg=#f8f8fc`
- `--bg-panel=#ffffff`
- `--bg-card=rgba(0, 0, 0, 0.02)`
- `--bg-input=rgba(0, 0, 0, 0.03)`
- `--text=#0f0f1a`
- `--text-dim=rgba(15, 15, 26, 0.6)`
- `--text-muted=rgba(15, 15, 26, 0.35)`
- `--border=rgba(0, 0, 0, 0.08)`
- `--border-hover=rgba(0, 0, 0, 0.16)`
- `--border-focus=#f97316`
- `--red=#ef4444`
- `--red-dim=rgba(239, 68, 68, 0.08)`
- `--shadow=0 4px 24px rgba(0, 0, 0, 0.08)`
- `--shadow-card=0 2px 8px rgba(0, 0, 0, 0.06)`

## Components

- web: 246 files export components
- app: 322 files export components

**Present only on web:**
- `LandingPage`
- `AuthLayout`
- `AppDownload`
- `FloatingDownloadButton`
- `QRCodeDownload`
- `FeedbackButton`
- `SocialQR`
- `UserActivityLog`
- `WaitlistSection`
- `AuthGuard`
- `CategorySuggest`
- `GoogleSignInButton`
- `NotFound`
- `BookingList`
- `ConversationVideoCallPage`
- `VideoCallPage`
- `DashboardCurrencySwitch`
- `DurationBadge`
- `Translator`
- `ConfirmationModal`
- `RaiseDisputeModal`
- `AIJobAssistant`
- `CreateBookingFromJob`
- `HirerBookings`
- `HirerDashboard`
- `HirerNotifications`
- `HirerPaymentHistory`
- `HirerProfile`
- `HirerReviewsGiven`
- `HirerReviewsReceived`
- `HirerSavedWorkers`
- `InsuranceSuccess`
- `WalletCallback`
- `HirerJobBoard`
- `HirerJobBoardManagement`
- `HirerVerification`
- `AdminLayout`
- `HirerLayout`
- `WorkerLayout`
- `FlutterwaveConfirm`
- `ManualPaymentSuccess`
- `PaystackVerify`
- `ReleasePayment`
- `LeaveReview`
- `WorkerReviewsPage`
- `SearchPage`
- `VoiceSearch`
- `SEO`
- `SEOBlogPost`
- `SettingsPage`
- `FeatureGate`
- `FeaturedSuccess`
- `SubscriptionPlans`
- `SubscriptionSuccess`
- `GlobalSupportBanner`
- `SupportChatWidget`
- `SupportNotificationListener`
- `SurveyPage`
- `AlertModal`
- `FullScreenLoader`
- `SkilledProzLoader`
- `UserProfile`
- `IncomingCallBanner`
- `VoiceCallButton`
- `VideoIntroSection`
- `RouteTracker`
- `SOCKET_URL`
- `BlogPage`
- `DownloadPage`
- `About`
- `PrivacyPolicy`
- `RefundPolicy`
- `Terms`
- `AdminAnalytics`
- `AdminAnalyticsUsers`
- `AdminAuditLog`
- `AdminBookings`
- `AdminBroadcast`
- `AdminCampaign`
- `AdminCategories`
- `AdminCategoryDemand`
- `AdminContacts`
- `AdminDashboard`
- `AdminDisputes`
- `AdminExternalJobStats`
- `AdminExternalJobs`
- `AdminFeatured`
- `AdminFeedback`
- `AdminFunnelBuilder`
- `AdminInsurance`
- `AdminJobPost`
- `AdminLiveFeed`
- `AdminLogs`
- `AdminManualPayments`
- `AdminMessages`
- `AdminPaymentFunnel`
- `AdminPayments`
- `AdminPlatformJobs`
- `AdminPosts`
- `AdminPromoCodes`
- `AdminReferrals`
- `AdminRefunds`
- `AdminReports`
- `AdminRetainedCycleDetail`
- `AdminRetainedCycles`
- `AdminRetainedStaff`
- `AdminReviews`
- `AdminSegments`
- `AdminSettings`
- `AdminSubscriptions`
- `AdminSupport`
- `AdminSurveys`
- `AdminTopWorkers`
- `AdminUserCoverage`
- `AdminUsers`
- `AdminVerifications`
- `AdminVideoCalls`
- `AdminWaitlist`
- `AdminWallet`
- `AdminWithdrawals`
- `GoogleCallback`
- `ResetPassword`
- `FeedPage`
- `MyPostsPage`
- `PostCardSkeleton`
- `EditRetainedStaffModal`
- `HirerCycleDetail`
- `HirerRetainedStaffDashboard`
- `HirerRetainedStaffDetail`
- `HirerRetainedStaffList`
- `HirerRetainedStaffNew`
- `WalletDepositSuccess`
- `CompletedJobs`
- `ExternalJobBoard`
- `ExternalJobDetail`
- `MyJobApplications`
- `VideoIntro`
- `WorkerSavedJobs`
- `AvailabilityPage`
- `CategoriesPage`
- `CertificationsPage`
- `WorkerEarningsPage`
- `NIGERIAN_BANKS`
- `PortfolioPage`
- `EditProfilePage`
- `ReviewsPage`
- `WorkerRefundDetailPage`
- `RefundCard`
- `RefundFilters`
- `RefundStatusPill`
- `RefundSummaryCard`
- `WorkerRefundsPage`
- `WorkerEmployerDetail`
- `WorkerRetainedCycles`
- `WorkerRetainedEarnings`
- `WorkerRetainedEmployers`
- `BackgroundCheck`
- `WorkerVerification`
- `NGN_HIRER_FEE_RATE`
- `FOREIGN_HIRER_FEE_RATE`
- `HIRER_FEE_RATE`
- `WORKER_FEE_RATE`