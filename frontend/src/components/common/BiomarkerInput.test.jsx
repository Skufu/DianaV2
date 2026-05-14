import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import BiomarkerInput from './BiomarkerInput';

describe('BiomarkerInput', () => {
  it('renders label correctly', () => {
    render(<BiomarkerInput label="Glucose" />);
    expect(screen.getByText('Glucose')).toBeInTheDocument();
  });

  it('displays required asterisk when required prop is true', () => {
    render(<BiomarkerInput label="Glucose" required />);
    const asterisk = document.querySelector('.text-red-500');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveTextContent('*');
  });

  it('does not display required asterisk when required prop is false', () => {
    render(<BiomarkerInput label="Glucose" required={false} />);
    const asterisk = document.querySelector('.text-red-500');
    expect(asterisk).not.toBeInTheDocument();
  });

  it('renders unit when provided', () => {
    render(<BiomarkerInput label="Glucose" unit="mg/dL" />);
    expect(screen.getByText('mg/dL')).toBeInTheDocument();
  });

  it('does not render unit when not provided', () => {
    render(<BiomarkerInput label="Glucose" />);
    expect(screen.queryByText('mg/dL')).not.toBeInTheDocument();
  });

  it('calls onChange with input value', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    const ControlledInput = () => {
      const [value, setValue] = useState('');
      return (
        <BiomarkerInput
          label="Glucose"
          value={value}
          onChange={nextValue => {
            handleChange(nextValue);
            setValue(nextValue);
          }}
        />
      );
    };

    render(<ControlledInput />);

    const input = screen.getByRole('spinbutton');
    await user.type(input, '100');

    expect(handleChange).toHaveBeenCalled();
    // userEvent.type fires multiple onChange events, check that '100' was eventually called
    const allCalls = handleChange.mock.calls.map(call => call[0]);
    expect(allCalls).toContain('100');
  });

  it('displays value when provided', () => {
    render(<BiomarkerInput label="Glucose" value="100" />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(100);
  });

  it('uses the native number input to reject non-numeric input', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<BiomarkerInput label="Glucose" onChange={handleChange} />);

    const input = screen.getByRole('spinbutton');
    await user.type(input, 'abc');

    await waitFor(() => {
      expect(input).toHaveValue(null);
    });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('shows error when value is below minimum', () => {
    const handleChange = vi.fn();
    render(<BiomarkerInput label="Glucose" onChange={handleChange} min={70} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '50' } });

    expect(screen.getByText('Must be at least 70')).toBeInTheDocument();
  });

  it('shows error when value is above maximum', () => {
    const handleChange = vi.fn();
    render(<BiomarkerInput label="Glucose" onChange={handleChange} max={200} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '250' } });

    expect(screen.getByText('Must not exceed 200')).toBeInTheDocument();
  });

  it('includes unit in error message when provided', () => {
    const handleChange = vi.fn();
    render(<BiomarkerInput label="Glucose" unit="mg/dL" onChange={handleChange} min={70} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '50' } });

    expect(screen.getByText('Must be at least 70 mg/dL')).toBeInTheDocument();
  });

  it('allows empty input when not required', () => {
    const handleChange = vi.fn();
    render(<BiomarkerInput label="Glucose" onChange={handleChange} value="100" />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.queryByText(/must be at least/i)).not.toBeInTheDocument();
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('displays normal range when value is in normal reference', () => {
    const handleChange = vi.fn();
    const referenceRanges = {
      normal: { min: 70, max: 99, unit: 'mg/dL' },
      prediabetic: { min: 100, max: 125, unit: 'mg/dL' },
      diabetic: { min: 126, max: 999, unit: 'mg/dL' },
    };
    
    render(
      <BiomarkerInput label="Glucose" onChange={handleChange} referenceRanges={referenceRanges} value="85" />
    );

    expect(screen.getByText(/Normal range/i)).toBeInTheDocument();
    expect(screen.getByText(/70-99/i)).toBeInTheDocument();
  });

  it('displays prediabetic range when value is in prediabetic reference', () => {
    const handleChange = vi.fn();
    const referenceRanges = {
      normal: { min: 70, max: 99, unit: 'mg/dL' },
      prediabetic: { min: 100, max: 125, unit: 'mg/dL' },
      diabetic: { min: 126, max: 999, unit: 'mg/dL' },
    };

    render(
      <BiomarkerInput label="Glucose" onChange={handleChange} referenceRanges={referenceRanges} value="110" />
    );

    expect(screen.getByText(/Prediabetic range/i)).toBeInTheDocument();
  });

  it('displays diabetic range when value is in diabetic reference', () => {
    const handleChange = vi.fn();
    const referenceRanges = {
      normal: { min: 70, max: 99, unit: 'mg/dL' },
      prediabetic: { min: 100, max: 125, unit: 'mg/dL' },
      diabetic: { min: 126, max: 999, unit: 'mg/dL' },
    };
    
    render(
      <BiomarkerInput label="Glucose" onChange={handleChange} referenceRanges={referenceRanges} value="150" />
    );

    expect(screen.getByText(/Diabetic range/i)).toBeInTheDocument();
  });

  it('does not display range text when value is empty', () => {
    render(<BiomarkerInput label="Glucose" value="" />);
    expect(screen.queryByText(/Normal range/i)).not.toBeInTheDocument();
  });

  it('applies custom step to input', () => {
    render(<BiomarkerInput label="Glucose" step="0.1" />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '0.1');
  });

  it('has correct placeholder text', () => {
    render(<BiomarkerInput label="Glucose" />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('placeholder', 'Enter glucose');
  });

  it('updates correctly when value prop changes', () => {
    const { rerender } = render(<BiomarkerInput label="Glucose" value="100" />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(100);

    rerender(<BiomarkerInput label="Glucose" value="150" />);
    expect(input).toHaveValue(150);
  });

  it('updates correctly when unit prop changes', () => {
    const { rerender } = render(<BiomarkerInput label="Glucose" unit="mg/dL" />);
    expect(screen.getByText('mg/dL')).toBeInTheDocument();

    rerender(<BiomarkerInput label="Glucose" unit="g/dL" />);
    expect(screen.getByText('g/dL')).toBeInTheDocument();
  });

  it('updates correctly when label prop changes', () => {
    const { rerender } = render(<BiomarkerInput label="Glucose" />);
    expect(screen.getByText('Glucose')).toBeInTheDocument();

    rerender(<BiomarkerInput label="HbA1c" />);
    expect(screen.getByText('HbA1c')).toBeInTheDocument();
    expect(screen.queryByText('Glucose')).not.toBeInTheDocument();
  });

  it('updates correctly when required prop changes', () => {
    const { rerender } = render(<BiomarkerInput label="Glucose" required />);
    expect(document.querySelector('.text-red-500')).toBeInTheDocument();

    rerender(<BiomarkerInput label="Glucose" required={false} />);
    expect(document.querySelector('.text-red-500')).not.toBeInTheDocument();
  });
});
