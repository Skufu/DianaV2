import { useEffect, useState, Suspense, lazy, useCallback, memo } from 'react';
import { useUserProfile, useLogin, useLogout, useAssessments, setAuthTokens, clearAuthTokens } from './api';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import AdminSidebar from './components/layout/AdminSidebar';
import MobileHeader from './components/layout/MobileHeader';
import MobileDrawer from './components/layout/MobileDrawer';
import AdminMobileHeader from './components/layout/AdminMobileHeader';
import AdminMobileDrawer from './components/layout/AdminMobileDrawer';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import VerifyEmail from './components/auth/VerifyEmail';
import ErrorBoundary from './components/common/ErrorBoundary';
import AssessmentForm from './components/user/AssessmentForm';
import {
  applyFontScalePreference,
  getStoredFontScale,
  persistFontScalePreference,
} from './utils/accessibilityPreferences';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, useReducedMotion, breathing } from './utils/animations';

// Lazy load components for code splitting
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const Dashboard_user = lazy(() => import('./components/user/Dashboard_user'));
const UserProfile = lazy(() => import('./components/user/UserProfile'));
const PersonalTrends = lazy(() => import('./components/user/PersonalTrends'));
const Education = lazy(() => import('./components/education/Education'));
const Export = lazy(() => import('./components/export/Export'));
const Onboarding = lazy(() => import('./components/user/Onboarding'));
const Signup = lazy(() => import('./components/auth/Signup'));

