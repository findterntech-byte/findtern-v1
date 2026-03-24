import "bootstrap/dist/css/bootstrap.min.css"; // Using your saved path
import "../App.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation } from "wouter";
import { Suspense, lazy, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { getEmployerAuth, type EmployerAuth } from "@/lib/employerAuth";
import { isGuestMode } from "@/lib/guestMode";

import Layout from "./layout/Layout";

// Marketing pages
const Home = lazy(() => import("./pages/findtern-ui/Home"));
const About = lazy(() => import("./pages/findtern-ui/About"));
const Pricing = lazy(() => import("./pages/findtern-ui/Pricing"));
const Employers = lazy(() => import("./pages/findtern-ui/Employers"));
const Interns = lazy(() => import("./pages/findtern-ui/Interns"));
const GuaranteedProgram = lazy(() => import("./pages/findtern-ui/GuaranteedProgram"));
const Blog = lazy(() => import("./pages/findtern-ui/Blog"));
const BlogDetail = lazy(() => import("./pages/findtern-ui/BlogDetail"));
const Contact = lazy(() => import("./pages/findtern-ui/Contact"));
const Faq = lazy(() => import("./pages/findtern-ui/Faq"));
const Terms = lazy(() => import("./pages/findtern-ui/Terms"));
const InternTerms = lazy(() => import("./pages/findtern-ui/InternTerms"));
const EmployerTerms = lazy(() => import("./pages/findtern-ui/EmployerTerms"));

// Intern pages
import SignupPage from "@/pages/signup";
import LoginPage from "@/pages/login";
import OnboardingLoadingPage from "@/pages/onboarding-loading";
import OnboardingPage from "@/pages/onboarding";
import DashboardPage from "@/pages/dashboard";
import DashboardDocumentsPage from "@/pages/dashboard-documents";
import InterviewsPage from "@/pages/interviews";
import ProposalsPage from "@/pages/proposals";
import ProposalDetailPage from "@/pages/proposal-detail";
import SettingsPage from "@/pages/settings";
import EditProfilePage from "@/pages/edit-profile";
import NotificationsPage from "@/pages/notifications";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import EarningsPage from "@/pages/earnings";
import OpportunitiesPage from "@/pages/opportunities";
import VerifyEmailPage from "@/pages/verify-email";
import TimesheetsPage from "@/pages/timesheets";

// Admin pages
import AdminLoginPage from "@/pages/admin/admin-login";
import AdminDashboardPage from "@/pages/admin/admin-dashboard";
import AdminInternsPage from "@/pages/admin/admin-interns";
import AdminCompaniesPage from "@/pages/admin/admin-companies";
import AdminProjectsPage from "@/pages/admin/admin-projects";
import AdminSettingsPage from "@/pages/admin/admin-settings";
import AdminReportsPage from "@/pages/admin/admin-reports";
import AdminUsersPage from "@/pages/admin/admin-users";
import AdminInternDetailPage from "@/pages/admin/admin-intern-detail";
import AdminCompanyDetailPage from "@/pages/admin/admin-company-detail";
import AdminProposalTrackerPage from "@/pages/admin/admin-proposal-tracker";
import AdminTransactionsPage from "@/pages/admin/admin-transactions";
import AdminWebsitePage from "@/pages/admin/admin-website";
import AdminContactMessagesPage from "@/pages/admin/admin-contact-messages";
import AdminNotificationsPage from "@/pages/admin/admin-notifications";
import AdminInternTermsPage from "@/pages/admin/admin-intern-terms";
import AdminCompanyTermsPage from "@/pages/admin/admin-company-terms";
import AdminInternNonDisclosureClausesPage from "@/pages/admin/admin-intern-non-disclosure-clauses";
import AdminRolesPage from "@/pages/admin/admin-roles";

// Employer pages
import EmployerSignupPage from "@/pages/employer/employer-signup";
import EmployerLoginPage from "@/pages/employer/employer-login";
import EmployerOnboardingPage from "@/pages/employer/employer-onboarding";
import EmployerDashboardPage from "@/pages/employer/employer-dashboard";
import EmployerSchedulePage from "@/pages/employer/employer-schedule";
import CompanyProfilePage from "@/pages/employer/company-profile";
import CompanySetupPage from "@/pages/employer/company-setup";
import CompanyAccountPage from "@/pages/employer/company-account";
import EmployerChangePasswordPage from "@/pages/employer/employer-change-password";
import EmployerCartPage from "@/pages/employer/employer-cart";
import EmployerCheckoutPage from "@/pages/employer/employer-checkout";
import EmployerComparePage from "@/pages/employer/employer-compare";
import EmployerInternDetailPage from "@/pages/employer/employer-intern-detail";
import EmployerProposalsPage from "@/pages/employer/employer-proposals";
import EmployerProposalDetailPage from "@/pages/employer/employer-proposal-detail";
import EmployerProposalEditPage from "@/pages/employer/employer-proposal-edit-page";
import EmployerSendProposalPage from "@/pages/employer/employer-send-proposal";
import EmployerAlertsPage from "@/pages/employer/employer-alerts";
import EmployerOrdersPage from "./pages/employer/employer-orders";
import EmployerTimesheetDetailPage from "@/pages/employer/employer-timesheet-detail";
import EmployerForgotPasswordPage from "@/pages/employer/forgot-password";
import EmployerResetPasswordPage from "@/pages/employer/reset-password";
import EmployerProjectsPage from "@/pages/employer/employer-projects";
import EmployerVerifyEmailPage from "@/pages/employer/verify-email";

import NotFound from "@/pages/not-found";

function GoogleOAuthCallbackBridge() {
  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search || "" : "";
    if (typeof window !== "undefined") {
      window.location.replace(`/api/auth/google/callback${qs}`);
    }
  }, []);

  return null;
}

