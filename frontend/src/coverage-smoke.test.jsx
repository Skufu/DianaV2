import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const stripMotionProps = props => {
  const {
    animate,
    exit,
    initial,
    layout,
    layoutId,
    transition,
    variants,
    viewport,
    whileFocus,
    whileHover,
    whileInView,
    whileTap,
    custom,
    ...rest
  } = props;
  return rest;
};

vi.mock('framer-motion', () => {
  const createMotionComponent = tag => {
    const MotionComponent = React.forwardRef(({ children, ...props }, ref) =>
      React.createElement(tag, { ...stripMotionProps(props), ref }, children)
    );
    MotionComponent.displayName = `MockMotion.${tag}`;
    return MotionComponent;
  };

  const motion = new Proxy(
    {},
    {
      get: (_, tag) => {
        if (typeof tag !== 'string') return undefined;
        return createMotionComponent(tag);
      },
    }
  );

  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    LayoutGroup: ({ children }) => <>{children}</>,
    motion,
    useReducedMotion: () => true,
  };
});

vi.mock('./utils/animations', async () => {
  const actual = await vi.importActual('./utils/animations');
  return {
    ...actual,
    useReducedMotion: () => true,
    useInputFocusVariants: () => ({ focus: { scale: 1, transition: { duration: 0 } } }),
  };
});

