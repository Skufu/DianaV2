// DIANA V2 - User-Focused API Layer
// Simplified version for menopausal user platform

/**
 * @fileoverview API layer for DianaV2 frontend. Provides typed API functions
 * for communicating with the Go backend and ML service.
 *
 * All API calls use apiFetch() or mlFetch() - NEVER use raw fetch().
 *
 * TypeScript interfaces are documented via JSDoc below. Contract tests in
 * api.contract.test.js validate that these interfaces match the backend contract.
 *
 * @see backend/internal/http/handlers/contract_test.go for backend contract definitions
 * @see frontend/src/api.contract.test.js for frontend contract tests
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPE DEFINITIONS (JSDoc TypeScript Interfaces)
// =============================================================================

/**
 * @typedef {Object} AuthResponseContract
 * @property {string} message - Success message
 * @property {string} access_token - JWT access token for API authentication
 * @property {string} refresh_token - Refresh token for token renewal
 * @property {UserContract} user - User object with basic info
 */

/**
 * @typedef {Object} UserContract
 * @property {number} id - User ID
 * @property {string} email - User email address
 * @property {string} role - User role ('user', 'doctor', 'admin')
 */

/**
 * @typedef {Object} UserProfileContract
 * @property {number} id - User ID
 * @property {string} email - User email address
 * @property {boolean} onboarding_completed - Whether onboarding flow is complete
 * @property {boolean} is_active - Whether user account is active
 * @property {boolean} is_admin - Whether user has admin privileges
 * @property {string} role - User role ('user', 'doctor', 'admin')
 * @property {number} assessment_count - Number of assessments created
 * @property {AssessmentContract} [latest_assessment] - Most recent assessment (optional)
 * @property {string} [current_risk_level] - Current risk level from latest assessment (optional)
 */

/**
 * @typedef {Object} ConsentSettingsContract
 * @property {boolean} consent_personal_data - Consent to store personal health data
 * @property {boolean} consent_research_participation - Consent to participate in research
 * @property {boolean} consent_email_updates - Consent to receive email updates
 * @property {boolean} consent_analytics - Consent to analytics tracking
 */

/**
 * @typedef {Object} AssessmentContract
 * @property {number} id - Assessment ID
 * @property {number} user_id - Owner user ID
 * @property {number} [risk_score] - Risk score (0-100)
 * @property {string} [risk_level] - Risk level ('low', 'medium', 'high')
 * @property {string} [risk_label] - Human-readable risk label ('Low Risk', etc.)
 * @property {string} [cluster] - Cluster assignment ('SIDD', 'SIRD', 'MOD', 'MARD')
 * @property {string} [cluster_description] - Description of cluster
 * @property {string} [treatment_focus] - Recommended treatment focus
 * @property {string} [model_version] - ML model version used
 * @property {string} [dataset_hash] - Dataset hash for reproducibility
 * @property {string} [validation_status] - Validation status ('passed', 'failed')
 * @property {number} [fbs] - Fasting blood sugar (mg/dL)
 * @property {number} [hba1c] - HbA1c percentage
 * @property {number} [cholesterol] - Total cholesterol (mg/dL)
 * @property {number} [ldl] - LDL cholesterol (mg/dL)
 * @property {number} [hdl] - HDL cholesterol (mg/dL)
 * @property {number} [triglycerides] - Triglycerides (mg/dL)
 * @property {number} [systolic] - Systolic blood pressure (mmHg)
 * @property {number} [diastolic] - Diastolic blood pressure (mmHg)
 * @property {number} [waist_circumference] - Waist circumference (cm)
 * @property {number} [bmi] - Body mass index
 * @property {number} [age] - Age at assessment
 * @property {string} created_at - Creation timestamp (ISO 8601)
 * @property {string} updated_at - Last update timestamp (ISO 8601)
 * @property {Object<string, any>} [feature_set] - Feature set used for prediction
 * @property {Object<string, any>} [cluster_capability] - Cluster capability info
 * @property {Object<string, any>} [output_capabilities] - Output capabilities
 * @property {Object<string, any>} [drift_baseline] - Drift baseline data
 */

