import { useEffect, useState, Suspense, lazy, useMemo, useCallback, memo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserProfile, useLogin, useLogout } from './api';
import Sidebar from './components/layout/Sidebar';
import Login from './components/auth/Login';
import BiologicalNetwork from './components/layout/BiologicalNetwork';
import CustomCursor from './components/common/CustomCursor';
import ErrorBoundary from './components/common/ErrorBoundary';
import {
  getAnimationNodeCount,
  shouldDisableHeavyEffects,
  getPerformanceTier,
  PERF_TIER,
} from './utils/deviceCapabilities';

// Lazy-loaded route components for code splitting
const Dashboard_user = lazy(() => import('./components/user/Dashboard_user'));
const UserProfile = lazy(() => import('./components/user/UserProfile'));
const Onboarding = lazy(() => import('./components/user/Onboarding'));
const PersonalTrends = lazy(() => import('./components/user/PersonalTrends'));
const Insights = lazy(() => import('./components/insights/Insights'));
const Education = lazy(() => import('./components/education/Education'));
const Export = lazy(() => import('./components/export/Export'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const Signup = lazy(() => import('./components/auth/Signup'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading skeleton for lazy components
const LoadingSkeleton = memo(() => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-slate-700/50 rounded" />
    <div className="h-4 w-full max-w-md bg-slate-700/30 rounded" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {['skeleton-1', 'skeleton-2', 'skeleton-3'].map(id => (
        <div key={id} className="h-40 bg-slate-700/20 rounded-2xl" />
      ))}
    </div>
  </div>
);

LoadingSkeleton.displayName = 'LoadingSkeleton';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // Device performance detection (computed once)
  const performanceTier = useMemo(() => getPerformanceTier(), []);
  const animationNodeCount = useMemo(() => getAnimationNodeCount(), []);
  const disableHeavyEffects = useMemo(() => shouldDisableHeavyEffects(), []);

  // React Query hooks
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  // Apply low-perf CSS class to body for global effect reduction
  useEffect(() => {
    if (disableHeavyEffects) {
      document.body.classList.add('low-perf');
    }
    if (performanceTier !== PERF_TIER.HIGH) {
      document.body.classList.add('reduced-motion');
    }
    return () => {
      document.body.classList.remove('low-perf', 'reduced-motion');
    };
  }, [disableHeavyEffects, performanceTier]);

  const handleLogin = useCallback(async (email, password) => {
    const res = await loginMutation.mutateAsync({ email, password });
    if (!res?.user) throw new Error('login failed');
    setUserRole(res.user.role || 'user');
    setIsAdmin(res.user.role === 'admin');
    setUserId(res.user.id);
    setIsAuthenticated(true);
  }, [loginMutation]);

  const handleLogout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    setIsAuthenticated(false);
    setUserRole(null);
    setIsAdmin(false);
    setUserId(null);
  }, [logoutMutation]);

  // Sync auth state with profile data from React Query
  useEffect(() => {
    if (profile && !profileLoading && !profileError) {
      setUserRole(profile.role || 'user');
      setIsAdmin(profile.role === 'admin');
      setUserId(profile.id);
      setIsAuthenticated(true);
      if (profile?.onboarding_completed === true) {
        setShowOnboarding(false);
      } else {
        setShowOnboarding(!profile.first_name || !profile.last_name);
      }
    } else if (profileError) {
      setIsAuthenticated(false);
    }
  }, [profile, profileLoading, profileError]);



  const handleStartAssessment = useCallback(() => {
    setActiveTab('profile');
  }, []);

  const renderContent = useCallback(() => {
    if (showOnboarding) {
      return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard_user userId={userId} setActiveTab={setActiveTab} />;
      case 'profile':
        return <UserProfile userId={userId} setActiveTab={setActiveTab} />;
      case 'trends':
        return <PersonalTrends userId={userId} />;
      case 'insights':
        return <Insights />;
      case 'education':
        return <Education />;
      case 'export':
        return <Export />;
      case 'admin':
        return isAdmin ? (
          <AdminDashboard userRole={userRole} />
        ) : (
          <Dashboard_user userId={userId} />
        );
      default:
        return <Dashboard_user userId={userId} />;
    }
  }, [userId, isAdmin, userRole, activeTab, showOnboarding]);

  const handleSignupSuccess = useCallback((res) => {
    if (!res?.user) throw new Error('signup failed');
    setUserRole(res.user.role || 'user');
    setIsAdmin(res.user.role === 'admin');
    setUserId(res.user.id);
    setIsAuthenticated(true);
  }, []);

  const isAssessmentOpen = useMemo(() => activeTab === 'profile', [activeTab]);

  return (
    <QueryClientProvider client={queryClient}>
      <CustomCursor isLoggedIn={isAuthenticated} />
      {!isAuthenticated ? (
        showSignup ? (
          <Signup onSignup={handleSignupSuccess} onShowLogin={() => setShowSignup(false)} />
        ) : (
          <Login onLogin={handleLogin} onShowSignup={() => setShowSignup(true)} />
        )
      ) : (
        <div
          className="flex min-h-screen relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1E293B 100%)' }}
        >
          {/* Animated Background - disabled on low-end devices */}
          {animationNodeCount > 0 && (
            <BiologicalNetwork
              nodeCount={animationNodeCount}
              connectionDistance={200}
              speed={0.15}
            />
          )}

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/5 via-transparent to-cyan-900/5 pointer-events-none" />

          {!isAssessmentOpen && (
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onStartAssessment={handleStartAssessment}
              onLogout={handleLogout}
              userRole={userRole}
              isAdmin={isAdmin}
            />
          )}

          <main
            className={`relative z-10 flex-1 ${isAssessmentOpen ? '' : 'ml-20 lg:ml-72'} p-6 lg:p-8`}
          >
            <ErrorBoundary section={activeTab}>
              <Suspense fallback={<LoadingSkeleton />}>{renderContent()}</Suspense>
            </ErrorBoundary>
          </main>
        </div>
      )}
    </QueryClientProvider>
  );
};

export default App;