vi.mock('recharts', () => {
  const Chart = ({ children, ...props }) => (
    <svg data-chart={props.dataKey || props.name || 'chart'}>{children}</svg>
  );
  const Cell = () => null;
  return {
    Area: Chart,
    AreaChart: Chart,
    Bar: Chart,
    BarChart: Chart,
    CartesianGrid: Chart,
    Cell,
    Legend: Chart,
    Line: Chart,
    LineChart: Chart,
    Pie: Chart,
    PieChart: Chart,
    PolarAngleAxis: Chart,
    PolarGrid: Chart,
    PolarRadiusAxis: Chart,
    Radar: Chart,
    RadarChart: Chart,
    ReferenceArea: Chart,
    ReferenceLine: Chart,
    ResponsiveContainer: Chart,
    Scatter: Chart,
    ScatterChart: Chart,
    Tooltip: Chart,
    XAxis: Chart,
    YAxis: Chart,
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    cancelQueries: vi.fn(),
    clear: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('./api', () => {
  const assessment = {
    id: 101,
    user_id: 7,
    risk_score: 76,
    risk_level: 'high',
    risk_label: 'High Risk',
    predicted_status: 'At-Risk',
    at_risk_probability: 0.76,
    cluster: 'SIRD',
    cluster_description: 'Insulin-resistant metabolic profile',
    treatment_focus: 'Lifestyle and metabolic monitoring',
    validation_status: 'passed',
    validation_warnings: ['Confirm abnormal values with diagnostic testing.'],
    model_version: 'binary_v2_no_bp',
    dataset_hash: 'abc123def4567890',
    bmi: 31.4,
    hba1c: 6.3,
    fbs: 118,
    cholesterol: 218,
    ldl: 142,
    hdl: 44,
    triglycerides: 214,
    systolic: 132,
    diastolic: 84,
    waist_circumference: 92,
    age: 54,
    created_at: '2026-05-01T08:00:00Z',
    updated_at: '2026-05-01T08:00:00Z',
    output_capabilities: {
      at_risk_probability: true,
      metabolic_subtype: true,
      predicted_status: true,
    },
    cluster_capability: { supported: true },
  };

  const priorAssessment = {
    ...assessment,
    id: 100,
    risk_score: 58,
    risk_level: 'medium',
    created_at: '2026-04-01T08:00:00Z',
  };

  const profile = {
    id: 7,
    email: 'patient@example.com',
    role: 'user',
    first_name: 'Maria',
    last_name: 'Santos',
    date_of_birth: '1972-06-15',
    menopause_status: 'postmenopause',
    years_menopause: 5,
    onboarding_completed: true,
    is_active: true,
    is_admin: false,
    assessment_count: 2,
    latest_assessment: assessment,
    current_risk_level: 'high',
  };

  const assessments = [assessment, priorAssessment];

  const clusters = [
    { cluster: 'SIDD', count: 12 },
    { cluster: 'SIRD', count: 18 },
    { cluster: 'MOD', count: 9 },
    { cluster: 'MARD', count: 7 },
  ];

  const trendInsights = [
    { date: '2026-03-01', risk_score: 62, hba1c: 6.4, fbs: 120, bmi: 32.0 },
    { date: '2026-04-01', risk_score: 58, hba1c: 6.2, fbs: 114, bmi: 31.6 },
    { date: '2026-05-01', risk_score: 76, hba1c: 6.3, fbs: 118, bmi: 31.4 },
  ];

  const mlMetrics = {
    clinical: {
      best_model: {
        best_model: 'Logistic Regression',
        metrics: {
          accuracy: 0.74,
          auc_roc: 0.72,
          f1: 0.71,
          sensitivity: 0.76,
          specificity: 0.68,
          npv: 0.81,
        },
      },
      model_comparison: [
        {
          Model: 'Logistic Regression',
          Accuracy: 0.74,
          Precision: 0.7,
          Recall: 0.76,
          'AUC-ROC': 0.72,
        },
        { Model: 'Random Forest', Accuracy: 0.71, Precision: 0.68, Recall: 0.7, 'AUC-ROC': 0.69 },
      ],
    },
  };

  const mlClusters = {
    n_clusters: 4,
    cluster_sizes: { SIDD: 12, SIRD: 18, MOD: 9, MARD: 7 },
    cluster_labels: {
      SIDD: { risk_score: 74, size: 12 },
      SIRD: { risk_score: 81, size: 18 },
      MOD: { risk_score: 55, size: 9 },
      MARD: { risk_score: 42, size: 7 },
    },
    cluster_profiles: {
      SIDD: {
        means: {
          bmi: 24.8,
          triglycerides: 196,
          ldl: 148,
          hdl: 43,
          age: 51,
          waist_circumference: 84,
        },
      },
      SIRD: {
        means: {
          bmi: 33.1,
          triglycerides: 240,
          ldl: 132,
          hdl: 39,
          age: 54,
          waist_circumference: 96,
        },
      },
      MOD: {
        means: {
          bmi: 35.0,
          triglycerides: 160,
          ldl: 118,
          hdl: 48,
          age: 50,
          waist_circumference: 101,
        },
      },
      MARD: {
        means: {
          bmi: 27.2,
          triglycerides: 142,
          ldl: 112,
          hdl: 52,
          age: 58,
          waist_circumference: 88,
        },
      },
    },
  };

  const mutateAsync = vi
    .fn()
    .mockResolvedValue({ access_token: 'token', refresh_token: 'refresh', user: profile });

  return {
    API_BASE: '/api/v1',
    activateAdminUserApi: vi.fn().mockResolvedValue({}),
    adminListUsersApi: vi
      .fn()
      .mockResolvedValue({ data: [{ ...profile, role: 'doctor' }], total: 1, total_pages: 1 }),
    clearAuthTokens: vi.fn(),
    completeOnboardingApi: vi.fn().mockResolvedValue(profile),
    createAdminUserApi: vi.fn().mockResolvedValue(profile),
    createAssessmentApi: vi.fn().mockResolvedValue(assessment),
    deactivateAdminUserApi: vi.fn().mockResolvedValue({}),
    deleteAccountApi: vi.fn().mockResolvedValue({}),
    deleteAssessmentApi: vi.fn().mockResolvedValue({}),
    deriveRiskLevelFromScore: (riskScore, existingLevel) => {
      if (existingLevel && existingLevel !== 'UNKNOWN' && existingLevel !== 'unknown')
        return existingLevel;
      if (riskScore >= 70) return 'high';
      if (riskScore >= 30) return 'medium';
      if (riskScore >= 0) return 'low';
      return 'unknown';
    },
    exportPDFApi: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
    fetchActiveModelApi: vi.fn().mockResolvedValue({
      id: 1,
      model_name: 'binary_v2_no_bp',
      model_type: 'clinical',
      model_version: 'v2.0.0',
      dataset_hash: 'abc123def4567890',
      feature_set: ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference'],
      is_active: true,
      created_at: '2026-05-01T08:00:00Z',
      metrics: { auc_roc: 0.72, accuracy: 0.74 },
    }),
    fetchAdminDashboardApi: vi.fn().mockResolvedValue({}),
    fetchAdminUsersApi: vi
      .fn()
      .mockResolvedValue({ data: [{ ...profile, role: 'doctor' }], total: 1, total_pages: 1 }),
    fetchAuditLogsApi: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          actor: 'admin@example.com',
          action: 'create_assessment',
          target: 'assessment:101',
          created_at: '2026-05-01T08:00:00Z',
          metadata: { model: 'binary_v2_no_bp' },
        },
      ],
      total: 1,
      total_pages: 1,
    }),
    fetchClinicComparisonApi: vi
      .fn()
      .mockResolvedValue([{ clinic: 'Default clinic', assessments: 10, avg_risk_score: 61 }]),
    fetchClusterDistributionApi: vi.fn().mockResolvedValue(clusters),
    fetchCohortAnalysisApi: vi.fn().mockResolvedValue({
      total_patients: 46,
      total_assessments: 88,
      groups: [
        {
          name: 'SIRD',
          count: 18,
          avg_hba1c: 6.4,
          avg_fbs: 120,
          avg_bmi: 33.1,
          avg_risk_score: 81,
        },
        {
          name: 'SIDD',
          count: 12,
          avg_hba1c: 6.6,
          avg_fbs: 126,
          avg_bmi: 24.8,
          avg_risk_score: 74,
        },
      ],
    }),
    fetchMLClustersApi: vi.fn().mockResolvedValue(mlClusters),
    fetchMLHealthApi: vi.fn().mockResolvedValue({ status: 'ok' }),
    fetchMLInformationGainApi: vi.fn().mockResolvedValue({
      feature_ranking: [
        { feature: 'bmi', ig: 0.22 },
        { feature: 'triglycerides', ig: 0.18 },
        { feature: 'ldl', ig: 0.16 },
      ],
    }),
    fetchMLMetricsApi: vi.fn().mockResolvedValue(mlMetrics),
    fetchMLVisualizationApi: vi.fn().mockResolvedValue(new Blob(['image'], { type: 'image/png' })),
    fetchModelRunsApi: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          run_id: 'run-001',
          model_name: 'binary_v2_no_bp',
          model_type: 'clinical',
          model_version: 'v2.0.0',
          dataset_hash: 'abc123def4567890',
          created_at: '2026-05-01T08:00:00Z',
          metrics: { auc_roc: 0.72, accuracy: 0.74 },
          is_active: true,
        },
      ],
      total: 1,
      total_pages: 1,
    }),
    fetchTrendInsightsApi: vi.fn().mockResolvedValue(trendInsights),
    getAssessmentsApi: vi.fn().mockResolvedValue(assessments),
    getConsentSettingsApi: vi.fn().mockResolvedValue({ consent_personal_data: true }),
    getErrorMessage: (error, fallback) => error?.message || fallback,
    getFieldErrors: error =>
      error?.details && typeof error.details === 'object' && !Array.isArray(error.details)
        ? error.details
        : {},
    getAuthTokens: vi.fn(() => ({ accessToken: 'token', refreshToken: 'refresh' })),
    getMLVisualizationUrl: vi.fn(name => `/api/v1/ml/insights/visualizations/${name}`),
    getTrendsApi: vi.fn().mockResolvedValue({}),
    getUserProfileApi: vi.fn().mockResolvedValue(profile),
    loginApi: vi
      .fn()
      .mockResolvedValue({ access_token: 'token', refresh_token: 'refresh', user: profile }),
    logoutApi: vi.fn().mockResolvedValue({}),
    mlFetchJson: vi.fn().mockResolvedValue({
      shap_values: [
        { feature: 'BMI', value: 0.2 },
        { feature: 'Triglycerides', value: 0.17 },
      ],
      risk_cluster: 'SIRD',
      cluster_info: {
        name: 'Insulin Resistant',
        description: 'Elevated insulin resistance profile',
      },
    }),
    normalizeAssessmentContract: value => value,
    resendVerificationApi: vi.fn().mockResolvedValue({ message: 'resent' }),
    setAuthTokens: vi.fn(),
    signupApi: vi
      .fn()
      .mockResolvedValue({ access_token: 'token', refresh_token: 'refresh', user: profile }),
    syncModelRunsApi: vi.fn().mockResolvedValue({ synced: true }),
    updateAdminUserApi: vi.fn().mockResolvedValue(profile),
    updateAssessmentApi: vi.fn().mockResolvedValue(assessment),
    updateConsentSettingsApi: vi.fn().mockResolvedValue({}),
    updateUserProfileApi: vi.fn().mockResolvedValue(profile),
    useActivateAdminUser: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
    useAdminDashboard: () => ({
      data: {
        stats: {
          total_users: 24,
          new_users_this_month: 4,
          total_patients: 18,
          total_assessments: 88,
          avg_risk_score: 61,
          high_risk_count: 12,
        },
        cluster_distribution: clusters,
        trends: trendInsights,
      },
      isLoading: false,
      error: null,
    }),
    useAdminStats: () => ({ data: {}, isLoading: false, error: null }),
    useAdminUsers: () => ({
      data: { data: [{ ...profile, role: 'doctor' }], total: 1, total_pages: 1 },
      isLoading: false,
    }),
    useAssessment: () => ({ data: assessment, isLoading: false, error: null }),
    useAssessments: () => ({ data: assessments, isLoading: false, error: null, refetch: vi.fn() }),
    useAuditLogs: () => ({
      data: {
        data: [
          {
            id: 1,
            actor: 'admin@example.com',
            action: 'LOGIN',
            target: 'user:7',
            created_at: '2026-05-01T08:00:00Z',
            metadata: { ip: '127.0.0.1' },
          },
        ],
        total: 1,
        total_pages: 1,
      },
      isLoading: false,
      error: null,
    }),
    useActiveModel: () => ({
      data: {
        id: 1,
        model_name: 'binary_v2_no_bp',
        model_type: 'clinical',
        model_version: 'v2.0.0',
        dataset_hash: 'abc123def4567890',
        feature_set: ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference'],
        is_active: true,
        created_at: '2026-05-01T08:00:00Z',
        metrics: { auc_roc: 0.72, accuracy: 0.74 },
      },
      isLoading: false,
      error: null,
    }),
    useClinicComparison: () => ({
      data: [{ clinic: 'Default clinic', assessments: 10, avg_risk_score: 61 }],
    }),
    useClusterDistribution: () => ({ data: clusters, isLoading: false }),
    useCompleteOnboarding: () => ({
      mutateAsync: vi.fn().mockResolvedValue(profile),
      isPending: false,
    }),
    useConsentSettings: () => ({ data: { consent_personal_data: true }, isLoading: false }),
    useCreateAdminUser: () => ({
      mutateAsync: vi.fn().mockResolvedValue(profile),
      isPending: false,
    }),
    useCreateAssessment: () => ({
      mutateAsync: vi.fn().mockResolvedValue(assessment),
      isPending: false,
    }),
    useDeactivateAdminUser: () => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    }),
    useDeleteAccount: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
    useDeleteAssessment: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
    useExportPDF: () => ({ mutate: vi.fn(), isPending: false }),
    useLogin: () => ({ mutateAsync, isPending: false }),
    useLogout: () => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    }),
    useModelRuns: () => ({ data: { data: [], total: 0, total_pages: 1 }, isLoading: false }),
    useOperationsHealth: () => ({
      data: {
        status: 'healthy',
        services: [
          { name: 'backend', status: 'healthy' },
          { name: 'database', status: 'healthy' },
          { name: 'ml', status: 'healthy' },
        ],
        log_sources: [{ name: 'backend', available: true }],
      },
      isLoading: false,
      error: null,
    }),
    useResendVerification: () => ({
      mutateAsync: vi.fn().mockResolvedValue({ message: 'resent' }),
      isPending: false,
    }),
    useTrendInsights: () => ({ data: trendInsights, isLoading: false }),
    useTrends: () => ({
      data: {
        clusterHistory: [
          { date: '2026-05-01', cluster: 'SIRD', riskScore: 76 },
          { date: '2026-04-01', cluster: 'SIDD', riskScore: 58 },
          { date: '2026-03-01', cluster: 'MOD', riskScore: 45 },
        ],
        biomarkerHistory: [
          {
            date: '2026-05-01',
            bmi: 31.4,
            hba1c: 6.3,
            fbs: 118,
            triglycerides: 214,
            ldl: 142,
            hdl: 44,
            systolic: 132,
            diastolic: 84,
            waist_circumference: 92,
          },
          {
            date: '2026-04-01',
            bmi: 31.6,
            hba1c: 6.2,
            fbs: 114,
            triglycerides: 205,
            ldl: 136,
            hdl: 46,
            systolic: 130,
            diastolic: 82,
            waist_circumference: 91,
          },
        ],
        riskLevels: { low: 0, medium: 2, high: 1 },
      },
      isLoading: false,
    }),
    useUpdateAdminUser: () => ({
      mutateAsync: vi.fn().mockResolvedValue(profile),
      isPending: false,
    }),
    useUpdateAssessment: () => ({
      mutateAsync: vi.fn().mockResolvedValue(assessment),
      isPending: false,
    }),
    useUpdateConsentSettings: () => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    }),
    useUpdateProfile: () => ({ mutateAsync: vi.fn().mockResolvedValue(profile), isPending: false }),
    useUserProfile: () => ({ data: profile, isLoading: false, error: null, refetch: vi.fn() }),
    useVerifyEmail: () => ({
      mutateAsync: vi.fn().mockResolvedValue({ message: 'verified' }),
      isPending: false,
    }),
    verifyEmailApi: vi.fn().mockResolvedValue({ message: 'verified' }),
  };
});

