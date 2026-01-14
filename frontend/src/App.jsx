// App: auth gate, tab routing, and user-centric data management
import React, { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import {
  loginApi,
  getUserProfileApi,
} from './api';
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

// Loading skeleton for lazy components
const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-slate-700/50 rounded" />
    <div className="h-4 w-full max-w-md bg-slate-700/30 rounded" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 bg-slate-700/20 rounded-2xl" />
      ))}
    </div>
  </div>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Device performance detection (computed once)
  const performanceTier = useMemo(() => getPerformanceTier(), []);
  const animationNodeCount = useMemo(() => getAnimationNodeCount(), []);
  const disableHeavyEffects = useMemo(() => shouldDisableHeavyEffects(), []);

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

  const handleLogin = async (email, password) => {
    const res = await loginApi(email, password);
    if (!res?.access_token) throw new Error('login failed');
    setToken(res.access_token);
    setRefreshToken(res.refresh_token);
    // Decode JWT to extract user role and ID
    try {
      const payload = JSON.parse(atob(res.access_token.split('.')[1]));
      setUserRole(payload.role || 'user');
      setIsAdmin(payload.is_admin || false);
      setUserId(payload.user_id || payload.sub);
    } catch {
      setUserRole('user');
      setIsAdmin(false);
    }
    setIsAuthenticated(true);
    localStorage.setItem('diana_token', res.access_token);
    localStorage.setItem('diana_refresh_token', res.refresh_token);
  };

  const handleLogout = async () => {
    try {
      // Call logout API to revoke refresh token
      if (refreshToken) {
        const { logoutApi } = await import('./api');
        await logoutApi(refreshToken).catch(() => {
          // Ignore errors - logout locally anyway
        });
      }
    } finally {
      // Always clear local state
      setIsAuthenticated(false);
      setToken(null);
      setRefreshToken(null);
      setUserRole(null);
      setIsAdmin(false);
      setUserId(null);
      setUserProfile(null);
      setShowOnboarding(false);
      localStorage.removeItem('diana_token');
      localStorage.removeItem('diana_refresh_token');
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('diana_token');
    const savedRefreshToken = localStorage.getItem('diana_refresh_token');
    if (savedToken) {
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      // Decode JWT to extract user role and ID
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        setUserRole(payload.role || 'user');
        setIsAdmin(payload.is_admin || false);
        setUserId(payload.user_id || payload.sub);
      } catch {
        setUserRole('user');
        setIsAdmin(false);
      }
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!token || !userId) return;
    const load = async () => {
      setLoadingProfile(true);
      try {
        const profile = await getUserProfileApi(token);
        setUserProfile(profile);
        setShowOnboarding(!profile || !profile.name || !profile.email);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setShowOnboarding(true);
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, [token, userId]);

  const handleStartAssessment = () => {
    setActiveTab('profile');
  };

  const renderContent = () => {
    if (showOnboarding) {
      return <Onboarding token={token} userId={userId} onComplete={() => setShowOnboarding(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard_user token={token} userId={userId} />;
      case 'profile':
        return <UserProfile token={token} userId={userId} />;
      case 'trends':
        return <PersonalTrends token={token} userId={userId} />;
      case 'insights':
        return <Insights token={token} />;
      case 'education':
        return <Education />;
      case 'export':
        return <Export token={token} />;
      case 'admin':
        return isAdmin ? (
          <AdminDashboard token={token} userRole={userRole} />
        ) : (
          <Dashboard_user token={token} userId={userId} />
        );
      default:
        return <Dashboard_user token={token} userId={userId} />;
    }
  };

  const isAssessmentOpen = activeTab === 'profile';

  return (
    <>
      <CustomCursor isLoggedIn={isAuthenticated} />
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
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
    </>
  );
};

export default App;
