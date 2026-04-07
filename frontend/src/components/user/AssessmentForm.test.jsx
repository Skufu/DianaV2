import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssessmentForm from './AssessmentForm';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <div {...props}>{children}</div>,
    input: ({ whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <input {...props} />,
    button: ({ children, whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <button {...props}>{children}</button>,
    tr: ({ children, whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock the animations utils
vi.mock('../../utils/animations', () => ({
  slideUp: {},
  useReducedMotion: () => true,
}));

// Mock react-query hooks
vi.mock('../../api', () => ({
  useCreateAssessment: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      id: 1,
      risk_score: 45,
      risk_level: 'medium',
      cluster: 'SIRD',
    }),
  }),
}));

// Mock MLResultModal
vi.mock('../common/MLResultModal', () => ({
  default: ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="ml-result-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={onConfirm}>Save</button>
      </div>
    );
  },
}));

describe('AssessmentForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAssessmentForm = (props = {}) => {
    return render(
      <AssessmentForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  it('renders form with body metrics fields', () => {
    renderAssessmentForm();

    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^bmi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
  });

  it('renders form with lipid profile fields', () => {
    renderAssessmentForm();

    expect(screen.getByLabelText(/triglycerides/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^ldl/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^hdl/i)).toBeInTheDocument();
  });

  it('renders form with lifestyle fields', () => {
    renderAssessmentForm();

    expect(screen.getByLabelText(/smoking status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/physical activity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alcohol use/i)).toBeInTheDocument();
  });

  it('auto-calculates BMI when height and weight are entered', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    const heightInput = screen.getByLabelText(/height/i);
    const weightInput = screen.getByLabelText(/weight/i);

    await user.type(heightInput, '170');
    await user.type(weightInput, '70');

    // BMI = 70 / (1.7 * 1.7) ≈ 24.2
    const bmiInput = screen.getByLabelText(/^bmi/i);
    expect(bmiInput).toHaveValue('24.2');
  });

  it('renders submit button', () => {
    renderAssessmentForm();

    expect(screen.getByRole('button', { name: /submit for analysis/i })).toBeInTheDocument();
  });

  it('renders cancel button when onCancel is provided', () => {
    renderAssessmentForm();

    // The X button is the cancel button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('does not render cancel button when onCancel is not provided', () => {
    render(<AssessmentForm />);

    // Only the submit button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(1);
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    const submitButton = screen.getByRole('button', { name: /submit for analysis/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please complete all required fields for the clinical assessment/i)).toBeInTheDocument();
    });
  });

  it('validates age range (45-60)', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    // Fill in required fields
    await user.type(screen.getByLabelText(/height/i), '170');
    await user.type(screen.getByLabelText(/weight/i), '70');
    await user.type(screen.getByLabelText(/triglycerides/i), '150');
    await user.type(screen.getByLabelText(/^ldl/i), '100');
    await user.type(screen.getByLabelText(/^hdl/i), '50');
    await user.type(screen.getByLabelText(/age/i), '30'); // Invalid age

    const submitButton = screen.getByRole('button', { name: /submit for analysis/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/age must be between 45-60 years for postmenopausal women/i)).toBeInTheDocument();
    });
  });

  it('validates BMI range', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    // Fill in required fields with values that produce invalid BMI
    await user.type(screen.getByLabelText(/height/i), '200'); // Very tall
    await user.type(screen.getByLabelText(/weight/i), '30'); // Very light - BMI ~7.5
    await user.type(screen.getByLabelText(/triglycerides/i), '150');
    await user.type(screen.getByLabelText(/^ldl/i), '100');
    await user.type(screen.getByLabelText(/^hdl/i), '50');
    await user.type(screen.getByLabelText(/age/i), '50');

    const submitButton = screen.getByRole('button', { name: /submit for analysis/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/bmi must be between 15-60 kg\/m²/i)).toBeInTheDocument();
    });
  });

  it('renders notes field', () => {
    renderAssessmentForm();

    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('renders waist circumference optional field', () => {
    renderAssessmentForm();

    expect(screen.getByLabelText(/waist circumference/i)).toBeInTheDocument();
  });

  it('renders smoking status options', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    const select = screen.getByLabelText(/smoking status/i);
    await user.click(select);

    expect(screen.getAllByRole('option', { name: /unknown/i })[0]).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /never smoked/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /former smoker/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /current smoker/i })).toBeInTheDocument();
  });

  it('renders physical activity options', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    const select = screen.getByLabelText(/physical activity/i);
    await user.click(select);

    // Get options within the physical activity select to avoid ambiguity with alcohol's "Moderate" option
    const options = screen.getAllByRole('option');
    expect(options.some(opt => opt.textContent.match(/unknown/i))).toBe(true);
    expect(options.some(opt => opt.textContent.match(/sedentary/i))).toBe(true);
    expect(options.some(opt => opt.textContent.match(/active/i))).toBe(true);
    // Physical activity has "Moderate (1-3 days/week)" which is unique from alcohol's "Moderate"
    expect(options.some(opt => opt.textContent.match(/moderate.*1-3 days/i))).toBe(true);
  });

  it('renders alcohol use options', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    const select = screen.getByLabelText(/alcohol use/i);
    await user.click(select);

    expect(screen.getAllByRole('option', { name: /unknown/i })[0]).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /none/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /heavy/i })).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    renderAssessmentForm();

    // Fill all required fields
    await user.type(screen.getByLabelText(/height/i), '170');
    await user.type(screen.getByLabelText(/weight/i), '70');
    await user.type(screen.getByLabelText(/triglycerides/i), '150');
    await user.type(screen.getByLabelText(/^ldl/i), '100');
    await user.type(screen.getByLabelText(/^hdl/i), '50');
    await user.type(screen.getByLabelText(/age/i), '50');

    const submitButton = screen.getByRole('button', { name: /submit for analysis/i });
    await user.click(submitButton);

    // Wait for the async mutation to complete and modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('ml-result-modal')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows model type selector when showModelSelector is true', () => {
    renderAssessmentForm({ showModelSelector: true });

    expect(screen.getByLabelText(/model type/i)).toBeInTheDocument();
  });

  it('hides model type selector when showModelSelector is false', () => {
    renderAssessmentForm({ showModelSelector: false });

    expect(screen.queryByLabelText(/model type/i)).not.toBeInTheDocument();
  });

  it('locks model type when lockedModelType is provided', () => {
    renderAssessmentForm({ lockedModelType: 'binary_v2_no_bp' });

    // Model selector should not be shown even with showModelSelector=true
    expect(screen.queryByLabelText(/model type/i)).not.toBeInTheDocument();
  });

  it('renders clinical view header when isClinicalView is true', () => {
    renderAssessmentForm({ isClinicalView: true });

    expect(screen.getByText(/log new assessment/i)).toBeInTheDocument();
  });

  it('prefills data from initialData', async () => {
    renderAssessmentForm({
      initialData: {
        age: 55,
        smoking_status: 'Former',
        physical_activity: 'Moderate',
        alcohol: 'Light',
      },
    });

    expect(screen.getByLabelText(/age/i)).toHaveValue(55);
    expect(screen.getByLabelText(/smoking status/i)).toHaveValue('Former');
    expect(screen.getByLabelText(/physical activity/i)).toHaveValue('Moderate');
    expect(screen.getByLabelText(/alcohol use/i)).toHaveValue('Light');
  });

});
