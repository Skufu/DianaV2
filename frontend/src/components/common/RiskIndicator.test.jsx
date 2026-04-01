import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RiskIndicator from './RiskIndicator';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
}));

// Mock the animations utils
vi.mock('../../utils/animations', () => ({
  fadeIn: {},
  scaleIn: {},
  useReducedMotion: () => true,
}));

describe('RiskIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders risk score correctly', () => {
    render(<RiskIndicator riskScore={75} riskLevel="high" />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Diabetes Risk Score')).toBeInTheDocument();
  });

  it('displays low risk styling', () => {
    const { container } = render(<RiskIndicator riskScore={20} riskLevel="low" />);
    const riskElements = container.querySelectorAll('.bg-green-100');
    expect(riskElements.length).toBeGreaterThan(0);
  });

  it('displays medium risk styling', () => {
    const { container } = render(<RiskIndicator riskScore={50} riskLevel="medium" />);
    const riskElements = container.querySelectorAll('.bg-yellow-100');
    expect(riskElements.length).toBeGreaterThan(0);
  });

  it('displays high risk styling', () => {
    const { container } = render(<RiskIndicator riskScore={85} riskLevel="high" />);
    const riskElements = container.querySelectorAll('.bg-red-100');
    expect(riskElements.length).toBeGreaterThan(0);
  });

  it('displays unknown risk styling when risk level is not provided', () => {
    const { container } = render(<RiskIndicator riskScore={0} />);
    const riskElements = container.querySelectorAll('.bg-gray-100');
    expect(riskElements.length).toBeGreaterThan(0);
  });

  it('displays risk level text', () => {
    render(<RiskIndicator riskScore={50} riskLevel="medium" />);
    expect(screen.getByText('Risk Level:')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('displays unknown when risk level is null', () => {
    render(<RiskIndicator riskScore={0} />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('does not render cluster section when cluster is not provided', () => {
    render(<RiskIndicator riskScore={50} riskLevel="medium" />);
    expect(screen.queryByText('Metabolic Profile:')).not.toBeInTheDocument();
  });

  it('renders cluster when provided', () => {
    render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="SIRD" />);
    expect(screen.getByText('Metabolic Profile:')).toBeInTheDocument();
    expect(screen.getByText('SIRD')).toBeInTheDocument();
  });

  it('applies correct styling for SIRD cluster', () => {
    const { container } = render(
      <RiskIndicator riskScore={50} riskLevel="medium" cluster="SIRD" />
    );
    const clusterElements = container.querySelectorAll('.bg-orange-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies correct styling for SIDD cluster', () => {
    const { container } = render(
      <RiskIndicator riskScore={50} riskLevel="medium" cluster="SIDD" />
    );
    const clusterElements = container.querySelectorAll('.bg-rose-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies correct styling for MOD cluster', () => {
    const { container } = render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="MOD" />);
    const clusterElements = container.querySelectorAll('.bg-blue-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies correct styling for MARD cluster', () => {
    const { container } = render(
      <RiskIndicator riskScore={50} riskLevel="medium" cluster="MARD" />
    );
    const clusterElements = container.querySelectorAll('.bg-teal-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies slate styling for unknown cluster', () => {
    const { container } = render(
      <RiskIndicator riskScore={50} riskLevel="medium" cluster="UNKNOWN" />
    );
    const clusterElements = container.querySelectorAll('.bg-slate-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('updates correctly when riskScore changes', () => {
    const { rerender } = render(<RiskIndicator riskScore={50} riskLevel="medium" />);
    expect(screen.getByText('50')).toBeInTheDocument();

    rerender(<RiskIndicator riskScore={75} riskLevel="high" />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('updates correctly when riskLevel changes', () => {
    const { rerender, container } = render(<RiskIndicator riskScore={50} riskLevel="low" />);
    expect(container.querySelectorAll('.bg-green-100').length).toBeGreaterThan(0);

    rerender(<RiskIndicator riskScore={50} riskLevel="high" />);
    expect(container.querySelectorAll('.bg-red-100').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.bg-green-100').length).toBe(0);
  });

  it('updates correctly when cluster changes', () => {
    const { rerender, container } = render(
      <RiskIndicator riskScore={50} riskLevel="medium" cluster="SIRD" />
    );
    expect(screen.getByText('SIRD')).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-orange-100').length).toBeGreaterThan(0);

    rerender(<RiskIndicator riskScore={50} riskLevel="medium" cluster="SIDD" />);
    expect(screen.getByText('SIDD')).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-rose-100').length).toBeGreaterThan(0);
  });
});
