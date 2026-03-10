import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SHAPExplanation from './SHAPExplanation';

vi.mock('../../api', () => ({
  mlFetchJson: vi.fn(),
}));

import { mlFetchJson } from '../../api';

const basePatientData = {
  age: 56,
  bmi: 29,
  triglycerides: 160,
  ldl: 130,
  hdl: 45,
  smoking: 'Unknown',
  activity: 'Moderate',
  alcohol: 'None',
};

describe('SHAPExplanation graceful fallback', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders clinician-friendly fallback when backend marks explanation unavailable', async () => {
    mlFetchJson.mockResolvedValueOnce({
      risk_score: 72,
      at_risk_probability: 0.72,
      explanation: {
        available: false,
        reason: 'explainer_setup_unavailable',
        summary: 'Detailed SHAP explainability is currently unavailable.',
        limitations: [
          'Detailed SHAP feature attributions are unavailable for this assessment.',
          'No feature-level SHAP values are shown in fallback mode.',
        ],
      },
      shap_metadata: {
        explanation_available: false,
        fallback_reason: 'explainer_setup_unavailable',
      },
    });

    render(<SHAPExplanation patientData={basePatientData} modelType="binary_v2_no_bp" />);

    await waitFor(() => {
      expect(screen.getByText('Explainability Limited')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Detailed SHAP explainability is currently unavailable.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('No feature-level SHAP values are shown in fallback mode.')
    ).toBeInTheDocument();
  });

  it('falls back instead of hard error for SHAP-specific fetch failures', async () => {
    mlFetchJson.mockRejectedValueOnce(new Error('SHAP explainer unavailable'));

    render(<SHAPExplanation patientData={basePatientData} modelType="binary_v2_no_bp" />);

    await waitFor(() => {
      expect(screen.getByText('Explainability Limited')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Detailed SHAP explainability is currently unavailable/i)
    ).toBeInTheDocument();
  });

  it('keeps hard failure UI for non-explainability errors', async () => {
    mlFetchJson.mockRejectedValueOnce(new Error('Network timeout'));

    render(<SHAPExplanation patientData={basePatientData} modelType="binary_v2_no_bp" />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to generate explanation: Network timeout/i)).toBeInTheDocument();
    });
  });
});