import App from './App';
import AdminDashboard from './components/admin/AdminDashboard';
import AuditLogViewer from './components/admin/AuditLogViewer';
import AuthEventLogViewer from './components/admin/AuthEventLogViewer';
import ModelRationale from './components/admin/ModelRationale';
import ModelTraceability from './components/admin/ModelTraceability';
import VerifyEmail from './components/auth/VerifyEmail';
import MLResultModal from './components/common/MLResultModal';
import PDFExport from './components/common/PDFExport';
import StatusSummaryCard from './components/common/StatusSummaryCard';
import { LoginFormSkeleton, SignupFormSkeleton } from './components/common/Skeleton';
import ToastContainer, { ToastProvider, useToast } from './components/common/Toast';
import Education from './components/education/Education';
import Export from './components/export/Export';
import Insights from './components/insights/Insights';
import CohortAnalysis from './components/insights/CohortAnalysis';
import ClusterComparison from './components/insights/ClusterComparison';
import ClusterBiomarkerRadar from './components/insights/ClusterBiomarkerRadar';
import ModelPerformance from './components/insights/ModelPerformance';
import SubgroupDistribution from './components/insights/SubgroupDistribution';
import AdminMobileDrawer from './components/layout/AdminMobileDrawer';
import AdminMobileHeader from './components/layout/AdminMobileHeader';
import AdminSidebar from './components/layout/AdminSidebar';
import BiologicalNetwork from './components/layout/BiologicalNetwork';
import MobileDrawer from './components/layout/MobileDrawer';
import MobileHeader from './components/layout/MobileHeader';
import MouseGlow from './components/layout/MouseGlow';
import Sidebar from './components/layout/Sidebar';
import Onboarding from './components/user/Onboarding';
import PersonalTrends from './components/user/PersonalTrends';
import UserProfile from './components/user/UserProfile';

