import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAssessmentApi } from './api';

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
      }),
    );

    const result = await createAssessmentApi({ age: 55, bmi: 28, triglycerides: 180, ldl: 120, hdl: 48 });
    expect(result).toEqual(assessment);
  });

  it('normalizes legacy array response to first assessment object', async () => {
    const legacyResponse = [{ id: '1', risk_score: 78, risk_level: 'high' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(legacyResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await createAssessmentApi({ age: 55, bmi: 28, triglycerides: 180, ldl: 120, hdl: 48 });
    expect(result).toEqual(legacyResponse[0]);
  });

  it('throws when legacy array response is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      createAssessmentApi({ age: 55, bmi: 28, triglycerides: 180, ldl: 120, hdl: 48 }),
    ).rejects.toThrow('Invalid assessment response: empty array');
  });
});
