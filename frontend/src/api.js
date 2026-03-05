// DIANA V2 - User-Focused API Layer
// Simplified version for menopausal user platform

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

let API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

// Fix Git Bash (MSYS2) path translation bug where '/api/v1' becomes 'C:/Program Files/Git/api/v1'
if (API_BASE && /^[a-zA-Z]:[/\\]/.test(API_BASE)) {
  console.warn(`[API] Detected Windows file path in API_BASE (${API_BASE}) likely due to Git Bash path translation. Normalizing to '/api/v1'`);
  API_BASE = '/api/v1';
}

export { API_BASE };
const ML_BASE = import.meta.env.VITE_ML_BASE || `http://localhost:${import.meta.env.VITE_ML_PORT || '5001'}`;

// Token refresh lock to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

// Subscribe to token refresh completion
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Notify all subscribers that refresh completed
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => {
    callback(newToken);
  });
  refreshSubscribers = [];
};

const attemptTokenRefresh = async () => {
  const refreshToken = localStorage.getItem('diana_refresh_token');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Token refresh failed' }));
    throw new Error(error.error || 'Token refresh failed');
  }

  const data = await response.json();

  // Store the new tokens
  localStorage.setItem('diana_token', data.access_token);
  localStorage.setItem('diana_refresh_token', data.refresh_token);

  return data.access_token;
};

const apiFetch = async (endpoint, options = {}, isRetry = false) => {
  const token = localStorage.getItem('diana_token');
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
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
      const newToken = await attemptTokenRefresh();
      onTokenRefreshed(newToken);
      isRefreshing = false;

      // Retry original request with new token
      return apiFetch(endpoint, options, true);
    } catch (refreshError) {
      isRefreshing = false;

      // Clear tokens and redirect to login on refresh failure
      localStorage.removeItem('diana_token');
      localStorage.removeItem('diana_refresh_token');

      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=session_expired';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
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
  const token = localStorage.getItem('diana_token');
  const headers = {};

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response;
};

const mlFetchJson = async (path, options = {}) => {
  const apiKey = import.meta.env.VITE_ML_API_KEY;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const res = await fetch(`${ML_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!res.ok) throw new Error(`ML API error: ${res.status}`);
  return res.json();
};

const mlFetch = async path => mlFetchJson(path);

export const fetchMLHealthApi = () => mlFetch('/health');
export const fetchMLMetricsApi = () => mlFetch('/insights/metrics');
export const fetchMLInformationGainApi = () => mlFetch('/insights/information-gain');
export const fetchMLClustersApi = () => mlFetch('/insights/clusters');
export const getMLVisualizationUrl = name => `${ML_BASE}/insights/visualizations/${name}`;
export { mlFetchJson };

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
    mutationFn: (refreshToken) => logoutApi(refreshToken),
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
    mutationFn: (data) => updateUserProfileApi(data),
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
    mutationFn: (data) => completeOnboardingApi(data),
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
    mutationFn: (data) => updateConsentSettingsApi(data),
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
    mutationFn: (data) => createAssessmentApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

export const useUpdateAssessment = (assessmentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateAssessmentApi(assessmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useDeleteAssessment = (assessmentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAssessmentApi(assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useAssessment = (assessmentId) => {
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

      // Transform backend TrendData format to frontend-expected format
      // Backend returns parallel arrays, frontend expects array of objects
      const biomarkerHistory = data.dates.map((date, index) => ({
        date,
        hba1c: data.hba1c_values?.[index] || null,
        bmi: data.bmi_values?.[index] || null,
        fbs: data.fbs_values?.[index] || null,
        triglycerides: data.triglycerides_values?.[index] || null,
        ldl: data.ldl_values?.[index] || null,
        hdl: data.hdl_values?.[index] || null,
        systolic: data.systolic_values?.[index] || null,
        diastolic: data.diastolic_values?.[index] || null,
      }));

      const clusterHistory = data.dates.map((date, index) => {
        const riskLevel = data.risk_scores?.[index] || 'low';
        const riskScoreMap = { low: 20, medium: 50, high: 80 };
        return {
          date,
          cluster: data.clusters?.[index] || 'Unknown',
          riskScore: riskScoreMap[riskLevel] || 0,
        };
      });

      const riskLevels = data.dates.length > 0 ? {
        low: data.risk_scores?.filter(r => r === 'low').length || 0,
        medium: data.risk_scores?.filter(r => r === 'medium').length || 0,
        high: data.risk_scores?.filter(r => r === 'high').length || 0,
      } : null;

      return {
        biomarkerHistory,
        clusterHistory,
        riskLevels,
      };
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
    mutationFn: (userData) => createAdminUserApi(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useUpdateAdminUser = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData) => updateAdminUserApi(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useDeactivateAdminUser = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deactivateAdminUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useActivateAdminUser = (userId) => {
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
export const updateUserProfileApi = async (data) => {
  return apiFetch('/users/me/profile', {
    method: 'PUT',
    body: data,
  });
};

// Complete onboarding
export const completeOnboardingApi = async (data) => {
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
export const updateConsentSettingsApi = async (data) => {
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
  return apiFetch('/users/me/assessments');
};
export const fetchAssessmentsApi = getAssessmentsApi;

// Create new assessment for logged-in user
export const createAssessmentApi = async (data) => {
  return apiFetch('/users/me/assessments', {
    method: 'POST',
    body: data,
  });
};

// Get single assessment
export const getAssessmentApi = async (assessmentId) => {
  return apiFetch(`/users/me/assessments/${assessmentId}`);
};

// Update assessment
export const updateAssessmentApi = async (assessmentId, data) => {
  return apiFetch(`/users/me/assessments/${assessmentId}`, {
    method: 'PUT',
    body: data,
  });
};

// Delete assessment
export const deleteAssessmentApi = async (assessmentId) => {
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
export const adminListUsersApi = async (params) => {
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

export const createAdminUserApi = async (userData) => {
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

export const deactivateAdminUserApi = async (userId) => {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
};

export const activateAdminUserApi = async (userId) => {
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

export const forgotPasswordApi = async (email) => {
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

export const verifyEmailApi = async (token) => {
  return apiFetch('/auth/verify-email', {
    method: 'POST',
    body: { token },
  });
};

export const resendVerificationApi = async (email) => {
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
