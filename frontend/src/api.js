export const API_BASE = import.meta.env.VITE_API_BASE || '';

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise = null;

// ============================================================
// API Request Cache for GET requests
// ============================================================
const apiCache = new Map();
const DEFAULT_CACHE_TTL = 30000; // 30 seconds default TTL

/**
 * Get cached data if still valid
 * @param {string} key - Cache key (usually the URL path)
 * @returns {object|null} - Cached data or null if expired/missing
 */
const getCached = (key) => {
  const cached = apiCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    apiCache.delete(key);
    return null;
  }
  return cached.data;
};

/**
 * Set cache data with TTL
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in ms
 */
const setCache = (key, data, ttl = DEFAULT_CACHE_TTL) => {
  apiCache.set(key, {
    data,
    expiry: Date.now() + ttl,
    timestamp: Date.now(),
  });
};

/**
 * Invalidate cache entries matching a prefix
 * Used after mutations to ensure fresh data
 * @param {string} prefix - URL prefix to match (e.g., '/api/v1/patients')
 */
export const invalidateCache = (prefix) => {
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) {
      apiCache.delete(key);
    }
  }
};

/**
 * Clear entire cache (useful on logout)
 */
export const clearCache = () => {
  apiCache.clear();
};

const attemptTokenRefresh = async () => {
  const refreshToken = localStorage.getItem('diana_refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    // Refresh failed - clear tokens
    localStorage.removeItem('diana_token');
    localStorage.removeItem('diana_refresh_token');
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();
  localStorage.setItem('diana_token', data.access_token);
  return data.access_token;
};

const apiFetch = async (path, options = {}, isRetry = false) => {
  const res = await fetch(`${API_BASE}${path}`, options);

  // Handle 401 - try to refresh token (but not for auth endpoints or retries)
  if (res.status === 401 && !isRetry && !path.includes('/auth/')) {
    // If already refreshing, wait for that to complete
    if (isRefreshing) {
      try {
        await refreshPromise;
        // Retry with new token
        const newToken = localStorage.getItem('diana_token');
        if (newToken && options.headers?.Authorization) {
          options.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiFetch(path, options, true);
      } catch {
        throw new Error('Session expired. Please log in again.');
      }
    }

    // Start refresh
    isRefreshing = true;
    refreshPromise = attemptTokenRefresh();

    try {
      const newToken = await refreshPromise;
      isRefreshing = false;

      // Retry original request with new token
      if (options.headers?.Authorization) {
        options.headers.Authorization = `Bearer ${newToken}`;
      }
      return apiFetch(path, options, true);
    } catch (err) {
      isRefreshing = false;
      throw err;
    }
  }

  if (!res.ok) {
    let msg = `Request failed ${res.status}`;
    try {
      const text = await res.text();
      if (text && text.trim().toLowerCase().startsWith('<html')) {
        msg = 'Backend responded with HTML. Verify API is running and VITE_API_BASE is set.';
      } else if (text) {
        msg = text;
      }
    } catch (_) {
      /* ignore */
    }
    throw new Error(msg);
  }
  // Handle 204 No Content (DELETE responses) - no body to parse
  if (res.status === 204) {
    return null;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return res.text();
};

export const loginApi = (email, password) =>
  apiFetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

export const fetchPatientsApi = async (token) => {
  const cacheKey = '/api/v1/patients';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch('/api/v1/patients', {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data);
  return data;
};

export const fetchAssessmentsApi = async (token, patientId) => {
  const cacheKey = `/api/v1/patients/${patientId}/assessments`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data);
  return data;
};

export const fetchClusterDistributionApi = async (token) => {
  const cacheKey = '/api/v1/analytics/cluster-distribution';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000); // 1 minute TTL for analytics
  return data;
};

export const fetchTrendAnalyticsApi = async (token) => {
  const cacheKey = '/api/v1/analytics/biomarker-trends';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000); // 1 minute TTL for analytics
  return data;
};

export const createPatientApi = async (token, payload) => {
  const result = await apiFetch('/api/v1/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  invalidateCache('/api/v1/patients');
  invalidateCache('/api/v1/analytics');
  return result;
};

export const createAssessmentApi = async (token, patientId, payload) => {
  const result = await apiFetch(`/api/v1/patients/${patientId}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  invalidateCache(`/api/v1/patients/${patientId}`);
  invalidateCache('/api/v1/analytics');
  return result;
};

// Patient individual operations
export const getPatientApi = (token, patientId) =>
  apiFetch(`/api/v1/patients/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updatePatientApi = (token, patientId, payload) =>
  apiFetch(`/api/v1/patients/${patientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

export const deletePatientApi = (token, patientId) =>
  apiFetch(`/api/v1/patients/${patientId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

// Assessment individual operations
export const getAssessmentApi = (token, patientId, assessmentId) =>
  apiFetch(`/api/v1/patients/${patientId}/assessments/${assessmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateAssessmentApi = (token, patientId, assessmentId, payload) =>
  apiFetch(`/api/v1/patients/${patientId}/assessments/${assessmentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

export const deleteAssessmentApi = (token, patientId, assessmentId) =>
  apiFetch(`/api/v1/patients/${patientId}/assessments/${assessmentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

// Auth operations
export const refreshTokenApi = (refreshToken) =>
  apiFetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

export const logoutApi = (refreshToken) =>
  apiFetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

// ============================================================
// ML Server API (default port 5001, configurable via VITE_ML_BASE or VITE_ML_PORT)
// ============================================================
const ML_BASE = import.meta.env.VITE_ML_BASE || `http://localhost:${import.meta.env.VITE_ML_PORT || '5001'}`;

const mlFetch = async (path) => {
  const res = await fetch(`${ML_BASE}${path}`);
  if (!res.ok) throw new Error(`ML API error: ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return res.blob();
};

export const fetchMLHealthApi = () => mlFetch('/health');

export const fetchMLMetricsApi = () => mlFetch('/analytics/metrics');

export const fetchMLInformationGainApi = () => mlFetch('/analytics/information-gain');

export const fetchMLClustersApi = () => mlFetch('/analytics/clusters');

export const getMLVisualizationUrl = (name) => `${ML_BASE}/analytics/visualizations/${name}`;

// ============================================================
// Cohort Analysis API
// ============================================================
export const fetchCohortAnalysisApi = async (token, groupBy = 'cluster') => {
  const cacheKey = `/api/v1/analytics/cohort?groupBy=${groupBy}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000);
  return data;
};

// ============================================================
// Clinic Dashboard API
// ============================================================
export const fetchUserClinicsApi = async (token) => {
  const cacheKey = '/api/v1/clinics';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000);
  return data;
};

export const fetchClinicDashboardApi = async (token, clinicId) => {
  const cacheKey = `/api/v1/clinics/${clinicId}/dashboard`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000);
  return data;
};

// ============================================================
// Admin Dashboard API
// ============================================================
export const fetchAdminDashboardApi = async (token) => {
  const cacheKey = '/api/v1/admin/dashboard';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000);
  return data;
};

export const fetchAdminClinicsApi = async (token) => {
  const cacheKey = '/api/v1/admin/clinics';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000);
  return data;
};

export const fetchClinicComparisonApi = async (token) => {
  const cacheKey = '/api/v1/admin/clinic-comparison';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(cacheKey, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCache(cacheKey, data, 60000);
  return data;
};

// ============================================================
// Admin User Management API
// ============================================================
export const fetchAdminUsersApi = async (token, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const path = `/api/v1/admin/users${query ? `?${query}` : ''}`;
  return apiFetch(path, { headers: { Authorization: `Bearer ${token}` } });
};

export const createAdminUserApi = async (token, userData) => {
  const result = await apiFetch('/api/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(userData),
  });
  invalidateCache('/api/v1/admin/users');
  invalidateCache('/api/v1/admin/dashboard');
  return result;
};

export const updateAdminUserApi = async (token, userId, userData) => {
  const result = await apiFetch(`/api/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(userData),
  });
  invalidateCache('/api/v1/admin/users');
  return result;
};

export const deactivateAdminUserApi = async (token, userId) => {
  const result = await apiFetch(`/api/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  invalidateCache('/api/v1/admin/users');
  invalidateCache('/api/v1/admin/dashboard');
  return result;
};

export const activateAdminUserApi = async (token, userId) => {
  const result = await apiFetch(`/api/v1/admin/users/${userId}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  invalidateCache('/api/v1/admin/users');
  return result;
};

// ============================================================
// Admin Audit Logs API
// ============================================================
export const fetchAuditLogsApi = async (token, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/api/v1/admin/audit?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ============================================================
// Admin Model Runs API
// ============================================================
export const fetchModelRunsApi = async (token, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/api/v1/admin/models?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const fetchActiveModelApi = async (token) => {
  return apiFetch('/api/v1/admin/models/active', {
    headers: { Authorization: `Bearer ${token}` },
  });
};

