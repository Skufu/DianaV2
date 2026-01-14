import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskIndicator from './RiskIndicator';

describe('RiskIndicator', () => {
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
    expect(screen.queryByText('Metabolic Subtype:')).not.toBeInTheDocument();
  });

  it('renders cluster when provided', () => {
    render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="SIRD" />);
    expect(screen.getByText('Metabolic Subtype:')).toBeInTheDocument();
    expect(screen.getByText('SIRD')).toBeInTheDocument();
  });

  it('applies correct styling for SIRD cluster', () => {
    const { container } = render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="SIRD" />);
    const clusterElements = container.querySelectorAll('.bg-purple-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies correct styling for SIDD cluster', () => {
    const { container } = render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="SIDD" />);
    const clusterElements = container.querySelectorAll('.bg-red-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies correct styling for MOD cluster', () => {
    const { container } = render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="MOD" />);
    const clusterElements = container.querySelectorAll('.bg-orange-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies correct styling for MARD cluster', () => {
    const { container } = render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="MARD" />);
    const clusterElements = container.querySelectorAll('.bg-green-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });

  it('applies gray styling for unknown cluster', () => {
    const { container } = render(<RiskIndicator riskScore={50} riskLevel="medium" cluster="UNKNOWN" />);
    const clusterElements = container.querySelectorAll('.bg-gray-100');
    expect(clusterElements.length).toBeGreaterThan(0);
  });
});