const assessment = {
  id: 101,
  risk_score: 76,
  risk_level: 'high',
  predicted_status: 'At-Risk',
  at_risk_probability: 0.76,
  cluster: 'SIRD',
  model_version: 'binary_v2_no_bp',
  bmi: 31.4,
  age: 54,
  ldl: 142,
  hdl: 44,
  triglycerides: 214,
  created_at: '2026-05-01T08:00:00Z',
  output_capabilities: {
    at_risk_probability: true,
    metabolic_subtype: true,
    predicted_status: true,
  },
  cluster_capability: { supported: true },
};

const priorAssessment = {
  ...assessment,
  id: 100,
  risk_score: 58,
  risk_level: 'medium',
  created_at: '2026-04-01T08:00:00Z',
};

const normalAssessment = {
  ...assessment,
  id: 102,
  risk_score: 39,
  risk_level: 'medium',
  predicted_status: 'Normal',
  at_risk_probability: 0.39,
  cluster: 'N/A',
  ldl: 40,
  hdl: 56,
  triglycerides: 150,
  bmi: 22.4,
  output_capabilities: {
    at_risk_probability: true,
    metabolic_subtype: false,
    predicted_status: true,
  },
  cluster_capability: { supported: false },
};

const clusters = [
  { cluster: 'SIDD', count: 12 },
  { cluster: 'SIRD', count: 18 },
  { cluster: 'MOD', count: 9 },
  { cluster: 'MARD', count: 7 },
];

