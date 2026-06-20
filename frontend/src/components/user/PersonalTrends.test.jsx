import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PersonalTrends from './PersonalTrends';
import { useTrends } from '../../api';

vi.mock('framer-motion', () => {
  const stripMotionProps = props => {
    const rest = { ...props };
    ['animate', 'exit', 'initial', 'transition', 'variants', 'whileHover', 'whileTap'].forEach(
      prop => delete rest[prop]
    );
    return rest;
  };

  const createMotionComponent = tag => {
    const MotionComponent = React.forwardRef(({ children, ...props }, ref) =>
      React.createElement(tag, { ref, ...stripMotionProps(props) }, children)
    );
    MotionComponent.displayName = `MockMotion.${tag}`;
    return MotionComponent;
  };

  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(tag),
      }
    ),
  };
});

vi.mock('../../utils/animations', async () => {
  const actual = await vi.importActual('../../utils/animations');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

vi.mock('recharts', () => {
  const Chart = ({ children, label, ...props }) => (
    <svg data-chart={props.dataKey || 'chart'}>
      {label?.value ? <text>{label.value}</text> : null}
      {children}
    </svg>
  );

  return {
    Area: Chart,
    AreaChart: Chart,
    CartesianGrid: Chart,
    ReferenceArea: Chart,
    ReferenceLine: Chart,
    ResponsiveContainer: Chart,
    Tooltip: Chart,
    XAxis: Chart,
    YAxis: Chart,
  };
});

vi.mock('../../api', () => ({
  useExportPDF: () => ({ mutate: vi.fn(), isPending: false }),
  useTrends: vi.fn(),
}));

const trendData = {
  clusterHistory: [
    { date: '2026-01-01', cluster: 'MOD', riskScore: 62 },
    { date: '2026-04-01', cluster: 'SIRD', riskScore: 72 },
  ],
  biomarkerHistory: [
    {
      date: '2026-01-01',
      bmi: 31.2,
      triglycerides: 180,
      ldl: 130,
      hdl: 42,
      waist_circumference: 92,
    },
    {
      date: '2026-04-01',
      bmi: 30.5,
      triglycerides: 170,
      ldl: 120,
      hdl: 46,
      waist_circumference: 90,
    },
  ],
  riskLevels: { low: 0, medium: 1, high: 1 },
};

describe('PersonalTrends chart readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTrends.mockReturnValue({ data: trendData, isLoading: false });
  });

  it('uses screening-safe chart labels and shared risk thresholds', () => {
    render(<PersonalTrends onStartAssessment={vi.fn()} />);

    expect(screen.getByText('Screening Score History')).toBeInTheDocument();
    expect(screen.getByText(/not diagnostic results/i)).toBeInTheDocument();
    expect(screen.getByText('Moderate range')).toBeInTheDocument();
    expect(screen.getByText('High range')).toBeInTheDocument();
    expect(screen.getByText('Reference Range')).toBeInTheDocument();
    expect(screen.getByText('Moderate Screening Risk')).toBeInTheDocument();
    expect(screen.getByText('High Screening Risk')).toBeInTheDocument();
  });

  it('summarizes the selected range and selected biomarker with visible units', () => {
    render(<PersonalTrends onStartAssessment={vi.fn()} />);

    expect(screen.getByText('Selected Range')).toBeInTheDocument();
    expect(screen.getByText(/2 assessments - Jan 2026 to Apr 2026/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Screening score increased from 62 to 72 across 2 assessments/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Body Mass Index \(BMI\) decreased from 31.2 kg\/m² to 30.5 kg\/m²/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Unit: kg/m²')).toBeInTheDocument();
    expect(screen.getAllByText(/selected 1 year range/i).length).toBeGreaterThan(0);
  });

  it('surfaces the biggest biomarker movers without adding another chart', () => {
    render(<PersonalTrends onStartAssessment={vi.fn()} />);

    expect(screen.getByText('Biggest Movers')).toBeInTheDocument();
    expect(
      screen.getByText(/HDL Cholesterol increased from 42 mg\/dL to 46 mg\/dL/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/LDL Cholesterol decreased from 130 mg\/dL to 120 mg\/dL/i)
    ).toBeInTheDocument();
  });

  it('keeps the All Time filter wired as months=0', () => {
    render(<PersonalTrends onStartAssessment={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /All Time/i }));

    expect(useTrends).toHaveBeenLastCalledWith(0);
  });
});
