// DIANA V2 - User-Focused API Layer
// Simplified version for menopausal user platform

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';
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
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
};

// Attempt to refresh access token
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
    const error = await response.json();
    throw new Error(error.error || 'Token refresh failed');
  }

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem('diana_token', data.access_token);
  }
  if (data.refresh_token) {
    localStorage.setItem('diana_refresh_token', data.refresh_token);
  }

  return data.access_token;
};

// Simple fetch wrapper with JWT token support and automatic token refresh
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
        subscribeTokenRefresh(async (newToken) => {
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
      // Refresh failed - clear tokens and force logout
      localStorage.removeItem('diana_token');
      localStorage.removeItem('diana_refresh_token');
      // Trigger page reload to go to login
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
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

const mlFetch = async path => {
  const apiKey = import.meta.env.VITE_ML_API_KEY;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const res = await fetch(`${ML_BASE}${path}`, {
    headers,
  });

  if (!res.ok) throw new Error(`ML API error: ${res.status}`);
  return res.json();
};

export const fetchMLHealthApi = () => mlFetch('/health');
export const fetchMLMetricsApi = () => mlFetch('/insights/metrics');
export const fetchMLInformationGainApi = () => mlFetch('/insights/information-gain');
export const fetchMLClustersApi = () => mlFetch('/insights/clusters');
export const getMLVisualizationUrl = name => `${ML_BASE}/insights/visualizations/${name}`;

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

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logoutApi(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

// ============================================================================
// USER PROFILE HOOKS
// ============================================================================

export const useUserProfile = () => {
  const token = localStorage.getItem('diana_token');
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: getUserProfileApi,
    retry: 1,
    enabled: !!token,
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

export const useAssessments = () => {
  return useQuery({
    queryKey: ['assessments'],
    queryFn: getAssessmentsApi,
    enabled: !!localStorage.getItem('diana_token'),
    retry: 1,
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
          cluster: 'SIDD', // Backend doesn't provide cluster in trends, using default
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

export const useAuditLogs = (params = {}) => {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => fetchAuditLogsApi(params),
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
    queryFn: adminGetStatsApi,
  });
};

export const useAdminExportResearchData = () => {
  return useMutation({
    mutationFn: () => adminExportResearchDataApi(),
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

export const fetchAdminDashboardApi = async token => {
  return apiFetch('/admin/dashboard');
};

export const fetchClinicComparisonApi = async token => {
  return apiFetch('/admin/clinics/comparison');
};
export const fetchAdminUsersApi = adminListUsersApi;
export const fetchAdminClinicsApi = async token => {
  return apiFetch('/admin/clinics');
};
export const fetchAuditLogsApi = async (token, params = {}) => {
  const query = new URLSearchParams(params);
  return apiFetch(`/admin/audit?${query}`);
};
export const fetchModelRunsApi = async (token, params = {}) => {
  const query = new URLSearchParams(params);
  return apiFetch(`/admin/models?${query}`);
};
export const fetchActiveModelApi = async token => {
  return apiFetch('/admin/models/active');
};

export const createAdminUserApi = async (token, userData) => {
  return apiFetch('/admin/users', {
    method: 'POST',
    body: userData,
  });
};

export const updateAdminUserApi = async (token, userId, userData) => {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'PUT',
    body: userData,
  });
};

export const deactivateAdminUserApi = async (token, userId) => {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
};

export const activateAdminUserApi = async (token, userId) => {
  return apiFetch(`/admin/users/${userId}/activate`, {
    method: 'POST',
  });
};

// Get system statistics
export const adminGetStatsApi = async () => {
  return apiFetch('/admin/dashboard');
};

// Export research data (anonymized, consented users only)
export const adminExportResearchDataApi = async () => {
  return apiFetch('/admin/export/research');
};

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

export const logoutApi = async refreshToken => {
  return apiFetch('/auth/logout', {
    method: 'POST',
    body: refreshToken ? { refresh_token: refreshToken } : {},
  });
};

export const fetchClusterDistributionApi = async token => {
  return apiFetch('/insights/cluster-distribution');
};

export const fetchTrendInsightsApi = async token => {
  return apiFetch('/insights/biomarker-trends');
};