const clusterProfiles = {
  cluster_profiles: {
    SIDD: {
      means: { bmi: 24.8, triglycerides: 196, ldl: 148, hdl: 43, age: 51, waist_circumference: 84 },
    },
    SIRD: {
      means: { bmi: 33.1, triglycerides: 240, ldl: 132, hdl: 39, age: 54, waist_circumference: 96 },
    },
  },
};

const metrics = {
  clinical: {
    best_model: {
      best_model: 'Logistic Regression',
      metrics: {
        accuracy: 0.74,
        auc_roc: 0.72,
        f1: 0.71,
        sensitivity: 0.76,
        specificity: 0.68,
        npv: 0.81,
      },
    },
    model_comparison: [
      {
        Model: 'Logistic Regression',
        Accuracy: 0.74,
        Precision: 0.7,
        Recall: 0.76,
        'AUC-ROC': 0.72,
      },
    ],
  },
};

class MockEventSource {
  constructor() {
    this.listeners = {};
    setTimeout(() => {
      this.onopen?.({});
      this.listeners.auth_event?.({
        data: JSON.stringify({
          id: 'evt-1',
          event_type: 'login',
          email: 'patient@example.com',
          ip_address: '127.0.0.1',
          timestamp: '2026-05-01T08:00:00Z',
          success: true,
        }),
      });
    }, 0);
  }

