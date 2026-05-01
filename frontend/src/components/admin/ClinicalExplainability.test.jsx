import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClinicalExplainability from './ClinicalExplainability';

vi.mock('../common/SHAPExplanation', () => ({
  default: ({ patientData, modelType }) => (
    <div
      data-testid="shap-props"
      data-model-type={modelType}
      data-patient-data={JSON.stringify(patientData)}
    />
  ),
}));

const fillRequiredNoBpFields = () => {
  fireEvent.change(screen.getByLabelText('Age *'), { target: { value: '55' } });
  fireEvent.change(screen.getByLabelText('BMI *'), { target: { value: '28.5' } });
  fireEvent.change(screen.getByLabelText('Triglycerides (mg/dL) *'), {
    target: { value: '155' },
  });
  fireEvent.change(screen.getByLabelText('LDL (mg/dL) *'), { target: { value: '120' } });
  fireEvent.change(screen.getByLabelText('HDL (mg/dL) *'), { target: { value: '48' } });
};

const submitExplainabilityForm = () => {
  fireEvent.submit(screen.getByRole('button', { name: /generate explanation/i }).closest('form'));
};

describe('ClinicalExplainability doctor wiring', () => {
  it('locks doctor explanations to binary_v2_no_bp and omits BP/ADA-only fields', async () => {
    render(<ClinicalExplainability userRole="doctor" />);

    fillRequiredNoBpFields();
    submitExplainabilityForm();

    const shapProps = await screen.findByTestId('shap-props');
    const patientData = JSON.parse(shapProps.dataset.patientData);

    expect(shapProps.dataset.modelType).toBe('binary_v2_no_bp');
    expect(patientData.model_type).toBe('binary_v2_no_bp');
    expect(patientData).toMatchObject({
      age: 55,
      bmi: 28.5,
      triglycerides: 155,
      ldl: 120,
      hdl: 48,
    });
    expect(patientData).not.toHaveProperty('systolic');
    expect(patientData).not.toHaveProperty('diastolic');
    expect(patientData).not.toHaveProperty('hba1c');
    expect(patientData).not.toHaveProperty('fbs');
  });

  it('uses the same 45-60 age cohort guard as doctor assessments', async () => {
    render(<ClinicalExplainability userRole="doctor" />);

    fillRequiredNoBpFields();
    fireEvent.change(screen.getByLabelText('Age *'), { target: { value: '61' } });
    submitExplainabilityForm();

    await waitFor(() => {
      expect(screen.getByText(/Age must be between 45-60 years/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('shap-props')).not.toBeInTheDocument();
  });
});
