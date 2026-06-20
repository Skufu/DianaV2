import { describe, expect, it } from 'vitest';
import { buildProfileUpdatePayload, toProfileFormData } from './UserProfile';

describe('UserProfile payload helpers', () => {
  it('builds a clean update payload with an RFC3339 date of birth', () => {
    const payload = buildProfileUpdatePayload(
      {
        id: 48,
        email: 'codex-profile-fix@example.com',
        first_name: 'Codex',
        last_name: 'Tester',
        age: 52,
        date_of_birth: '1974-06-15',
        menopause_status: 'post',
        menopause_type: 'natural',
        years_menopause: '2',
        hypertension: 'no',
        heart_disease: 'no',
        smoking_status: 'never',
        physical_activity: 'moderate',
        alcohol: 'never',
        assessment_frequency_months: 3,
        reminder_email: false,
        latest_assessment: { id: 63 },
        assessment_count: 1,
        role: 'user',
        is_active: true,
      },
      new Date('2026-06-20T00:00:00Z')
    );

    expect(payload).toEqual({
      first_name: 'Codex',
      last_name: 'Tester',
      phone: '',
      address: '',
      date_of_birth: '1974-06-15T00:00:00Z',
      menopause_status: 'post',
      menopause_type: 'natural',
      years_menopause: 2,
      hypertension: 'no',
      heart_disease: 'no',
      smoking_status: 'never',
      physical_activity: 'moderate',
      alcohol: 'never',
      assessment_frequency_months: 3,
      reminder_email: false,
    });
    expect(payload).not.toHaveProperty('latest_assessment');
    expect(payload).not.toHaveProperty('assessment_count');
    expect(payload).not.toHaveProperty('role');
  });

  it('normalizes onboarding lifestyle values for profile selects', () => {
    expect(
      toProfileFormData(
        {
          date_of_birth: '1974-06-15T00:00:00Z',
          physical_activity: 'Moderate',
          alcohol: 'None',
        },
        new Date('2026-06-20T00:00:00Z')
      )
    ).toEqual(
      expect.objectContaining({
        age: 52,
        physical_activity: 'moderate',
        alcohol: 'never',
      })
    );
  });
});
