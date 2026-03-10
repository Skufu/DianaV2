import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAssessmentApi,
  mapTrendsToContract,
  mlFetchJson,
  normalizeAssessmentContract,
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

    await expect(mlFetchJson('/predict/explain', { method: 'POST', body: {} })).rejects.toMatchObject(
      {
        message: 'SHAP explainer unavailable',
        status: 503,
      }
    );
  });
});