/**
 * @typedef {Object} APIErrorContract
 * @property {string} code - Error code ('VALIDATION_ERROR', 'UNAUTHORIZED', etc.)
 * @property {string} message - Human-readable error message
 * @property {Object<string, string>|string} [details] - Additional error details
 */

/**
 * @typedef {Object} AdminDashboardContract
 * @property {number} total_users - Total registered users
 * @property {number} total_patients - Total patients (deprecated)
 * @property {number} total_assessments - Total assessments created
 * @property {number} total_clinics - Total clinics (deprecated)
 * @property {number} avg_risk_score - Average risk score across assessments
 * @property {number} high_risk_count - Number of high-risk assessments
 * @property {number} assessments_this_month - Assessments created this month
 * @property {number} new_users_this_month - New users this month
 */

let API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

// Fix Git Bash (MSYS2) path translation bug where '/api/v1' becomes 'C:/Program Files/Git/api/v1'
if (API_BASE && /^[a-zA-Z]:[/\\]/.test(API_BASE)) {
  console.warn(
    `[API] Detected Windows file path in API_BASE (${API_BASE}) likely due to Git Bash path translation. Normalizing to '/api/v1'`
  );
  API_BASE = '/api/v1';
}

export { API_BASE };
// Token storage for cross-origin auth (Vercel → Render)
// Cookies don't work cross-origin with SameSite=Strict, so we use Bearer tokens.
// Guard the storage API for SSR and test environments where localStorage may be absent or partial.
const getLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return typeof window.localStorage.getItem === 'function' ? window.localStorage : null;
};

let _accessToken = getLocalStorage()?.getItem('diana_access_token') || null;
let _refreshToken = getLocalStorage()?.getItem('diana_refresh_token') || null;

export const setAuthTokens = (accessToken, refreshToken) => {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  const storage = getLocalStorage();
  if (storage) {
    if (accessToken) storage.setItem('diana_access_token', accessToken);
    if (refreshToken) storage.setItem('diana_refresh_token', refreshToken);
  }
};

export const clearAuthTokens = () => {
  _accessToken = null;
  _refreshToken = null;
  const storage = getLocalStorage();
  if (storage) {
    storage.removeItem('diana_access_token');
    storage.removeItem('diana_refresh_token');
  }
};

// CSRF token helper - reads from cookie
const getCSRFToken = () => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'diana_csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Token refresh lock to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

// Subscribe to token refresh completion
const subscribeTokenRefresh = callback => {
  refreshSubscribers.push(callback);
};

// Notify all subscribers that refresh completed
const onTokenRefreshed = () => {
  refreshSubscribers.forEach(callback => {
    callback();
  });
  refreshSubscribers = [];
};

const attemptTokenRefresh = async () => {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refresh_token: _refreshToken }),
  });

  if (!response.ok) {
    clearAuthTokens();
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  // Store new tokens from refresh response
  if (data.access_token) {
    _accessToken = data.access_token;
  }
  if (data.refresh_token) {
    _refreshToken = data.refresh_token;
  }
  return data;
};

