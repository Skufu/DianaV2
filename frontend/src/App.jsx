import { useEffect, useState, Suspense, lazy, useMemo, useCallback, memo } from 'react';
import { useUserProfile, useLogin, useLogout } from './api';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import AdminSidebar from './components/layout/AdminSidebar';
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

// Loading skeleton for lazy components
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
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
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminView, setAdminView] = useState('overview'); // Separate state for admin navigation
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // Device performance detection (computed once)
  const performanceTier = useMemo(() => getPerformanceTier(), []);
  const animationNodeCount = useMemo(() => getAnimationNodeCount(), []);
  const disableHeavyEffects = useMemo(() => shouldDisableHeavyEffects(), []);

  // React Query hooks
  const queryClient = useQueryClient();
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

    // Store JWT tokens in localStorage for authenticated API requests
    if (res.access_token) {
      localStorage.setItem('diana_token', res.access_token);
      setToken(res.access_token);
    }
    if (res.refresh_token) {
      localStorage.setItem('diana_refresh_token', res.refresh_token);
    }

    const role = res.user.role || 'user';
    const userIsAdmin = role === 'admin';

    setUserRole(role);
    setIsAdmin(userIsAdmin);
    setUserId(res.user.id);
    setIsAuthenticated(true);

    // Redirect admin users to admin dashboard
    if (userIsAdmin) {
      setActiveTab('admin');
    }

    // Invalidate all queries so they refetch with the new token
    queryClient.invalidateQueries();
  }, [loginMutation, queryClient]);

  const handleLogout = useCallback(async () => {
    await logoutMutation.mutateAsync();

    // Clear JWT tokens from localStorage
    localStorage.removeItem('diana_token');
    localStorage.removeItem('diana_refresh_token');

    setIsAuthenticated(false);
    setToken(null);
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
      const storedToken = localStorage.getItem('diana_token');
      if (storedToken) {
        setToken(storedToken);
      }
      if (profile?.onboarding_completed === true) {
        setShowOnboarding(false);
      } else {
        setShowOnboarding(!profile.first_name || !profile.last_name);
      }
    } else if (profileError) {
      const status = profileError.response?.status;
      if (status === 401 || status === 403) {
        setIsAuthenticated(false);
        setToken(null);
      }
    }
  }, [profile, profileLoading, profileError]);



  const handleStartAssessment = useCallback(() => {
    setActiveTab('profile');
  }, []);

  // Render content for regular users
  const renderUserContent = useCallback(() => {
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
        return <Export token={token} />;
      default:
        return <Dashboard_user userId={userId} />;
    }
  }, [userId, activeTab, showOnboarding]);

  // Render content for admin users
  const renderAdminContent = useCallback(() => {
    return <AdminDashboard userRole={userRole} activeView={adminView} setActiveView={setAdminView} token={token} />;
  }, [userRole, adminView, token]);

  const handleSignupSuccess = useCallback((res) => {
    if (!res?.user) throw new Error('signup failed');
    setUserRole(res.user.role || 'user');
    setIsAdmin(res.user.role === 'admin');
    setUserId(res.user.id);
    setIsAuthenticated(true);
  }, []);

  const isAssessmentOpen = useMemo(() => activeTab === 'profile', [activeTab]);

  return (
    <>
      <CustomCursor isLoggedIn={isAuthenticated} />
      {!isAuthenticated ? (
        <Suspense fallback={<LoadingSkeleton />}>
          {showSignup ? (
            <Signup onSignup={handleSignupSuccess} onShowLogin={() => setShowSignup(false)} />
          ) : (
            <Login onLogin={handleLogin} onShowSignup={() => setShowSignup(true)} />
          )}
        </Suspense>
      ) : isAdmin ? (
        // Admin gets purple-themed layout with AdminSidebar
        <div
          className="flex min-h-screen relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F0A1E 0%, #1E1B4B 100%)' }}
        >
          {/* Purple gradient overlay for admin */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-indigo-900/10 pointer-events-none" />

          <AdminSidebar
            activeView={adminView}
            setActiveView={setAdminView}
            onLogout={handleLogout}
          />

          <main className="relative z-10 flex-1 ml-20 lg:ml-72 p-6 lg:p-8">
            <ErrorBoundary section={adminView}>
              <Suspense fallback={<LoadingSkeleton />}>{renderAdminContent()}</Suspense>
            </ErrorBoundary>
          </main>
        </div>
      ) : (
        // Regular user gets teal-themed layout with Sidebar
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
              <Suspense fallback={<LoadingSkeleton />}>{renderUserContent()}</Suspense>
            </ErrorBoundary>
          </main>
        </div>
      )}
    </>
  );
};

export default App;
