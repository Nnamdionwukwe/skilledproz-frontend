import { createContext, useContext, useEffect, useState } from "react";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user, accessToken } = useAuthStore();
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !user) {
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }
    api
      .get("/subscriptions/my")
      .then((res) => {
        setSubscription(res.data.data.subscription);
        setPlan(res.data.data.plan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, user?.id]);

  const tier = subscription?.tier || "FREE";
  const isFreeTier = tier === "FREE";
  const isProTier = tier === "PRO" || tier === "ENTERPRISE";
  const isEnterprise = tier === "ENTERPRISE";

  // Feature flags based on tier
  const features = {
    // Search & Discovery
    advancedSearch: isProTier,
    gpsRadius: isProTier,
    verifiedFirst: isProTier,
    unlimitedSavedWorkers: isProTier,

    // Jobs & Bookings
    unlimitedJobPosts: isProTier,
    directBooking: isProTier,
    unlimitedApplications: isProTier,
    priorityMatching: isProTier,

    // Profile
    proBadge: isProTier,
    boostedSearch: isProTier,
    videoIntro: isProTier,
    unlimitedPortfolio: isProTier,

    // Analytics
    analytics: isProTier,
    jobAnalytics: isProTier,
    earningsAnalytics: isProTier,

    // Support
    prioritySupport: isProTier,
    accountManager: isEnterprise,

    // Enterprise only
    teamAccounts: isEnterprise,
    apiAccess: isEnterprise,
    bulkHiring: isEnterprise,
    whitelabelInvoices: isEnterprise,
    complianceReporting: isEnterprise,
    customSLA: isEnterprise,

    // Limits
    jobPostsPerMonth: plan?.limits?.jobPostsPerMonth ?? 3,
    bidsPerMonth: plan?.limits?.bidsPerMonth ?? 5,
    portfolioImages: plan?.limits?.portfolioImages ?? 1,
    teamAccountCount: plan?.limits?.teamAccounts ?? 0,
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        tier,
        loading,
        isFreeTier,
        isProTier,
        isEnterprise,
        features,
        refresh: () => {
          api.get("/subscriptions/my").then((res) => {
            setSubscription(res.data.data.subscription);
            setPlan(res.data.data.plan);
          });
        },
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