const apiFetch = async (endpoint, options = {}, isRetry = false) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Send Bearer token for cross-origin auth
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
    signal: options.signal,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Handle 401 Unauthorized - attempt token refresh and retry
  if (response.status === 401 && !isRetry) {
    if (isRefreshing) {
      // Wait for ongoing refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async () => {
          try {
            const result = await apiFetch(endpoint, options, true);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    // Start token refresh
    isRefreshing = true;
    try {
      await attemptTokenRefresh();
      onTokenRefreshed();
      isRefreshing = false;

      return apiFetch(endpoint, options, true);
    } catch (refreshError) {
      isRefreshing = false;

      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=session_expired';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: `Request failed with status ${response.status}` }));
    const message = error.message || error.error || 'Request failed';
    const requestError = new Error(message);
    requestError.status = response.status;
    if (error.code) requestError.code = error.code;
    throw requestError;
  }

  // Handle empty responses (204 No Content or empty body)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  return response.json();
};

const blobFetch = async (endpoint, options = {}) => {
  const headers = {};

  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response;
};




// ML API calls routed through Go backend proxy (keeps ML server private & API key server-side)
export const fetchMLHealthApi = () => apiFetch('/ml/health');
export const fetchMLMetricsApi = () => apiFetch('/ml/insights/metrics');
export const fetchMLInformationGainApi = () => apiFetch('/ml/insights/information-gain');
export const fetchMLClustersApi = () => apiFetch('/ml/insights/clusters');
export const getMLVisualizationUrl = name => `${API_BASE}/ml/insights/visualizations/${name}`;

// ML fetch routed through backend proxy for SHAP explanations
export const mlFetchJson = async (path, options = {}) => {
  return apiFetch(`/ml${path}`, options);
};

const hasValue = value => value !== undefined && value !== null;

export const deriveRiskLevelFromScore = (riskScore, existingLevel) => {
  if (
    typeof existingLevel === 'string' &&
    existingLevel.trim() &&
    existingLevel.toLowerCase() !== 'unknown'
  ) {
    return existingLevel.toLowerCase();
  }

  const score = Number(riskScore);
  if (!Number.isFinite(score)) return 'unknown';
  if (score < 30) return 'low';
  if (score < 70) return 'medium';
  return 'high';
};

const deriveRiskLabel = riskLevel => {
  switch (riskLevel) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Moderate Risk';
    case 'high':
      return 'High Risk';
    default:
      return '';
  }
};

export const normalizeAssessmentContract = assessment => {
  if (!assessment || typeof assessment !== 'object') return assessment;

  const normalized = { ...assessment };
  const derivedRiskLevel = deriveRiskLevelFromScore(normalized.risk_score, normalized.risk_level);

  if (
    !hasValue(normalized.risk_level) ||
    String(normalized.risk_level).trim() === '' ||
    String(normalized.risk_level).toLowerCase() === 'unknown'
  ) {
    normalized.risk_level = derivedRiskLevel;
  }

  if (!hasValue(normalized.risk_label) || String(normalized.risk_label).trim() === '') {
    const derivedRiskLabel = deriveRiskLabel(derivedRiskLevel);
    if (derivedRiskLabel) {
      normalized.risk_label = derivedRiskLabel;
    }
  }

  return normalized;
};

export const mapTrendsToContract = (data = {}) => {
  const dates = Array.isArray(data.dates) ? data.dates : [];
  const toRiskScore = value => {
    const score = Number(value);
    return Number.isFinite(score) ? score : 0;
  };

  const biomarkerHistory = dates.map((date, index) => ({
    date,
    bmi: data.bmi_values?.[index] ?? null,
    hba1c: data.hba1c_values?.[index] ?? null,
    fbs: data.fbs_values?.[index] ?? null,
    triglycerides: data.triglycerides_values?.[index] ?? null,
    ldl: data.ldl_values?.[index] ?? null,
    hdl: data.hdl_values?.[index] ?? null,
    systolic: data.systolic_values?.[index] ?? null,
    diastolic: data.diastolic_values?.[index] ?? null,
    waist_circumference: data.waist_circumference_values?.[index] ?? null,
  }));

  const clusterHistory = dates.map((date, index) => ({
    date,
    cluster: data.clusters?.[index] || '',
    riskScore: toRiskScore(data.risk_score_values?.[index]),
  }));

  const riskLevels =
    dates.length > 0
      ? {
          low: clusterHistory.filter(({ riskScore }) => riskScore < 30).length,
          medium: clusterHistory.filter(({ riskScore }) => riskScore >= 30 && riskScore < 70)
            .length,
          high: clusterHistory.filter(({ riskScore }) => riskScore >= 70).length,
        }
      : null;

  return {
    biomarkerHistory,
    clusterHistory,
    riskLevels,
  };
};

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

export const useLogin = () => {
  return useMutation({
    mutationFn: ({ email, password }) => loginApi(email, password),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: ({ email }) => forgotPasswordApi(email),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, password }) => resetPasswordApi(token, password),
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: ({ token }) => verifyEmailApi(token),
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: ({ email }) => resendVerificationApi(email),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshToken => logoutApi(refreshToken),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

// ============================================================================
// USER PROFILE HOOKS
// ============================================================================

export const useUserProfile = (enabled = true) => {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: getUserProfileApi,
    retry: 1,
    enabled,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: data => updateUserProfileApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: () => deleteAccountApi(),
  });
};

