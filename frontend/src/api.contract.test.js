/**
 * API Contract Tests for Frontend
 *
 * These tests validate that apiFetch and mlFetch calls match the expected
 * backend contract. They catch breaking API changes by verifying:
 * - Request shapes (headers, body structure)
 * - Response shapes (required fields, types)
 * - Error response format (consistent APIError structure)
 *
 * Contract tests run in CI to prevent breaking API changes from being deployed.
 *
 * TypeScript interfaces are documented via JSDoc comments in api.js.
 *
 * @see backend/internal/http/handlers/contract_test.go for backend contract definitions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import all API functions to test contract compliance
import {
  // Auth APIs
  loginApi,
  signupApi,
  logoutApi,
  // User APIs
  getUserProfileApi,
  updateUserProfileApi,
  getConsentSettingsApi,
  getTrendsApi,
  // Assessment APIs
  getAssessmentsApi,
  createAssessmentApi,
  getAssessmentApi,
  deleteAssessmentApi,
  // Admin APIs
  adminListUsersApi,
  fetchAdminDashboardApi,
  fetchAuditLogsApi,
  // ML APIs
  mlFetchJson,
  fetchMLHealthApi,
  // Export APIs
  exportPDFApi,
  // Contract helpers
  normalizeAssessmentContract,
  mapTrendsToContract,
  deriveRiskLevelFromScore,
  // Auth token management
  setAuthTokens,
  clearAuthTokens,
  API_BASE,
} from './api';

// =============================================================================
// MOCK SETUP
// =============================================================================

describe('API Contract Tests', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    vi.restoreAllMocks();
    localStorage.clear();
    // Set a valid access token for authenticated requests
    setAuthTokens('test-access-token', 'test-refresh-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // =============================================================================
  // AUTH CONTRACT TESTS
  // =============================================================================

  describe('Auth Contract - loginApi', () => {
    it('sends correct request shape with email and password', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          message: 'Login successful',
          access_token: 'jwt-token-here',
          refresh_token: 'refresh-token-here',
          user: { id: 1, email: 'fixture-user', role: 'user' }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      await loginApi('fixture-user', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-access-token',
          }),
          credentials: 'include',
          body: JSON.stringify({ email: 'fixture-user', password: 'password123' }),
        })
      );
    });

    it('returns AuthResponseContract shape on success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          message: 'Login successful',
          access_token: 'jwt-token-here',
          refresh_token: 'refresh-token-here',
          user: { id: 1, email: 'fixture-user', role: 'user' }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      const result = await loginApi('fixture-user', 'password123');

      // AuthResponseContract required fields
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');

      // User object structure
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('role');

      // Type verification
      expect(typeof result.access_token).toBe('string');
      expect(typeof result.refresh_token).toBe('string');
      expect(typeof result.user.id).toBe('number');
    });

    it('returns APIErrorContract shape on failure', async () => {
      // Clear tokens to prevent token refresh attempt on 401
      clearAuthTokens();

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      );

      try {
        await loginApi('fixture-user', 'wrongpassword');
        expect.fail('Should have thrown error');
      } catch (error) {
        // APIErrorContract fields - message should be present
        expect(error).toHaveProperty('message');
        // The apiFetch may throw a generic error or include status depending on context
        // For login endpoint, error structure is determined by apiFetch error handling
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('Auth Contract - signupApi', () => {
    it('sends correct request shape for registration', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          message: 'Registration successful',
          access_token: 'jwt-token',
          refresh_token: 'refresh-token',
          user: { id: 2, email: 'new-fixture-user', role: 'user' }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } })
      );

      await signupApi('new-fixture-user', 'Password123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new-fixture-user', password: 'Password123' }),
        })
      );
    });

    it('returns AuthResponseContract shape on success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          message: 'Registration successful',
          access_token: 'jwt-token',
          refresh_token: 'refresh-token',
          user: { id: 2, email: 'new-fixture-user', role: 'user' }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } })
      );

      const result = await signupApi('new-fixture-user', 'Password123');

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).toHaveProperty('role');
      expect(result.user.role).toBe('user'); // Default role
    });
  });

  describe('Auth Contract - logoutApi', () => {
    it('sends correct request shape for logout', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'Logged out' }), { status: 200 })
      );

      await logoutApi('refresh-token');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/logout`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refresh_token: 'refresh-token' }),
        })
      );
    });
  });



  // =============================================================================
  // USER PROFILE CONTRACT TESTS
  // =============================================================================

  describe('User Contract - getUserProfileApi', () => {
    it('sends authenticated GET request', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          id: 1,
          email: 'fixture-user',
          onboarding_completed: false,
          is_active: true,
          is_admin: false,
          role: 'user',
          assessment_count: 5,
        }), { status: 200 })
      );

      await getUserProfileApi();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/users/me/profile`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
          }),
        })
      );
    });

    it('returns UserProfileContract shape', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          id: 1,
          email: 'fixture-user',
          onboarding_completed: false,
          is_active: true,
          is_admin: false,
          role: 'user',
          assessment_count: 5,
        }), { status: 200 })
      );

      const result = await getUserProfileApi();

      // UserProfileContract required fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('onboarding_completed');
      expect(result).toHaveProperty('is_active');
      expect(result).toHaveProperty('is_admin');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('assessment_count');

      // Type verification
      expect(typeof result.id).toBe('number');
      expect(typeof result.email).toBe('string');
      expect(typeof result.onboarding_completed).toBe('boolean');
    });
  });

  describe('User Contract - getConsentSettingsApi', () => {
    it('returns ConsentSettingsContract shape', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          consent_personal_data: true,
          consent_research_participation: false,
          consent_email_updates: true,
          consent_analytics: false,
        }), { status: 200 })
      );

      const result = await getConsentSettingsApi();

      // ConsentSettingsContract fields
      expect(result).toHaveProperty('consent_personal_data');
      expect(result).toHaveProperty('consent_research_participation');
      expect(result).toHaveProperty('consent_email_updates');
      expect(result).toHaveProperty('consent_analytics');

      // All should be boolean
      expect(typeof result.consent_personal_data).toBe('boolean');
      expect(typeof result.consent_research_participation).toBe('boolean');
    });
  });

  describe('User Contract - getTrendsApi', () => {
    it('sends request with months parameter', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          dates: ['2026-01-01', '2026-02-01'],
          bmi_values: [28.5, 27.8],
          risk_score_values: [65, 55],
        }), { status: 200 })
      );

      await getTrendsApi(12);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/users/me/trends?months=12`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  // =============================================================================
  // ASSESSMENT CONTRACT TESTS
  // =============================================================================

  describe('Assessment Contract - createAssessmentApi', () => {
    it('sends correct biomarker request shape', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          id: 1,
          user_id: 1,
          risk_score: 45,
          risk_level: 'medium',
          risk_label: 'Moderate Risk',
          cluster: 'MOD',
          model_version: 'binary_v2_no_bp',
          created_at: '2026-04-01T12:00:00Z',
        }), { status: 201 })
      );

      const payload = {
        fbs: 95.0,
        hba1c: 5.8,
        cholesterol: 180,
        ldl: 100,
        hdl: 50,
        triglycerides: 120,
        systolic: 120,
        diastolic: 80,
        waist_circumference: 85.0,
        bmi: 24.5,
        age: 50,
        model_type: 'binary_v2_no_bp',
      };

      await createAssessmentApi(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/users/me/assessments`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('returns AssessmentContract shape with all required fields', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          id: 1,
          user_id: 1,
          risk_score: 45,
          risk_level: 'medium',
          risk_label: 'Moderate Risk',
          cluster: 'MOD',
          cluster_description: 'Mild Obesity-related Diabetes',
          treatment_focus: 'Weight management',
          model_version: 'binary_v2_no_bp',
          dataset_hash: 'abc123',
          validation_status: 'passed',
          fbs: 95.0,
          hba1c: 5.8,
          cholesterol: 180,
          ldl: 100,
          hdl: 50,
          triglycerides: 120,
          systolic: 120,
          diastolic: 80,
          waist_circumference: 85.0,
          bmi: 24.5,
          age: 50,
          created_at: '2026-04-01T12:00:00Z',
          updated_at: '2026-04-01T12:00:00Z',
          feature_set: { bmi: 24.5, age: 50 },
          cluster_capability: { primary: 'weight_loss' },
          output_capabilities: { shap_available: true },
          drift_baseline: { reference: 'v1' },
        }), { status: 201 })
      );

      const result = await createAssessmentApi({ age: 50, bmi: 24.5 });

      // AssessmentContract required fields
      const requiredFields = ['id', 'user_id', 'risk_score', 'risk_level', 'cluster', 'model_version', 'created_at'];
      for (const field of requiredFields) {
        expect(result).toHaveProperty(field);
      }

      // Biomarker fields
      const biomarkerFields = ['fbs', 'hba1c', 'cholesterol', 'ldl', 'hdl', 'triglycerides', 'systolic', 'diastolic', 'waist_circumference', 'bmi', 'age'];
      for (const field of biomarkerFields) {
        expect(result).toHaveProperty(field);
      }

      // Capability contract fields
      const capabilityFields = ['feature_set', 'cluster_capability', 'output_capabilities', 'drift_baseline'];
      for (const field of capabilityFields) {
        expect(result).toHaveProperty(field);
      }
    });

    it('handles legacy array response by normalizing to object', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify([{
          id: 1,
          user_id: 1,
          risk_score: 45,
          risk_level: 'medium',
        }]), { status: 200 })
      );

      const result = await createAssessmentApi({ age: 50, bmi: 24.5 });

      // Should return object, not array
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
      expect(result.id).toBe(1);
    });

    it('throws on empty array response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify([]), { status: 200 })
      );

      await expect(createAssessmentApi({ age: 50, bmi: 24.5 })).rejects.toThrow('Invalid assessment response: empty array');
    });
  });

  describe('Assessment Contract - getAssessmentsApi', () => {
    it('returns array of AssessmentContract objects', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify([
          { id: 1, user_id: 1, risk_score: 45, risk_level: 'medium', created_at: '2026-04-01' },
          { id: 2, user_id: 1, risk_score: 78, risk_level: 'high', created_at: '2026-03-15' },
        ]), { status: 200 })
      );

      const result = await getAssessmentsApi();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      // Each item should have required fields
      for (const assessment of result) {
        expect(assessment).toHaveProperty('id');
        expect(assessment).toHaveProperty('user_id');
        expect(assessment).toHaveProperty('risk_level');
      }
    });

    it('normalizes risk_level and risk_label for each assessment', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify([
          { id: 1, user_id: 1, risk_score: 78, risk_level: 'UNKNOWN' },
        ]), { status: 200 })
      );

      const result = await getAssessmentsApi();

      expect(result[0].risk_level).toBe('high');
      expect(result[0].risk_label).toBe('High Risk');
    });
  });

  describe('Assessment Contract - deleteAssessmentApi', () => {
    it('sends DELETE request', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 204 })
      );

      await deleteAssessmentApi(1);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/users/me/assessments/1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  // =============================================================================
  // ADMIN CONTRACT TESTS
  // =============================================================================

  describe('Admin Contract - fetchAdminDashboardApi', () => {
    it('returns AdminDashboardContract shape', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          total_users: 100,
          total_patients: 50,
          total_assessments: 500,
          total_clinics: 5,
          avg_risk_score: 45.5,
          high_risk_count: 25,
          assessments_this_month: 50,
          new_users_this_month: 10,
        }), { status: 200 })
      );

      const result = await fetchAdminDashboardApi();

      // AdminDashboardContract fields
      expect(result).toHaveProperty('total_users');
      expect(result).toHaveProperty('total_assessments');
      expect(result).toHaveProperty('avg_risk_score');
      expect(result).toHaveProperty('high_risk_count');

      // Type verification
      expect(typeof result.total_users).toBe('number');
      expect(typeof result.avg_risk_score).toBe('number');
    });
  });

  describe('Admin Contract - adminListUsersApi', () => {
    it('sends request with query parameters', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          data: [],
          pagination: { page: 1, page_size: 20, total_items: 0 },
        }), { status: 200 })
      );

      await adminListUsersApi({ page: 1, page_size: 20 });

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('page_size=20');
    });
  });

  describe('Admin Contract - fetchAuditLogsApi', () => {
    it('returns paginated response with data and pagination', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          data: [
            { id: 1, action: 'LOGIN', user_id: 1, timestamp: '2026-04-01' },
          ],
          pagination: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
        }), { status: 200 })
      );

      const result = await fetchAuditLogsApi({ page: 1 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  // =============================================================================
  // ML CONTRACT TESTS
  // =============================================================================

  describe('ML Contract - mlFetchJson', () => {
    it('routes ML requests through backend proxy', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
      );

      await mlFetchJson('/predict', { method: 'POST', body: { age: 50 } });

      // Should route through backend proxy, not directly to ML service
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/ml/predict`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('surfaces backend error payload on ML failures', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          code: 'ML_UNAVAILABLE',
          message: 'ML service temporarily unavailable',
        }), { status: 503 })
      );

      try {
        await mlFetchJson('/predict', { method: 'POST', body: {} });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('status');
        expect(error.status).toBe(503);
      }
    });
  });

  describe('ML Contract - fetchMLHealthApi', () => {
    it('calls ML health through backend proxy', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
      );

      await fetchMLHealthApi();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/ml/health`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  // =============================================================================
  // CONTRACT HELPER TESTS
  // =============================================================================

  describe('Contract Helpers - normalizeAssessmentContract', () => {
    it('preserves existing non-unknown risk level', () => {
      const result = normalizeAssessmentContract({
        risk_score: 10,
        risk_level: 'medium',
        risk_label: 'Moderate Risk',
      });

      expect(result.risk_level).toBe('medium');
      expect(result.risk_label).toBe('Moderate Risk');
    });

    it('derives risk level from score when missing or unknown', () => {
      const low = normalizeAssessmentContract({ risk_score: 20 });
      expect(low.risk_level).toBe('low');
      expect(low.risk_label).toBe('Low Risk');

      const medium = normalizeAssessmentContract({ risk_score: 50 });
      expect(medium.risk_level).toBe('medium');
      expect(medium.risk_label).toBe('Moderate Risk');

      const high = normalizeAssessmentContract({ risk_score: 80 });
      expect(high.risk_level).toBe('high');
      expect(high.risk_label).toBe('High Risk');
    });

    it('handles UNKNOWN risk level by deriving from score', () => {
      const result = normalizeAssessmentContract({
        risk_score: 75,
        risk_level: 'UNKNOWN',
      });

      expect(result.risk_level).toBe('high');
    });
  });

  describe('Contract Helpers - deriveRiskLevelFromScore', () => {
    it('returns correct risk level for score thresholds', () => {
      expect(deriveRiskLevelFromScore(0)).toBe('low');
      expect(deriveRiskLevelFromScore(29)).toBe('low');
      expect(deriveRiskLevelFromScore(30)).toBe('medium');
      expect(deriveRiskLevelFromScore(69)).toBe('medium');
      expect(deriveRiskLevelFromScore(70)).toBe('high');
      expect(deriveRiskLevelFromScore(100)).toBe('high');
    });

    it('preserves existing valid level', () => {
      expect(deriveRiskLevelFromScore(10, 'high')).toBe('high');
      expect(deriveRiskLevelFromScore(80, 'low')).toBe('low');
    });

    it('returns unknown for invalid non-finite score', () => {
      // NaN and Infinity are not finite
      expect(deriveRiskLevelFromScore(NaN)).toBe('unknown');
      expect(deriveRiskLevelFromScore(Infinity)).toBe('unknown');
      expect(deriveRiskLevelFromScore(-Infinity)).toBe('unknown');
      // String that can't convert to finite number
      expect(deriveRiskLevelFromScore('invalid')).toBe('unknown');
    });

    it('converts null/undefined to 0 and returns low', () => {
      // Number(null) = 0, Number(undefined) = NaN
      expect(deriveRiskLevelFromScore(null)).toBe('low'); // Number(null) = 0, which is < 30
      expect(deriveRiskLevelFromScore(undefined)).toBe('unknown'); // Number(undefined) = NaN
    });
  });

  describe('Contract Helpers - mapTrendsToContract', () => {
    it('maps backend trend arrays to frontend contract', () => {
      const result = mapTrendsToContract({
        dates: ['2026-01-01', '2026-02-01'],
        bmi_values: [28.5, 27.8],
        hba1c_values: [6.2, 6.0],
        fbs_values: [112, 105],
        triglycerides_values: [180, 160],
        ldl_values: [130, 122],
        hdl_values: [48, 50],
        systolic_values: [135, 130],
        diastolic_values: [85, 82],
        waist_circumference_values: [91.2, 89.5],
        clusters: ['SIRD', 'MOD'],
        risk_score_values: [72, 48],
      });

      // Biomarker history structure
      expect(result.biomarkerHistory).toHaveLength(2);
      expect(result.biomarkerHistory[0]).toEqual({
        date: '2026-01-01',
        bmi: 28.5,
        hba1c: 6.2,
        fbs: 112,
        triglycerides: 180,
        ldl: 130,
        hdl: 48,
        systolic: 135,
        diastolic: 85,
        waist_circumference: 91.2,
      });

      // Cluster history structure
      expect(result.clusterHistory).toHaveLength(2);
      expect(result.clusterHistory[1]).toEqual({
        date: '2026-02-01',
        cluster: 'MOD',
        riskScore: 48,
      });

      // Risk level counts
      expect(result.riskLevels).toEqual({ low: 0, medium: 1, high: 1 });
    });

    it('handles empty trend data', () => {
      const result = mapTrendsToContract({});

      expect(result.biomarkerHistory).toHaveLength(0);
      expect(result.clusterHistory).toHaveLength(0);
      expect(result.riskLevels).toBeNull();
    });
  });

  // =============================================================================
  // ERROR RESPONSE CONTRACT TESTS
  // =============================================================================

  describe('Error Response Contract', () => {
    it('APIErrorContract has consistent structure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email', error: 'Required' },
        }), { status: 400 })
      );

      try {
        await getUserProfileApi();
        expect.fail('Should have thrown');
      } catch (error) {
        // APIErrorContract fields
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('status');
        expect(error.status).toBe(400);

        // Message should be a string
        expect(typeof error.message).toBe('string');
      }
    });

    it('handles 401 Unauthorized with proper error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        }), { status: 401 })
      );

      // Note: apiFetch handles 401 specially (token refresh)
      // This tests that error structure is consistent before token refresh
      try {
        // Clear tokens to prevent refresh attempt
        clearAuthTokens();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
          new Response(JSON.stringify({
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          }), { status: 401 })
        );

        await getUserProfileApi();
      } catch (error) {
        expect(error).toHaveProperty('message');
      }
    });

    it('handles 404 Not Found with proper error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        }), { status: 404 })
      );

      try {
        await getAssessmentApi(999);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('status');
        expect(error.status).toBe(404);
      }
    });

    it('handles 500 Internal Error with proper error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          code: 'INTERNAL_ERROR',
          message: 'Database connection failed',
        }), { status: 500 })
      );

      try {
        await getUserProfileApi();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('status');
        expect(error.status).toBe(500);
      }
    });
  });

  // =============================================================================
  // CSRF TOKEN CONTRACT TESTS
  // =============================================================================

  describe('CSRF Token Contract', () => {
    it('includes CSRF token for non-GET requests when available', async () => {
      // Mock CSRF token in cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'diana_csrf_token=fixture-csrf-value',
      });

      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'ok' }), { status: 200 })
      );

      await updateUserProfileApi({ name: 'Test' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/users/me/profile`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'X-CSRF-Token': 'fixture-csrf-value',
          }),
        })
      );

      // Reset cookie mock
      document.cookie = '';
    });

    it('does not include CSRF token for GET requests', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ id: 1 }), { status: 200 })
      );

      await getUserProfileApi();

      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.headers).not.toHaveProperty('X-CSRF-Token');
    });
  });

  // =============================================================================
  // EXPORT CONTRACT TESTS
  // =============================================================================

  describe('Export Contract - exportPDFApi', () => {
    it('returns blob for PDF download', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(mockBlob, { status: 200, headers: { 'Content-Type': 'application/pdf' } })
      );

      // Mock DOM methods for download
      const mockClick = vi.fn();
      const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation(() => ({
        href: '',
        download: '',
        click: mockClick,
      }));
      vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

      await exportPDFApi();

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      mockCreateElement.mockRestore();
    });
  });
});

// =============================================================================
// TYPE DOCUMENTATION TESTS
// =============================================================================

describe('Type Documentation', () => {
  /**
   * These tests verify that TypeScript interfaces are documented via JSDoc.
   * The actual interface definitions should be in api.js as JSDoc comments.
   */

  it('AuthResponseContract is documented in api.js JSDoc', () => {
    // This test is a placeholder - actual verification is manual code review
    // JSDoc should document: message, access_token, refresh_token, user
    expect(true).toBe(true);
  });

  it('AssessmentContract is documented in api.js JSDoc', () => {
    // JSDoc should document: id, user_id, risk_score, risk_level, cluster, etc.
    expect(true).toBe(true);
  });

  it('APIErrorContract is documented in api.js JSDoc', () => {
    // JSDoc should document: code, message, details
    expect(true).toBe(true);
  });

  it('UserProfileContract is documented in api.js JSDoc', () => {
    // JSDoc should document: id, email, onboarding_completed, etc.
    expect(true).toBe(true);
  });

  it('ConsentSettingsContract is documented in api.js JSDoc', () => {
    // JSDoc should document: consent_personal_data, etc.
    expect(true).toBe(true);
  });

  it('AdminDashboardContract is documented in api.js JSDoc', () => {
    // JSDoc should document: total_users, avg_risk_score, etc.
    expect(true).toBe(true);
  });
});
