import { useEffect, useState, Suspense, lazy, useMemo, useCallback, memo } from 'react';
import { useUserProfile, useLogin, useLogout } from './api';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import AdminSidebar from './components/layout/AdminSidebar';
import Login from './components/auth/Login';
import ErrorBoundary from './components/common/ErrorBoundary';
import AssessmentForm from './components/user/AssessmentForm';
import ToastContainer from './components/common/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, useReducedMotion, breathing } from './utils/animations';

// Lazy load components for code splitting
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const Dashboard_user = lazy(() => import('./components/user/Dashboard_user'));
const UserProfile = lazy(() => import('./components/user/UserProfile'));
const PersonalTrends = lazy(() => import('./components/user/PersonalTrends'));
const Insights = lazy(() => import('./components/insights/Insights'));
const Education = lazy(() => import('./components/education/Education'));
const Export = lazy(() => import('./components/export/Export'));
const Onboarding = lazy(() => import('./components/user/Onboarding'));
const Signup = lazy(() => import('./components/auth/Signup'));


// Loading skeleton for lazy components
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <motion.div
      variants={breathing}
      animate="animate"
      className="space-y-4"
    >
      <div className="h-8 w-48 bg-slate-700/50 rounded" />
      <div className="h-4 w-full max-w-md bg-slate-700/30 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {['skeleton-1', 'skeleton-2', 'skeleton-3'].map(id => (
          <div key={id} className="h-40 bg-slate-700/20 rounded-2xl" />
        ))}
      </div>
    </motion.div>
  );
});


