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

  it('posts the resolved no-BP model contract to the explain endpoint', async () => {
    mlFetchJson.mockResolvedValueOnce({
      at_risk_probability: 0.64,
      explanation: {
        base_value: 0.2,
        shap_values: [0.1, -0.05],
        feature_values: [29, 160],
        feature_names: ['bmi', 'triglycerides'],
        contributions: [],
      },
      shap_metadata: {
        explanation_available: true,
      },
    });

    render(
      <SHAPExplanation
        patientData={{
          ...basePatientData,
          model_type: 'ada',
          hba1c: 6.2,
          fbs: 110,
          systolic: 130,
          diastolic: 82,
          family_history_diabetes: true,
        }}
        modelType="binary_v2_no_bp"
      />
    );

    await waitFor(() => {
      expect(mlFetchJson).toHaveBeenCalled();
    });

    expect(mlFetchJson).toHaveBeenCalledWith(
      '/predict/explain?model_type=binary_v2_no_bp&format=full&include_plot=waterfall',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          model_type: 'binary_v2_no_bp',
          age: 56,
          bmi: 29,
          triglycerides: 160,
          ldl: 130,
          hdl: 45,
        }),
      })
    );
    const requestBody = mlFetchJson.mock.calls[0][1].body;
    expect(requestBody).not.toHaveProperty('hba1c');
    expect(requestBody).not.toHaveProperty('fbs');
    expect(requestBody).not.toHaveProperty('systolic');
    expect(requestBody).not.toHaveProperty('diastolic');
    expect(requestBody).not.toHaveProperty('family_history_diabetes');
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

describe('SHAPExplanation values and styling', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders base value and final prediction correctly', async () => {
    mlFetchJson.mockResolvedValueOnce({
      prediction: 0.289,
      explanation: {
        base_value: -0.088,
        shap_values: [
          { feature: 'bmi', shap_value: 0.15, feature_value: 29 },
          { feature: 'age', shap_value: -0.05, feature_value: 56 }
        ],
      },
      shap_metadata: {
        explanation_available: true,
      },
    });

    render(<SHAPExplanation patientData={basePatientData} modelType="binary_v2_no_bp" />);

    await waitFor(() => {
      expect(screen.getByText('-0.088')).toBeInTheDocument();
      expect(screen.getByText('28.9%')).toBeInTheDocument();
    });
  });

  it('renders correct descriptive text for SHAP colors', async () => {
    mlFetchJson.mockResolvedValueOnce({
      prediction: 0.289,
      explanation: {
        base_value: -0.088,
        shap_values: [
          { feature: 'bmi', shap_value: 0.15, feature_value: 29 },
        ],
      },
      shap_metadata: {
        explanation_available: true,
      },
    });

    render(<SHAPExplanation patientData={basePatientData} modelType="binary_v2_no_bp" />);

    await waitFor(() => {
      expect(screen.getByText(/Red bars/i)).toBeInTheDocument();
      expect(screen.getByText(/green bars/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/increase risk/i)).toBeInTheDocument();
    expect(screen.getByText(/decrease risk/i)).toBeInTheDocument();
  });
});
