// App: auth gate, tab routing, and data fetching for patients/assessments.
import React, { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import {
  createAssessmentApi,
  createPatientApi,
  fetchAssessmentsApi,
  fetchPatientsApi,
  loginApi,
  clearCache,
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
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const PatientHistory = lazy(() => import('./components/patients/PatientHistory'));
const Analytics = lazy(() => import('./components/analytics/Analytics'));
const Export = lazy(() => import('./components/export/Export'));
const Education = lazy(() => import('./components/education/Education'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));

// Loading skeleton for lazy components
const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-48 bg-slate-700/50 rounded" />
    <div className="h-4 w-full max-w-md bg-slate-700/30 rounded" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {[1, 2, 3].map((i) => (
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patientViewState, setPatientViewState] = useState('list');
  const [patients, setPatients] = useState([]);
  const [assessmentsCache, setAssessmentsCache] = useState({});
  const [patientsError, setPatientsError] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

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
    // Decode JWT to extract user role
    try {
      const payload = JSON.parse(atob(res.access_token.split('.')[1]));
      setUserRole(payload.role || 'clinician');
    } catch {
      setUserRole('clinician');
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
      setPatients([]);
      setAssessmentsCache({});
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
      // Decode JWT to extract user role
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        setUserRole(payload.role || 'clinician');
      } catch {
        setUserRole('clinician');
      }
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoadingPatients(true);
      setPatientsError(null);
      try {
        const data = await fetchPatientsApi(token);
        setPatients(data || []);
      } catch (err) {
        setPatientsError('Failed to load patients.');
      } finally {
        setLoadingPatients(false);
      }
    };
    load();
  }, [token]);

  const loadAssessments = async (patientId) => {
    if (assessmentsCache[patientId]) return assessmentsCache[patientId];
    const data = await fetchAssessmentsApi(token, patientId);
    setAssessmentsCache((prev) => ({ ...prev, [patientId]: data || [] }));
    return data || [];
  };

  const refreshPatients = async () => {
    if (!token) return;
    setLoadingPatients(true);
    setPatientsError(null);
    try {
      const data = await fetchPatientsApi(token);
      setPatients(data || []);
      setAssessmentsCache({});
    } catch (err) {
      setPatientsError('Failed to refresh patients.');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleAssessmentSubmit = async (formData, bmi) => {
    if (!token) throw new Error('not authenticated');
    const patientPayload = {
      name: formData.name || 'New Patient',
      age: parseInt(formData.age) || null,
      menopause_status: formData.menopauseStatus,
      years_menopause: parseInt(formData.yearsMenopause) || null,
      bmi: bmi || null,
      bp_systolic: parseInt(formData.systolic) || null,
      bp_diastolic: parseInt(formData.diastolic) || null,
      activity: formData.activity,
      phys_activity: !!formData.physActivity,
      smoking: formData.smoking,
      hypertension: formData.hypertension,
      heart_disease: formData.heartDisease,
      family_history: !!formData.familyHistory,
      chol: parseInt(formData.cholesterol) || null,
      ldl: parseInt(formData.ldl) || null,
      hdl: parseInt(formData.hdl) || null,
      triglycerides: parseInt(formData.triglycerides) || null,
    };
    const patient = await createPatientApi(token, patientPayload);
    const assessmentPayload = {
      fbs: parseFloat(formData.fbs) || 0,
      hba1c: parseFloat(formData.hba1c) || 0,
      cholesterol: parseInt(formData.cholesterol) || null,
      ldl: parseInt(formData.ldl) || null,
      hdl: parseInt(formData.hdl) || null,
      triglycerides: parseInt(formData.triglycerides) || null,
      systolic: parseInt(formData.systolic) || null,
      diastolic: parseInt(formData.diastolic) || null,
      activity: formData.activity,
      history_flag: !!formData.familyHistory,
      smoking: formData.smoking,
      hypertension: formData.hypertension,
      heart_disease: formData.heartDisease,
      bmi: bmi || null,
    };
    const assessment = await createAssessmentApi(token, patient.id, assessmentPayload);
    // Refresh patient list in background to get updated data with FBS/HbA1c
    // Don't await - let it happen in background so Step 4 modal shows immediately
    refreshPatients().catch(console.error);
    return assessment;
  };

  const handleStartAssessment = () => {
    setActiveTab('patients');
    setPatientViewState('form');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            token={token}
            patientCount={patients.length}
            onNavigateToPatient={() => setActiveTab('patients')}
            onStartAssessment={handleStartAssessment}
            loading={loadingPatients}
          />
        );
      case 'patients':
        return (
          <>
            {patientsError && <div className="text-rose-400 text-sm mb-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">{patientsError}</div>}
            <PatientHistory
              viewState={patientViewState}
              setViewState={setPatientViewState}
              patients={patients}
              loadAssessments={loadAssessments}
              onSubmitAssessment={handleAssessmentSubmit}
              token={token}
              onRefreshPatients={refreshPatients}
            />
          </>
        );
      case 'analytics':
        return <Analytics token={token} patients={patients} />;
      case 'education':
        return <Education />;
      case 'export':
        return <Export token={token} />;
      case 'admin':
        return userRole === 'admin' ? (
          <AdminDashboard token={token} userRole={userRole} />
        ) : (
          <Dashboard
            token={token}
            patientCount={patients.length}
            onNavigateToPatient={() => setActiveTab('patients')}
            onStartAssessment={handleStartAssessment}
          />
        );
      default:
        return (
          <Dashboard
            token={token}
            patientCount={patients.length}
            onNavigateToPatient={() => setActiveTab('patients')}
            onStartAssessment={handleStartAssessment}
          />
        );
    }
  };

  const isAssessmentOpen = activeTab === 'patients' && patientViewState === 'form';

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
            <BiologicalNetwork nodeCount={animationNodeCount} connectionDistance={200} speed={0.15} />
          )}

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/5 via-transparent to-cyan-900/5 pointer-events-none" />

          {!isAssessmentOpen && (
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onStartAssessment={handleStartAssessment} onLogout={handleLogout} userRole={userRole} />
          )}

          <main className={`relative z-10 flex-1 ${isAssessmentOpen ? '' : 'ml-20 lg:ml-72'} p-6 lg:p-8`}>
            {loadingPatients ? (
              <LoadingSkeleton />
            ) : (
              <ErrorBoundary section={activeTab}>
                <Suspense fallback={<LoadingSkeleton />}>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
            )}
          </main>
        </div>
      )}
    </>
  );
};

export default App;