export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: data => completeOnboardingApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

export const useConsentSettings = () => {
  return useQuery({
    queryKey: ['user', 'consent'],
    queryFn: getConsentSettingsApi,
  });
};

export const useUpdateConsentSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: data => updateConsentSettingsApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'consent'] });
    },
  });
};

// ============================================================================
// ASSESSMENT HOOKS
// ============================================================================

export const useAssessments = (enabled = true) => {
  return useQuery({
    queryKey: ['assessments'],
    queryFn: getAssessmentsApi,
    retry: 1,
    enabled,
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: data => createAssessmentApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

export const useUpdateAssessment = assessmentId => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: data => updateAssessmentApi(assessmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useDeleteAssessment = assessmentId => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAssessmentApi(assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useAssessment = assessmentId => {
  return useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => getAssessmentApi(assessmentId),
    enabled: !!assessmentId,
  });
};

// ============================================================================
// TRENDS HOOKS
// ============================================================================

export const useTrends = (months = 12) => {
  return useQuery({
    queryKey: ['trends', months],
    queryFn: async () => {
      const data = await getTrendsApi(months);
      return mapTrendsToContract(data);
    },
  });
};

// ============================================================================
// EXPORT HOOKS
// ============================================================================

export const useExportPDF = () => {
  return useMutation({
    mutationFn: () => exportPDFApi(),
  });
};

// ============================================================================
// ADMIN HOOKS
// ============================================================================

export const useAdminDashboard = (options = {}) => {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchAdminDashboardApi,
    ...options,
  });
};

export const useAdminUsers = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () => adminListUsersApi(params),
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userData => createAdminUserApi(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useUpdateAdminUser = userId => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userData => updateAdminUserApi(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useDeactivateAdminUser = userId => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deactivateAdminUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useActivateAdminUser = userId => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => activateAdminUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useAuditLogs = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => fetchAuditLogsApi(params),
    ...options,
  });
};

export const useModelRuns = (params = {}) => {
  return useQuery({
    queryKey: ['admin', 'models', params],
    queryFn: () => fetchModelRunsApi(params),
  });
};

export const useActiveModel = () => {
  return useQuery({
    queryKey: ['admin', 'models', 'active'],
    queryFn: fetchActiveModelApi,
  });
};

export const useClinicComparison = (options = {}) => {
  return useQuery({
    queryKey: ['admin', 'clinics', 'comparison'],
    queryFn: fetchClinicComparisonApi,
    ...options,
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminDashboardApi,
  });
};

export const useClusterDistribution = () => {
  return useQuery({
    queryKey: ['insights', 'cluster-distribution'],
    queryFn: fetchClusterDistributionApi,
  });
};

export const useTrendInsights = () => {
  return useQuery({
    queryKey: ['insights', 'biomarker-trends'],
    queryFn: fetchTrendInsightsApi,
  });
};

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

// Get current user's full profile
export const getUserProfileApi = async () => {
  return apiFetch('/users/me/profile');
};

// Update user's profile
export const updateUserProfileApi = async data => {
  return apiFetch('/users/me/profile', {
    method: 'PUT',
    body: data,
  });
};

// Complete onboarding
export const completeOnboardingApi = async data => {
  return apiFetch('/users/me/onboarding', {
    method: 'POST',
    body: data,
  });
};

// Get user's consent settings
export const getConsentSettingsApi = async () => {
  return apiFetch('/users/me/consent');
};

// Update consent settings
export const updateConsentSettingsApi = async data => {
  return apiFetch('/users/me/consent', {
    method: 'PUT',
    body: data,
  });
};

// Get user's assessment trends
export const getTrendsApi = async (months = 12) => {
  return apiFetch(`/users/me/trends?months=${months}`);
};

// Soft delete user account
export const deleteAccountApi = async () => {
  return apiFetch('/users/me/account', {
    method: 'DELETE',
  });
};

// ============================================================================
// ASSESSMENT ENDPOINTS
// ============================================================================

