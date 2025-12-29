export const API_BASE = import.meta.env.VITE_API_BASE || '';

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise = null;

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

export const fetchPatientsApi = (token) =>
  apiFetch('/api/v1/patients', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchAssessmentsApi = (token, patientId) =>
  apiFetch(`/api/v1/patients/${patientId}/assessments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchClusterDistributionApi = (token) =>
  apiFetch('/api/v1/analytics/cluster-distribution', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const fetchTrendAnalyticsApi = (token) =>
  apiFetch('/api/v1/analytics/biomarker-trends', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createPatientApi = (token, payload) =>
  apiFetch('/api/v1/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

export const createAssessmentApi = (token, patientId, payload) =>
  apiFetch(`/api/v1/patients/${patientId}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

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
// ML Server API (runs on port 5000)
// ============================================================
const ML_BASE = import.meta.env.VITE_ML_BASE || 'http://localhost:5000';

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

