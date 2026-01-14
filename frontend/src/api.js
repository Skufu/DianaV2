// DIANA V2 - User-Focused API Layer
// Simplified version for menopausal user platform

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';
export { API_BASE };
const ML_BASE = import.meta.env.VITE_ML_BASE || `http://localhost:${import.meta.env.VITE_ML_PORT || '5001'}`;

// Simple fetch wrapper - no caching, no complex token refresh
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('diana_token');
  const headers = {
    'Content-Type': 'application/json',
  };

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

const mlFetch = async path => {
  const res = await fetch(`${ML_BASE}${path}`);
  if (!res.ok) throw new Error(`ML API error: ${res.status}`);
  return res.json();
};

export const fetchMLHealthApi = () => mlFetch('/health');
export const fetchMLMetricsApi = () => mlFetch('/insights/metrics');
export const fetchMLInformationGainApi = () => mlFetch('/insights/information-gain');
export const fetchMLClustersApi = () => mlFetch('/insights/clusters');
export const getMLVisualizationUrl = name => `${ML_BASE}/insights/visualizations/${name}`;

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
    body: JSON.stringify(data),
  });
};

// Complete onboarding
export const completeOnboardingApi = async (data) => {
  return apiFetch('/users/me/onboarding', {
    method: 'POST',
    body: JSON.stringify(data),
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
    body: JSON.stringify(data),
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
    body: JSON.stringify(data),
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
    body: JSON.stringify(data),
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

// Export user's health data as PDF for doctor
export const exportPDFApi = async () => {
  const response = await apiFetch('/users/me/export/pdf');
  
  if (!response.ok) {
    throw new Error('Failed to generate PDF');
  }
  
  // Get blob from response
  const blob = await response.blob();
  
  // Create download link
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

export const loginApi = async (email, password) => {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

export const logoutApi = async refreshToken => {
  return apiFetch('/auth/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
};

export const fetchClusterDistributionApi = async token => {
  return apiFetch('/insights/cluster-distribution');
};

export const fetchTrendInsightsApi = async token => {
  return apiFetch('/insights/biomarker-trends');
};
