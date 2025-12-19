export const API_BASE = import.meta.env.VITE_API_BASE || '';

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, options);
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