function FindternGoogleOAuthStartBridge() {
  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search || "" : "";
    if (typeof window !== "undefined") {
      window.location.replace(`/api/findtern/google/oauth/start${qs}`);
    }
  }, []);

  return null;
}

function FindternGoogleOAuthCallbackBridge() {
  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search || "" : "";
    if (typeof window !== "undefined") {
      window.location.replace(`/api/findtern/google/oauth/callback${qs}`);
    }
  }, []);

  return null;
}

function AdminIndexRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/admin/dashboard");
  }, [setLocation]);
  return null;
}

function EmployerIndexRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/employer/dashboard");
  }, [setLocation]);
  return null;
}

function InternAliasRedirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

type EmployerStage = "setup" | "onboarding" | "internal";

function EmployerRouteGuard({
  requiredStage,
  children,
}: {
  requiredStage: EmployerStage;
  children: ReactNode;
}) {
  const [location, setLocation] = useLocation();
  const [checked, setChecked] = useState(false);
  const [auth, setAuth] = useState<EmployerAuth | null>(null);

  useEffect(() => {
    const current = getEmployerAuth();
    setAuth((prev) => {
      if (prev === current) return prev;
      if (!prev && !current) return prev;
      if (!prev || !current) return current;
      if (
        prev.id === current.id &&
        prev.companyEmail === current.companyEmail &&
        prev.setupCompleted === current.setupCompleted &&
        prev.onboardingCompleted === current.onboardingCompleted &&
        prev.name === current.name &&
        prev.companyName === current.companyName
      ) {
        return prev;
      }
      return current;
    });

    const go = (to: string) => {
      if (location !== to) setLocation(to);
    };

    if (!current) {
      go("/employer/login");
      setChecked((prev) => (prev ? prev : true));
      return;
    }

    if (requiredStage === "setup") {
      if (current.setupCompleted) {
        if (current.onboardingCompleted) {
          go("/employer/dashboard");
        } else {
          go("/employer/onboarding");
        }
      }
      setChecked((prev) => (prev ? prev : true));
      return;
    }

    if (requiredStage === "onboarding") {
      if (!current.setupCompleted) {
        go("/employer/setup");
      } else if (current.onboardingCompleted) {
        go("/employer/dashboard");
      }
      setChecked((prev) => (prev ? prev : true));
      return;
    }

    if (requiredStage === "internal") {
      if (!current.setupCompleted) {
        go("/employer/setup");
        setChecked((prev) => (prev ? prev : true));
        return;
      }
      if (!current.onboardingCompleted) {
        go("/employer/onboarding");
        setChecked((prev) => (prev ? prev : true));
        return;
      }
    }

    setChecked((prev) => (prev ? prev : true));
  }, [location, requiredStage, setLocation]);

  if (!checked || !auth) return null;
  return <>{children}</>;
}