// Get user's assessments
export const getAssessmentsApi = async () => {
  const response = await apiFetch('/users/me/assessments');
  return Array.isArray(response)
    ? response.map(assessment => normalizeAssessmentContract(assessment))
    : response;
};
export const fetchAssessmentsApi = getAssessmentsApi;

// Create new assessment for logged-in user
export const createAssessmentApi = async data => {
  const response = await apiFetch('/users/me/assessments', {
    method: 'POST',
    body: data,
  });

  if (Array.isArray(response)) {
    if (response.length === 0) {
      throw new Error('Invalid assessment response: empty array');
    }
    return normalizeAssessmentContract(response[0]);
  }

  return normalizeAssessmentContract(response);
};

// Get single assessment
export const getAssessmentApi = async assessmentId => {
  const response = await apiFetch(`/users/me/assessments/${assessmentId}`);
  return normalizeAssessmentContract(response);
};

// Update assessment
export const updateAssessmentApi = async (assessmentId, data) => {
  const response = await apiFetch(`/users/me/assessments/${assessmentId}`, {
    method: 'PUT',
    body: data,
  });
  return normalizeAssessmentContract(response);
};

// Delete assessment
export const deleteAssessmentApi = async assessmentId => {
  return apiFetch(`/users/me/assessments/${assessmentId}`, {
    method: 'DELETE',
  });
};

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

export const exportPDFApi = async () => {
  const response = await blobFetch('/users/me/export/pdf');

  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diana_health_report.pdf';
  a.click();
};

// ============================================================================
// ADMIN ENDPOINTS (if user is admin)
// ============================================================================

// List all users
export const adminListUsersApi = async params => {
  const query = new URLSearchParams(params);
  return apiFetch(`/admin/users?${query}`);
};

export const fetchAdminDashboardApi = async () => {
  return apiFetch('/admin/dashboard');
};

export const fetchClinicComparisonApi = async () => {
  return apiFetch('/admin/clinics/comparison');
};
export const fetchAdminUsersApi = adminListUsersApi;
export const fetchAdminClinicsApi = async () => {
  return apiFetch('/admin/clinics');
};
export const fetchAuditLogsApi = async (params = {}) => {
  const query = new URLSearchParams(params);
  return apiFetch(`/admin/audit?${query}`);
};
export const fetchModelRunsApi = async (params = {}) => {
  const query = new URLSearchParams(params);
  return apiFetch(`/admin/models?${query}`);
};
export const fetchActiveModelApi = async () => {
  return apiFetch('/admin/models/active');
};

export const syncModelRunsApi = async () => {
  return apiFetch('/admin/models/sync', {
    method: 'POST',
  });
};

export const createAdminUserApi = async userData => {
  return apiFetch('/admin/users', {
    method: 'POST',
    body: userData,
  });
};

export const updateAdminUserApi = async (userId, userData) => {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'PUT',
    body: userData,
  });
};

export const deactivateAdminUserApi = async userId => {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
};

export const activateAdminUserApi = async userId => {
  return apiFetch(`/admin/users/${userId}/activate`, {
    method: 'POST',
  });
};

// adminGetStatsApi removed — was duplicate of fetchAdminDashboardApi (same /admin/dashboard endpoint)

export const signupApi = async (email, password) => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });
};

export const loginApi = async (email, password) => {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

export const forgotPasswordApi = async email => {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
};

export const resetPasswordApi = async (token, password) => {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
};

export const verifyEmailApi = async token => {
  return apiFetch('/auth/verify-email', {
    method: 'POST',
    body: { token },
  });
};

export const resendVerificationApi = async email => {
  return apiFetch('/auth/resend-verification', {
    method: 'POST',
    body: { email },
  });
};

export const logoutApi = async refreshToken => {
  return apiFetch('/auth/logout', {
    method: 'POST',
    body: refreshToken ? { refresh_token: refreshToken } : {},
  });
};

export const fetchClusterDistributionApi = async () => {
  return apiFetch('/insights/cluster-distribution');
};

export const fetchTrendInsightsApi = async () => {
  return apiFetch('/insights/biomarker-trends');
};
