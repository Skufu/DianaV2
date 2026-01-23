// DIANA V2 - User-Focused API Layer
// Simplified version for menopausal user platform

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';
export { API_BASE };
const ML_BASE = import.meta.env.VITE_ML_BASE || `http://localhost:${import.meta.env.VITE_ML_PORT || '5001'}`;

// Simple fetch wrapper with JWT token support
const apiFetch = async (endpoint, options = {}) => {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
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
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: getUserProfileApi,
    retry: 1,
    enabled: !!localStorage.getItem('diana_token'),
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
    queryFn: () => getTrendsApi(months),
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

export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchAdminDashboardApi,
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

export const useClinicComparison = () => {
  return useQuery({
    queryKey: ['admin', 'clinics', 'comparison'],
    queryFn: fetchClinicComparisonApi,
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
  return apiFetch('/admin/stats');
};

// Export research data (anonymized, consented users only)
export const adminExportResearchDataApi = async () => {
  return apiFetch('/admin/export/research');
};

export const signupApi = async (email, password, firstName, lastName) => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
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