function AdminRouteGuard({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/admin/me", { credentials: "include" });
        if (!res.ok) {
          setLocation("/admin/login");
          return;
        }

        const json = (await res.json()) as any;
        if (!json?.admin) {
          setLocation("/admin/login");
          return;
        }

        if (!cancelled) setAllowed(true);
      } catch {
        setLocation("/admin/login");
      } finally {
        if (!cancelled) setChecked(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  if (!checked) return null;
  if (!allowed) return null;
  return <>{children}</>;
}

function MarketingPage({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}

function ScrollToTopOnRouteChange() {
  const [location] = useLocation();

  useEffect(() => {
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      // ignore
    }
  }, []);

  useLayoutEffect(() => {
    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      requestAnimationFrame(() => {
        try {
          document.documentElement.scrollTop = 0;
          document.documentElement.scrollLeft = 0;
          document.body.scrollTop = 0;
          document.body.scrollLeft = 0;
        } catch {
          // ignore
        }

        const containers = document.querySelectorAll<HTMLElement>(
          "[data-scroll-container], [data-radix-scroll-area-viewport], .app-main, #root, [data-scroll-root], .overflow-y-auto, .overflow-auto, .overflow-y-scroll, .overflow-scroll",
        );

        containers.forEach((el) => {
          try {
            el.scrollTo({ top: 0, left: 0, behavior: "auto" });
          } catch {
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        });
      });
    };

    reset();
    setTimeout(reset, 0);
    setTimeout(reset, 50);
  }, [location]);

  return null;
}

function InternRouteGuard({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const guest = isGuestMode();
    const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

    const go = (to: string) => {
      if (location !== to) setLocation(to);
    };

    if (guest) {
      go("/opportunities");
      setAllowed(false);
      setChecked(true);
      return;
    }

    if (!userId) {
      const next = location && location.startsWith("/") ? location : "/dashboard";
      go(`/login?next=${encodeURIComponent(next)}`);
      setAllowed(false);
      setChecked(true);
      return;
    }

    setAllowed(true);
    setChecked(true);
  }, [location, setLocation]);

  if (!checked) return null;
  if (!allowed) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <>
      <ScrollToTopOnRouteChange />
      <Suspense fallback={null}>
        <Switch>
          <Route path="/auth/google/callback" component={GoogleOAuthCallbackBridge} />
          <Route path="/auth/google/callback/auth" component={GoogleOAuthCallbackBridge} />
          <Route path="/google/auth" component={FindternGoogleOAuthStartBridge} />
          <Route path="/google/callback" component={FindternGoogleOAuthCallbackBridge} />

          {/* Marketing */}
          <Route path="/">
            <MarketingPage>
              <Home />
            </MarketingPage>
          </Route>
          <Route path="/about">
            <MarketingPage>
              <About />
            </MarketingPage>
          </Route>
          <Route path="/pricing">
            <MarketingPage>
              <Pricing />
            </MarketingPage>
          </Route>
          <Route path="/employers">
            <MarketingPage>
              <Employers />
            </MarketingPage>
          </Route>
          <Route path="/interns">
            <MarketingPage>
              <Interns />
            </MarketingPage>
          </Route>
          <Route path="/guaranteed-internship-program">
            <MarketingPage>
              <GuaranteedProgram />
            </MarketingPage>
          </Route>
          <Route path="/blog">
            <MarketingPage>
              <Blog />
            </MarketingPage>
          </Route>
          <Route path="/blog/:slug">
            {(params) => (
              <MarketingPage>
                <BlogDetail params={params} />
              </MarketingPage>
            )}
          </Route>
          <Route path="/contact">
            <MarketingPage>
              <Contact />
            </MarketingPage>
          </Route>
          <Route path="/faq">
            <MarketingPage>
              <Faq />
            </MarketingPage>
          </Route>
          <Route path="/terms-and-conditions">
            <MarketingPage>
              <Terms />
            </MarketingPage>
          </Route>

          <Route path="/intern-terms-and-conditions">
            <MarketingPage>
              <InternTerms />
            </MarketingPage>
          </Route>

          <Route path="/employer-terms-and-conditions">
            <MarketingPage>
              <EmployerTerms />
            </MarketingPage>
          </Route>

          {/* Intern (canonical routes) */}
          <Route path="/login">
            <MarketingPage>
              <LoginPage />
            </MarketingPage>
          </Route>
          <Route path="/forgot-password">
            <MarketingPage>
              <ForgotPasswordPage />
            </MarketingPage>
          </Route>
          <Route path="/reset-password">
            <MarketingPage>
              <ResetPasswordPage />
            </MarketingPage>
          </Route>
          <Route path="/verify-email">
            <MarketingPage>
              <VerifyEmailPage />
            </MarketingPage>
          </Route>
          <Route path="/signup">
            <MarketingPage>
              <SignupPage />
            </MarketingPage>
          </Route>
          <Route path="/opportunities" component={OpportunitiesPage} />
          <Route path="/onboarding-loading" component={OnboardingLoadingPage} />

          <Route path="/onboarding">
            <InternRouteGuard>
              <OnboardingPage />
            </InternRouteGuard>
          </Route>
          <Route path="/dashboard">
            <InternRouteGuard>
              <DashboardPage />
            </InternRouteGuard>
          </Route>
          <Route path="/dashboard/documents">
            <InternRouteGuard>
              <DashboardDocumentsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/earnings">
            <InternRouteGuard>
              <EarningsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/interviews">
            <InternRouteGuard>
              <InterviewsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/proposals">
            <InternRouteGuard>
              <ProposalsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/proposals/:id">
            <InternRouteGuard>
              <ProposalDetailPage />
            </InternRouteGuard>
          </Route>
          <Route path="/notifications">
            <InternRouteGuard>
              <NotificationsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/settings/change-password">
            <InternRouteGuard>
              <SettingsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/settings">
            <InternRouteGuard>
              <SettingsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/timesheets">
            <InternRouteGuard>
              <TimesheetsPage />
            </InternRouteGuard>
          </Route>
          <Route path="/edit-profile">
            <InternRouteGuard>
              <EditProfilePage />
            </InternRouteGuard>
          </Route>

          {/* Intern aliases under /intern/* */}
          <Route path="/intern/login">
            <InternAliasRedirect to="/login" />
          </Route>
          <Route path="/intern/signup">
            <InternAliasRedirect to="/signup" />
          </Route>
          <Route path="/intern/onboarding-loading">
            <InternAliasRedirect to="/onboarding-loading" />
          </Route>
          <Route path="/intern/onboarding">
            <InternAliasRedirect to="/onboarding" />
          </Route>
          <Route path="/intern/dashboard">
            <InternAliasRedirect to="/dashboard" />
          </Route>
          <Route path="/intern/dashboard/documents">
            <InternAliasRedirect to="/dashboard/documents" />
          </Route>
          <Route path="/intern/interviews">
            <InternAliasRedirect to="/interviews" />
          </Route>
          <Route path="/intern/proposals">
            <InternAliasRedirect to="/proposals" />
          </Route>
          <Route path="/intern/proposals/:id">
            {(params) => <InternAliasRedirect to={`/proposals/${params.id ?? ""}`} />}
          </Route>
          <Route path="/intern/settings">
            <InternAliasRedirect to="/settings" />
          </Route>
          <Route path="/intern/timesheets">
            <InternAliasRedirect to="/timesheets" />
          </Route>
          <Route path="/intern/edit-profile">
            <InternAliasRedirect to="/edit-profile" />
          </Route>

          {/* Employer */}
          <Route path="/employer" component={EmployerIndexRedirect} />
          <Route path="/employer/signup">
            <MarketingPage>
              <EmployerSignupPage />
            </MarketingPage>
          </Route>
          <Route path="/employer/login">
            <MarketingPage>
              <EmployerLoginPage />
            </MarketingPage>
          </Route>
          <Route path="/employer/forgot-password">
            <MarketingPage>
              <EmployerForgotPasswordPage />
            </MarketingPage>
          </Route>
          <Route path="/employer/reset-password">
            <MarketingPage>
              <EmployerResetPasswordPage />
            </MarketingPage>
          </Route>
          <Route path="/employer/verify-email">
            <MarketingPage>
              <EmployerVerifyEmailPage />
            </MarketingPage>
          </Route>

          <Route path="/employer/setup">
            <EmployerRouteGuard requiredStage="setup">
              <CompanySetupPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/onboarding">
            <EmployerRouteGuard requiredStage="onboarding">
              <EmployerOnboardingPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/dashboard">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerDashboardPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/projects">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerProjectsPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/profile">
            <EmployerRouteGuard requiredStage="internal">
              <CompanyProfilePage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/account">
            <EmployerRouteGuard requiredStage="internal">
              <CompanyAccountPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/account/change-password">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerChangePasswordPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/schedule">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerSchedulePage />
            </EmployerRouteGuard>
          </Route>
          {/* Backward-compatible typo route */}
          <Route path="/employer/shedule">
            <InternAliasRedirect to="/employer/schedule" />
          </Route>
          <Route path="/employer/cart">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerCartPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/checkout">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerCheckoutPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/proposals">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerProposalsPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/alerts">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerAlertsPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/notifications">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerAlertsPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/orders">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerOrdersPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/timesheets/:id">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerTimesheetDetailPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/proposals/:id">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerProposalDetailPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/proposals/:id/edit">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerProposalEditPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/compare">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerComparePage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/intern/:id">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerInternDetailPage />
            </EmployerRouteGuard>
          </Route>
          <Route path="/employer/intern/:id/proposal">
            <EmployerRouteGuard requiredStage="internal">
              <EmployerSendProposalPage />
            </EmployerRouteGuard>
          </Route>

          {/* Admin */}
          <Route path="/admin" component={AdminIndexRedirect} />
          <Route path="/admin/login" component={AdminLoginPage} />
          <Route path="/admin/dashboard">
            <AdminRouteGuard>
              <AdminDashboardPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/website">
            <AdminRouteGuard>
              <AdminWebsitePage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/interns/terms">
            <AdminRouteGuard>
              <AdminInternTermsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/interns/non-disclosure">
            <AdminRouteGuard>
              <AdminInternNonDisclosureClausesPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/companies/terms">
            <AdminRouteGuard>
              <AdminCompanyTermsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/users">
            <AdminRouteGuard>
              <AdminUsersPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/interns">
            <AdminRouteGuard>
              <AdminInternsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/proposal-tracker">
            <AdminRouteGuard>
              <AdminProposalTrackerPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/interns/:id">
            <AdminRouteGuard>
              <AdminInternDetailPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/companies">
            <AdminRouteGuard>
              <AdminCompaniesPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/companies/:id">
            <AdminRouteGuard>
              <AdminCompanyDetailPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/projects">
            <AdminRouteGuard>
              <AdminProjectsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/transactions">
            <AdminRouteGuard>
              <AdminTransactionsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/settings">
            <AdminRouteGuard>
              <AdminSettingsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/contact">
            <AdminRouteGuard>
              <AdminContactMessagesPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/notifications">
            <AdminRouteGuard>
              <AdminNotificationsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/reports">
            <AdminRouteGuard>
              <AdminReportsPage />
            </AdminRouteGuard>
          </Route>
          <Route path="/admin/roles">
            <AdminRouteGuard>
              <AdminRolesPage />
            </AdminRouteGuard>
          </Route>

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}