// Loading skeleton for lazy components
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <motion.div variants={breathing} animate="animate" className="space-y-4">
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
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminView, setAdminView] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [authView, setAuthView] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  const [authError, setAuthError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [fontScale, setFontScale] = useState(() => getStoredFontScale());

  const queryClient = useQueryClient();
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useUserProfile(isAuthenticated);
  const { data: assessments } = useAssessments(isAuthenticated);
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const [loginError, setLoginError] = useState(null);

  const handleLogin = useCallback(
    async (email, password) => {
      setLoginError(null);
      try {
        const res = await loginMutation.mutateAsync({ email, password });
        if (!res?.user) throw new Error('login failed');

        // Store tokens for cross-origin Bearer auth
        if (res.access_token) setAuthTokens(res.access_token, res.refresh_token);

        const role = res.user.role || 'user';
        const userIsStaff = role === 'admin' || role === 'doctor';

        setUserRole(role);
        setIsAdmin(userIsStaff);
        setUserId(res.user.id);
        setIsAuthenticated(true);

        if (userIsStaff) {
          setActiveTab('admin');
          if (role === 'doctor') {
            setAdminView('assessment');
          }
        }
      } catch (err) {
        setLoginError(err);
      }
    },
    [loginMutation]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset_token');
    const verifyToken = params.get('verify_token');
    const email = params.get('email');
    const error = params.get('error');

    // Clean up URL parameters after reading them
    // This prevents the error from persisting across refreshes
    if (error || resetToken || verifyToken || email) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    if (error) {
      setAuthError(error === 'session_expired' ? 'Session expired. Please log in again.' : error);
    }

    if (resetToken) {
      setAuthView('reset');
      setAuthToken(resetToken);
      return;
    }

    if (verifyToken) {
      setAuthView('verify');
      setAuthToken(verifyToken);
    }

    if (email) {
      setAuthEmail(email);
    }
  }, []);

  useEffect(() => {
    applyFontScalePreference(fontScale);
    persistFontScalePreference(fontScale);
  }, [fontScale]);

  const handleLogout = useCallback(async () => {
    clearAuthTokens();
    queryClient.cancelQueries({ queryKey: ['user'] });
    queryClient.cancelQueries({ queryKey: ['assessments'] });
    queryClient.clear();

    setIsAuthenticated(false);
    setUserRole(null);
    setIsAdmin(false);
    setUserId(null);

    logoutMutation.mutate(null, {
      onError: err => {
        console.error('Logout API error:', err);
      },
    });
  }, [logoutMutation, queryClient]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (profile && !profileLoading && !profileError) {
      const role = profile.role || 'user';
      setUserRole(role);
      setIsAdmin(role === 'admin' || role === 'doctor');
      setUserId(profile.id);
      if (role === 'doctor') {
        setAdminView('assessment');
      }
      const hasAssessments = assessments && assessments.length > 0;
      if (profile?.onboarding_completed === true || hasAssessments) {
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } else if (profileError) {
      const status = profileError.status;
      if (status === 401 || status === 403) {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAdmin(false);
        setUserId(null);
      }
    }
  }, [profile, profileLoading, profileError, isAuthenticated, assessments]);

  const handleStartAssessment = useCallback(() => {
    setShowAssessmentModal(true);
  }, []);

  const renderUserContent = useCallback(() => {
    if (showOnboarding) {
      return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard_user
            userId={userId}
            setActiveTab={setActiveTab}
            onStartAssessment={handleStartAssessment}
          />
        );
      case 'profile':
        return (
          <UserProfile
            userId={userId}
            setActiveTab={setActiveTab}
            onStartAssessment={handleStartAssessment}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
          />
        );
      case 'trends':
        return <PersonalTrends userId={userId} onStartAssessment={handleStartAssessment} />;
      case 'education':
        return <Education />;
      case 'export':
        return <Export />;
      default:
        return <Dashboard_user userId={userId} />;
    }
  }, [userId, activeTab, showOnboarding, handleStartAssessment, fontScale]);

  const renderAdminContent = useCallback(() => {
    return (
      <AdminDashboard
        userRole={userRole}
        activeView={adminView}
        setActiveView={setAdminView}
      />
    );
  }, [userRole, adminView]);

  const handleSignupSuccess = useCallback(res => {
    if (!res?.user) throw new Error('signup failed');

    // Store tokens for cross-origin Bearer auth
    if (res.access_token) setAuthTokens(res.access_token, res.refresh_token);

    if (res.email_verification_required === true) {
      setAuthEmail(res.user.email || '');
      setAuthView('verify');
      setIsAuthenticated(false);
      return;
    }

    const role = res.user.role || 'user';
    setUserRole(role);
    setIsAdmin(role === 'admin' || role === 'doctor');
    setUserId(res.user.id);
    setIsAuthenticated(true);
    if (role === 'doctor') {
      setAdminView('assessment');
    }
  }, []);

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Suspense fallback={<LoadingSkeleton />}>
            {authView === 'signup' ? (
              <Signup onSignup={handleSignupSuccess} onShowLogin={() => setAuthView('login')} />
            ) : authView === 'forgot' ? (
              <ForgotPassword onShowLogin={() => setAuthView('login')} initialEmail={authEmail} />
            ) : authView === 'reset' ? (
              <ResetPassword onShowLogin={() => setAuthView('login')} initialToken={authToken} />
            ) : authView === 'verify' ? (
              <VerifyEmail
                onShowLogin={() => setAuthView('login')}
                initialToken={authToken}
                initialEmail={authEmail}
              />
            ) : (
              <Login
                onLogin={handleLogin}
                onShowSignup={() => setAuthView('signup')}
                onShowForgotPassword={email => {
                  if (email) setAuthEmail(email);
                  setAuthView('forgot');
                }}
                onShowVerify={email => {
                  if (email) setAuthEmail(email);
                  setAuthView('verify');
                }}
                error={loginError || authError}
              />
            )}
          </Suspense>
        </motion.div>
      ) : isAdmin ? (
        // Admin Layout - Clean & Distinct
        <motion.div
          key="admin"
          className="flex min-h-screen relative overflow-hidden bg-diana-stone"
        >
          {/* Admin Mobile Header - Animated */}
          <AnimatePresence>
            <motion.div
              initial={{ y: isReduced ? 0 : -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: isReduced ? 0 : 0.2 }}
            >
              <AdminMobileHeader
                activeView={adminView}
                setActiveView={setAdminView}
                isOpen={isMobileMenuOpen}
                onOpen={() => setIsMobileMenuOpen(true)}
                userRole={userRole}
              />
            </motion.div>
          </AnimatePresence>

          {/* Admin Mobile Drawer - Already has AnimatePresence internally */}
          <AdminMobileDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            activeView={adminView}
            setActiveView={setAdminView}
            onLogout={handleLogout}
            userRole={userRole}
          />

          <AnimatePresence mode="wait">
            <motion.div
              initial={{ x: isReduced ? 0 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isReduced ? 0 : -300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-50 hidden lg:block"
            >
              <AdminSidebar
                activeView={adminView}
                setActiveView={setAdminView}
                onLogout={handleLogout}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                userRole={userRole}
              />
            </motion.div>
          </AnimatePresence>

          <main className={`relative z-10 flex-1 transition-all duration-300 lg:ml-72 p-6 lg:p-8`}>
            <ErrorBoundary section={adminView}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={adminView}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Suspense fallback={<LoadingSkeleton />}>{renderAdminContent()}</Suspense>
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </main>
        </motion.div>
      ) : (
        // User Layout - Soft Modernism (Light Mode)
        <motion.div
          key="user"
          className="flex min-h-screen relative overflow-hidden bg-diana-cream"
        >
          {/* Mobile Header - Animated */}
          <AnimatePresence>
            <motion.div
              initial={{ y: isReduced ? 0 : -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: isReduced ? 0 : 0.2 }}
            >
              <MobileHeader isOpen={isMobileMenuOpen} onOpen={() => setIsMobileMenuOpen(true)} />
            </motion.div>
          </AnimatePresence>

          {/* Mobile Drawer - Already has AnimatePresence internally */}
          <MobileDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onStartAssessment={handleStartAssessment}
            onLogout={handleLogout}
            userInitials={profile?.email?.charAt(0).toUpperCase() || 'U'}
          />

          {/* Subtle Grain or Pattern could go here if needed, keeping it clean for now */}

          <AnimatePresence>
            {!showOnboarding && (
              <motion.div
                initial={{ x: isReduced ? 0 : -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isReduced ? 0 : -300, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 z-50 hidden lg:block"
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
            className={`relative z-10 flex-1 transition-all duration-300 ${!showOnboarding ? 'lg:ml-72 p-6 lg:p-8' : ''}`}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-diana-forest/20 backdrop-blur-sm"
                  onClick={() => setShowAssessmentModal(false)}
                />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative z-10 w-full max-w-2xl"
                >
                  <AssessmentForm
                    initialData={profile}
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
