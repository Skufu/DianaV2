import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthTokens,
  createAssessmentApi,
  exportPDFApi,
  fetchMLVisualizationApi,
  getErrorMessage,
  getFieldErrors,
  invalidateAssessmentDependentQueries,
  loginApi,
  mapTrendsToContract,
  mlFetchJson,
  normalizeAssessmentContract,
  setAuthTokens,
  signupApi,
} from './api';

describe('createAssessmentApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns canonical object response as-is', async () => {
    const assessment = { id: '1', risk_score: 78, risk_level: 'high' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(assessment), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await createAssessmentApi({
      age: 55,
      bmi: 28,
      triglycerides: 180,
      ldl: 120,
      hdl: 48,
    });
    expect(result).toMatchObject({ ...assessment, risk_label: 'High Risk' });
  });

  it('normalizes legacy array response to first assessment object', async () => {
    const legacyResponse = [{ id: '1', risk_score: 78, risk_level: 'high' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(legacyResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await createAssessmentApi({
      age: 55,
      bmi: 28,
      triglycerides: 180,
      ldl: 120,
      hdl: 48,
    });
    expect(result).toMatchObject({ ...legacyResponse[0], risk_label: 'High Risk' });
  });

  it('throws when legacy array response is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(
      createAssessmentApi({ age: 55, bmi: 28, triglycerides: 180, ldl: 120, hdl: 48 })
    ).rejects.toThrow('Invalid assessment response: empty array');
  });

  it('derives missing risk level from risk score in response', async () => {
    const assessment = { id: '1', risk_score: 78, risk_level: 'UNKNOWN' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(assessment), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await createAssessmentApi({
      age: 55,
      bmi: 28,
      triglycerides: 180,
      ldl: 120,
      hdl: 48,
    });
    expect(result.risk_level).toBe('high');
    expect(result.risk_label).toBe('High Risk');
  });
});

describe('normalizeAssessmentContract', () => {
  it('preserves explicit non-unknown risk level and does not override', () => {
    const normalized = normalizeAssessmentContract({
      risk_score: 10,
      risk_level: 'medium',
      risk_label: 'Moderate Risk',
    });
    expect(normalized.risk_level).toBe('medium');
    expect(normalized.risk_label).toBe('Moderate Risk');
  });

  it('fills risk level and risk label when missing', () => {
    const normalized = normalizeAssessmentContract({ risk_score: 20 });
    expect(normalized.risk_level).toBe('low');
    expect(normalized.risk_label).toBe('Low Risk');
  });
});

describe('invalidateAssessmentDependentQueries', () => {
  it('invalidates assessment-derived charts and profile caches', async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidateAssessmentDependentQueries(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['assessments'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['assessment'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['trends'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user', 'profile'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['insights'] });
  });
});

describe('mapTrendsToContract', () => {
  it('maps stored trend arrays into complete biomarker history contract', () => {
    const mapped = mapTrendsToContract({
      dates: ['2026-01-01', '2026-02-01'],
      bmi_values: [29.1, 28.7],
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

    expect(mapped.biomarkerHistory[0]).toEqual({
      date: '2026-01-01',
      bmi: 29.1,
      hba1c: 6.2,
      fbs: 112,
      triglycerides: 180,
      ldl: 130,
      hdl: 48,
      systolic: 135,
      diastolic: 85,
      waist_circumference: 91.2,
    });
    expect(mapped.clusterHistory[1]).toEqual({
      date: '2026-02-01',
      cluster: 'MOD',
      riskScore: 48,
    });
    expect(mapped.riskLevels).toEqual({ low: 0, medium: 1, high: 1 });
  });
});

describe('mlFetchJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces backend error payload message for ML failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'SHAP explainer unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(
      mlFetchJson('/predict/explain', { method: 'POST', body: {} })
    ).rejects.toMatchObject({
      message: 'SHAP explainer unavailable',
      status: 503,
    });
  });
});

describe('API error handling', () => {
  afterEach(() => {
    clearAuthTokens();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('extracts field detail messages and field errors from structured API errors', () => {
    const error = {
      message: 'Invalid request payload',
      details: { email: 'This email is already registered' },
    };

    expect(getErrorMessage(error, 'Fallback message')).toBe('This email is already registered');
    expect(getFieldErrors(error)).toEqual({ email: 'This email is already registered' });
  });

  it('preserves structured validation details for signup field errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: { email: 'This email is already registered' },
        }),
        {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(signupApi('test1@test.com', 'Password123')).rejects.toMatchObject({
      message: 'This email is already registered',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { email: 'This email is already registered' },
    });
  });

  it('does not run token refresh for auth endpoint failures', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }),
        {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(loginApi('test1@test.com', 'wrongpassword')).rejects.toMatchObject({
      message: 'Invalid email or password',
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes network failures into user-facing API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(mlFetchJson('/health')).rejects.toMatchObject({
      message: 'Unable to reach the DIANA server. Please check your connection and try again.',
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('returns null for empty successful JSON responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(mlFetchJson('/health')).resolves.toBeNull();
  });

  it('wraps invalid successful JSON responses in an APIRequestError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(mlFetchJson('/health')).rejects.toMatchObject({
      message: 'Received an invalid response from the DIANA server.',
      status: 200,
      code: 'INVALID_RESPONSE',
    });
  });

  it('sends bearer auth and structured errors through PDF blob downloads', async () => {
    setAuthTokens('access-token', 'refresh-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'EXPORT_UNAVAILABLE',
          message: 'PDF export is unavailable for this account',
        }),
        {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(exportPDFApi()).rejects.toMatchObject({
      message: 'PDF export is unavailable for this account',
      status: 403,
      code: 'EXPORT_UNAVAILABLE',
    });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer access-token');
  });

  it('refreshes expired bearer tokens for PDF blob downloads', async () => {
    setAuthTokens('expired-token', 'refresh-token');
    const mockClick = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(() => ({
      href: '',
      download: '',
      click: mockClick,
    }));
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:pdf');
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    const pdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    let pdfRequestCount = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(url => {
      if (String(url).endsWith('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ access_token: 'fresh-token', refresh_token: 'fresh-refresh' }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (String(url).endsWith('/users/me/export/pdf')) {
        pdfRequestCount += 1;
      }
      if (pdfRequestCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token expired' }), {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      return Promise.resolve(
        new Response(pdfBlob, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        })
      );
    });

    await exportPDFApi();

    const pdfRequests = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/users/me/export/pdf')
    );
    expect(pdfRequests).toHaveLength(2);
    expect(pdfRequests[0][1].headers.Authorization).toBe('Bearer expired-token');
    expect(pdfRequests[1][1].headers.Authorization).toBe('Bearer fresh-token');
    expect(mockClick).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
  });

  it('loads ML visualizations through the API layer with auth and ML API headers', async () => {
    setAuthTokens('access-token', 'refresh-token');
    const imageBlob = new Blob(['image'], { type: 'image/png' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(imageBlob, {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      })
    );

    const result = await fetchMLVisualizationApi('roc_curve');

    expect(result).toBeInstanceOf(Blob);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer access-token');
    expect(fetchMock.mock.calls[0][1].headers['X-API-Key']).toBe(
      import.meta.env.VITE_ML_API_KEY || 'dev-ml-api-key'
    );
  });

  it('refreshes expired bearer tokens for ML visualization blobs', async () => {
    setAuthTokens('expired-token', 'refresh-token');
    const imageBlob = new Blob(['image'], { type: 'image/png' });
    let visualizationRequestCount = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(url => {
      if (String(url).endsWith('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ access_token: 'fresh-token', refresh_token: 'fresh-refresh' }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (String(url).includes('/ml/insights/visualizations/roc_curve')) {
        visualizationRequestCount += 1;
      }
      if (visualizationRequestCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token expired' }), {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      return Promise.resolve(
        new Response(imageBlob, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      );
    });

    const result = await fetchMLVisualizationApi('roc_curve');

    const visualizationRequests = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/ml/insights/visualizations/roc_curve')
    );
    expect(result).toBeInstanceOf(Blob);
    expect(visualizationRequests).toHaveLength(2);
    expect(visualizationRequests[0][1].headers.Authorization).toBe('Bearer expired-token');
    expect(visualizationRequests[1][1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('rejects requests queued behind a failed token refresh', async () => {
    setAuthTokens('expired-token', 'expired-refresh');
    let markRefreshStarted;
    let resolveRefresh;
    const refreshStarted = new Promise(resolve => {
      markRefreshStarted = resolve;
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(url => {
      if (String(url).endsWith('/auth/refresh')) {
        markRefreshStarted();
        return new Promise(resolve => {
          resolveRefresh = resolve;
        });
      }

      return Promise.resolve(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token expired' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const firstRequest = mlFetchJson('/insights/metrics');
    await refreshStarted;
    const secondRequest = mlFetchJson('/insights/clusters');
    await Promise.resolve();

    resolveRefresh(
      new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Refresh token expired' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const results = await Promise.allSettled([firstRequest, secondRequest]);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      status: 'rejected',
      reason: { message: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' },
    });
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: { message: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' },
    });
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))
    ).toHaveLength(1);
  });
});