const App = () => {
  const isReduced = useReducedMotion();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminView, setAdminView] = useState('overview'); // Separate state for admin navigation
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [showSignup, setShowSignup] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  // React Query hooks - only fetch profile when authenticated
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile(isAuthenticated);
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const [loginError, setLoginError] = useState(null);

  const handleLogin = useCallback(async (email, password) => {
    setLoginError(null);
    try {
      const res = await loginMutation.mutateAsync({ email, password });
      if (!res?.user) throw new Error('login failed');

      // Store tokens in localStorage for API authentication
      localStorage.setItem('diana_token', res.access_token);
      localStorage.setItem('diana_refresh_token', res.refresh_token);

      const role = res.user.role || 'user';
      const userIsAdmin = role === 'admin';

      setToken(res.access_token);
      setRefreshToken(res.refresh_token);
      setUserRole(role);
      setIsAdmin(userIsAdmin);
      setUserId(res.user.id);
      setIsAuthenticated(true);

      if (userIsAdmin) {
        setActiveTab('admin');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    }
  }, [loginMutation, queryClient]);

  const handleLogout = useCallback(async () => {
    const currentRefreshToken = localStorage.getItem('diana_refresh_token');

    try {
      await logoutMutation.mutateAsync(currentRefreshToken);
    } catch (err) {
      console.error('Logout API error:', err);
    }

    localStorage.removeItem('diana_token');
    localStorage.removeItem('diana_refresh_token');

    setIsAuthenticated(false);
    setToken(null);
    setRefreshToken(null);
    setUserRole(null);
    setIsAdmin(false);
    setUserId(null);
  }, [logoutMutation]);

  // Sync auth state with profile data from React Query
  useEffect(() => {
    // Only process profile data if user is authenticated
    if (!isAuthenticated) return;

    if (profile && !profileLoading && !profileError) {
      setUserRole(profile.role || 'user');
      setIsAdmin(profile.role === 'admin');
      setUserId(profile.id);
      if (profile?.onboarding_completed === true) {
        setShowOnboarding(false);
      } else {
        // Show onboarding if not explicitly completed
        setShowOnboarding(true);
      }
    } else if (profileError) {
      const status = profileError.response?.status;
      if (status === 401 || status === 403) {
        // Clear all auth state and storage on auth error
        localStorage.removeItem('diana_token');
        localStorage.removeItem('diana_refresh_token');
        setIsAuthenticated(false);
        setToken(null);
        setRefreshToken(null);
        setUserRole(null);
        setIsAdmin(false);
        setUserId(null);
      }
    }
  }, [profile, profileLoading, profileError, isAuthenticated]);



  const handleStartAssessment = useCallback(() => {
    setShowAssessmentModal(true);
  }, []);

  const handleAssessmentSubmit = useCallback((data) => {
    // AssessmentForm now handles submission and mock modal
    setShowAssessmentModal(false);
  }, []);

  // Render content for regular users
  const renderUserContent = useCallback(() => {
    if (showOnboarding) {
      return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard_user userId={userId} setActiveTab={setActiveTab} onStartAssessment={handleStartAssessment} />;
      case 'profile':
        return <UserProfile userId={userId} setActiveTab={setActiveTab} />;
      case 'trends':
        return <PersonalTrends userId={userId} onStartAssessment={handleStartAssessment} />;
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

    // Store tokens in localStorage for API authentication
    localStorage.setItem('diana_token', res.access_token);
    localStorage.setItem('diana_refresh_token', res.refresh_token);

    setToken(res.access_token);
    setRefreshToken(res.refresh_token);
    setUserRole(res.user.role || 'user');
    setIsAdmin(res.user.role === 'admin');
    setUserId(res.user.id);
    setIsAuthenticated(true);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Suspense fallback={<LoadingSkeleton />}>
            {showSignup ? (
              <Signup onSignup={handleSignupSuccess} onShowLogin={() => setShowSignup(false)} />
            ) : (
              <Login onLogin={handleLogin} onShowSignup={() => setShowSignup(true)} error={loginError} />
            )}
          </Suspense>
        </motion.div>
      ) : isAdmin ? (
        // Admin Layout - Clean & Distinct
        <motion.div key="admin" className="flex min-h-screen relative overflow-hidden bg-diana-stone">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ x: isReduced ? 0 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isReduced ? 0 : -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-50"
            >
              <AdminSidebar
                activeView={adminView}
                setActiveView={setAdminView}
                onLogout={handleLogout}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
              />
            </motion.div>
          </AnimatePresence>

          <main className={`relative z-10 flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-20 lg:ml-72'} p-6 lg:p-8`}>
            <ErrorBoundary section={adminView}>
              <Suspense fallback={<LoadingSkeleton />}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={adminView}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {renderAdminContent()}
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </main>
        </motion.div>
      ) : (
        // User Layout - Soft Modernism (Light Mode)
        <motion.div key="user" className="flex min-h-screen relative overflow-hidden bg-diana-cream">
          {/* Subtle Grain or Pattern could go here if needed, keeping it clean for now */}

          <AnimatePresence>
            {!showOnboarding && (
              <motion.div
                initial={{ x: isReduced ? 0 : -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isReduced ? 0 : -300, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 z-50"
              >
                <Sidebar
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onStartAssessment={handleStartAssessment}
                  onLogout={handleLogout}
                  userRole={userRole}
                  isAdmin={isAdmin}
                  isCollapsed={isSidebarCollapsed}
                  setIsCollapsed={setIsSidebarCollapsed}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <main
            className={`relative z-10 flex-1 transition-all duration-300 ${!showOnboarding ? (isSidebarCollapsed ? 'ml-20' : 'ml-20 lg:ml-72') + ' p-6 lg:p-8' : ''}`}
          >
            <ErrorBoundary section={activeTab}>
              <Suspense fallback={<LoadingSkeleton />}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {renderUserContent()}
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </main>

          {/* Assessment Modal */}
          <AnimatePresence>
            {showAssessmentModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-diana-forest/20 backdrop-blur-sm"
                  onClick={() => setShowAssessmentModal(false)}
                />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="relative z-10 w-full max-w-2xl"
                >
                  <AssessmentForm
                    onSubmit={() => {
                      setShowAssessmentModal(false);
                      // Refresh data by invalidating queries
                      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
                      queryClient.invalidateQueries({ queryKey: ['user', 'assessments'] });
                    }}
                    onCancel={() => setShowAssessmentModal(false)}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;