  addEventListener(name, handler) {
    this.listeners[name] = handler;
  }

  close() {}
}

const renderOnce = ui => {
  const result = render(ui);
  return () => result.unmount();
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('diana_access_token', 'token');
  global.EventSource = MockEventSource;
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  global.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 0);
  global.cancelAnimationFrame = id => clearTimeout(id);
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      arc: vi.fn(),
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
      fill: vi.fn(),
      fillRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
    }),
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['image'], { type: 'image/png' }),
    json: async () => ({}),
    headers: new Headers(),
  });
  window.URL.createObjectURL = vi.fn(() => 'blob:mock');
  window.URL.revokeObjectURL = vi.fn();
  window.alert = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('coverage smoke tests', () => {
  it('mounts the main app and completes the login branch', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/email/i), 'patient@example.com');
    await user.type(document.querySelector('#login-password'), 'Password123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/DIANA/i)).toBeInTheDocument();
  });

  it('renders high-value user screens with populated data', async () => {
    let unmount = renderOnce(<PersonalTrends onStartAssessment={vi.fn()} />);
    expect(screen.getByText(/Health Trends/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /share with doctor/i }));
    unmount();

    unmount = renderOnce(
      <UserProfile
        setActiveTab={vi.fn()}
        onStartAssessment={vi.fn()}
        fontScale="comfortable"
        onFontScaleChange={vi.fn()}
      />
    );
    expect(screen.getByText(/My Profile/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    unmount();

    unmount = renderOnce(<Onboarding onComplete={vi.fn()} />);
    expect(screen.getByText(/Welcome to DIANA/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    unmount();

    unmount = renderOnce(
      <StatusSummaryCard
        latestAssessment={assessment}
        priorAssessment={priorAssessment}
        onStartAssessment={vi.fn()}
        onViewTrends={vi.fn()}
        onViewLatest={vi.fn()}
      />
    );
    expect(screen.getByText(/Action Recommended/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <StatusSummaryCard
        latestAssessment={null}
        priorAssessment={null}
        onStartAssessment={vi.fn()}
        onViewTrends={vi.fn()}
        onViewLatest={vi.fn()}
      />
    );
    expect(screen.getByText(/Welcome to DIANA/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <MLResultModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        result={assessment}
        isLoading={false}
      />
    );
    expect(await screen.findByText(/Assessment Result/i)).toBeInTheDocument();
    expect(screen.getByText(/Screening result: At risk - follow up/i)).toBeInTheDocument();
    expect(screen.getByText(/Your result is in the at-risk range/i)).toBeInTheDocument();
    expect(screen.getByText(/Important Caution/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <MLResultModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        result={normalAssessment}
        isLoading={false}
      />
    );
    expect(await screen.findByText(/Screening result: Not at risk/i)).toBeInTheDocument();
    expect(screen.getByText(/39%/i)).toBeInTheDocument();
    expect(screen.getByText(/At-risk estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/No subtype pattern shown/i)).toBeInTheDocument();
    expect(screen.queryByText(/Subtype information unavailable/i)).not.toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <MLResultModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        result={{
          ...normalAssessment,
          predicted_status: '',
          at_risk_probability: 0.465,
          output_capabilities: {
            at_risk_probability: true,
            metabolic_subtype: false,
            predicted_status: false,
          },
        }}
        isLoading={false}
      />
    );
    expect(await screen.findByText(/Screening result: At risk - follow up/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<Education />);
    expect(screen.getByText(/Health Patterns/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /measurements/i }));
    unmount();
  });

  it('renders admin governance and model oversight surfaces', async () => {
    let unmount = renderOnce(<AdminDashboard userRole="admin" activeView="overview" />);
    expect(screen.getByText(/User Accounts/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<AuditLogViewer />);
    expect(screen.getByText(/Audit Logs/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<ModelTraceability />);
    expect(screen.getByText(/ML Server Connection/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sync with ml server/i }));
    expect(screen.getByText(/Model Traceability/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<ModelRationale />);
    expect(screen.getByText(/Screening Model/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    unmount();

    unmount = renderOnce(<AuthEventLogViewer />);
    expect(await screen.findByText(/Real-time Auth Events/i)).toBeInTheDocument();
    expect(await screen.findByText(/Connected/i)).toBeInTheDocument();
    unmount();
  });

  it('renders insight dashboards and standalone analytic panels', async () => {
    let unmount = renderOnce(<Insights />);
    expect(await screen.findByText(/ML Model Performance/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<ModelPerformance mlMetrics={metrics} />);
    expect(screen.getAllByText(/Logistic Regression/i).length).toBeGreaterThan(0);
    unmount();

    unmount = renderOnce(<SubgroupDistribution clusters={clusters} />);
    expect(screen.getByText(/T2DM Subgroups/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<ClusterComparison clusters={clusters} />);
    expect(screen.getByText(/Cluster Comparison/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<ClusterBiomarkerRadar clusterProfiles={clusterProfiles} />);
    expect(screen.getByText(/Metabolic Signatures/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<CohortAnalysis token="token" />);
    expect(await screen.findByText(/Cohort Insights/i)).toBeInTheDocument();
    unmount();
  });

  it('renders authentication recovery flows and export controls', async () => {
    let unmount = renderOnce(
      <VerifyEmail
        initialToken="verify-token"
        initialEmail="patient@example.com"
        onShowLogin={vi.fn()}
      />
    );
    expect(screen.getByText(/Verify your email/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<Export />);
    expect(screen.getAllByText(/Health Report/i).length).toBeGreaterThan(0);
    unmount();

    unmount = renderOnce(<PDFExport />);
    expect(screen.getByText(/Export Health Report/i)).toBeInTheDocument();
    unmount();
  });

  it('renders shell, drawer, network, skeleton, and toast helpers', async () => {
    const user = userEvent.setup();
    let unmount = renderOnce(<MobileHeader isOpen={false} onOpen={vi.fn()} />);
    expect(screen.getByText(/DIANA/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <MobileDrawer
        isOpen
        onClose={vi.fn()}
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        onStartAssessment={vi.fn()}
        onLogout={vi.fn()}
        userInitials="MS"
      />
    );
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <Sidebar
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        onStartAssessment={vi.fn()}
        onLogout={vi.fn()}
        isCollapsed={false}
        setIsCollapsed={vi.fn()}
      />
    );
    expect(screen.getByText(/Log Assessment/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <AdminMobileHeader activeView="overview" onOpen={vi.fn()} isOpen={false} userRole="admin" />
    );
    expect(screen.getByText(/Admin/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <AdminMobileDrawer
        isOpen
        onClose={vi.fn()}
        activeView="overview"
        setActiveView={vi.fn()}
        onLogout={vi.fn()}
        userRole="admin"
      />
    );
    expect(screen.getByText(/Navigation/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <AdminSidebar
        activeView="overview"
        setActiveView={vi.fn()}
        onLogout={vi.fn()}
        isCollapsed={false}
        setIsCollapsed={vi.fn()}
        userRole="admin"
      />
    );
    expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<BiologicalNetwork nodeCount={1} />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
    unmount();

    unmount = renderOnce(<MouseGlow />);
    fireEvent.mouseMove(document, { clientX: 80, clientY: 120 });
    expect(document.querySelector('.pointer-events-none')).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <ToastProvider>
        <ToastHarness />
        <ToastContainer />
      </ToastProvider>
    );
    await user.click(screen.getByRole('button', { name: /show toast/i }));
    expect(await screen.findByText(/Saved successfully/i)).toBeInTheDocument();
    unmount();

    unmount = renderOnce(
      <>
        <LoginFormSkeleton />
        <SignupFormSkeleton />
      </>
    );
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    unmount();
  });
});

function ToastHarness() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.addToast({ type: 'success', message: 'Saved successfully' })}
    >
      Show toast
    </button>
  );
}
