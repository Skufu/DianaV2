import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard_user from './Dashboard_user';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock the animations utils
vi.mock('../../utils/animations', () => ({
  staggerContainer: {},
  slideUp: {},
  cardVariants: {},
  useReducedMotion: () => true,
}));

// Mock StatusSummaryCard
vi.mock('../common/StatusSummaryCard', () => ({
  default: ({ onStartAssessment, onViewTrends, onViewLatest }) => (
    <div data-testid="status-summary-card">
      <button onClick={onStartAssessment}>Start Assessment</button>
      <button onClick={onViewTrends}>View Trends</button>
      <button onClick={onViewLatest}>View Latest</button>
    </div>
  ),
}));

// Mock RiskIndicator
vi.mock('../common/RiskIndicator', () => ({
  default: ({ riskScore, riskLevel }) => (
    <div data-testid="risk-indicator">
      Score: {riskScore}, Level: {riskLevel}
    </div>
  ),
}));

// Mock MLResultModal
vi.mock('../common/MLResultModal', () => ({
  default: ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="ml-result-modal">
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// Create mock functions
const mockRefetch = vi.fn();

// Mock react-query hooks
vi.mock('../../api', () => ({
  useAssessments: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
  deriveRiskLevelFromScore: (score) => {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  },
  normalizeAssessmentContract: (assessment) => assessment,
  useCreateAssessment: () => ({
    mutateAsync: vi.fn(),
  }),
}));

describe('Dashboard_user', () => {
  const mockSetActiveTab = vi.fn();
  const mockOnStartAssessment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = (props = {}) => {
    return render(
      <Dashboard_user
        setActiveTab={mockSetActiveTab}
        onStartAssessment={mockOnStartAssessment}
        {...props}
      />
    );
  };

  it('renders dashboard with status summary card', () => {
    renderDashboard();
    expect(screen.getByTestId('status-summary-card')).toBeInTheDocument();
  });

  it('renders total assessments card', () => {
    renderDashboard();
    expect(screen.getByText(/total assessments/i)).toBeInTheDocument();
  });

  it('renders risk level card', () => {
    renderDashboard();
    expect(screen.getByText(/risk level/i)).toBeInTheDocument();
  });

  it('renders metabolic profile card', () => {
    renderDashboard();
    expect(screen.getByText(/metabolic profile/i)).toBeInTheDocument();
  });

  it('renders log new assessment button', () => {
    renderDashboard();
    expect(screen.getByText(/log new assessment/i)).toBeInTheDocument();
  });

  it('calls onStartAssessment when log new assessment is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByText(/log new assessment/i));
    expect(mockOnStartAssessment).toHaveBeenCalled();
  });

  it('renders view trends button', () => {
    renderDashboard();
    const viewTrendsButtons = screen.getAllByRole('button', { name: /view trends/i });
    expect(viewTrendsButtons.length).toBeGreaterThan(0);
  });

  it('calls setActiveTab with "trends" when view trends is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Click the first view trends button (from status summary card mock)
    const viewTrendsButtons = screen.getAllByRole('button', { name: /view trends/i });
    await user.click(viewTrendsButtons[0]);
    expect(mockSetActiveTab).toHaveBeenCalledWith('trends');
  });

  it('renders health report button', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /health report/i })).toBeInTheDocument();
  });

  it('calls setActiveTab with "export" when health report is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /health report/i }));
    expect(mockSetActiveTab).toHaveBeenCalledWith('export');
  });

  it('renders my profile button', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /my profile/i })).toBeInTheDocument();
  });

  it('calls setActiveTab with "profile" when my profile is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /my profile/i }));
    expect(mockSetActiveTab).toHaveBeenCalledWith('profile');
  });

  it('shows no data message when no latest assessment', () => {
    renderDashboard();
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });

  it('shows no profile message when no assessment', () => {
    renderDashboard();
    expect(screen.getByText(/no profile yet/i)).toBeInTheDocument();
  });

  it('does not render recent results table when no assessments', () => {
    renderDashboard();
    expect(screen.queryByText(/recent results/i)).not.toBeInTheDocument();
  });
});
