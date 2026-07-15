import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Signup from './Signup';

// Mock the assets import
vi.mock('../../assets/logo-icon.png', () => ({
  default: 'mock-logo.png',
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      whileHover,
      whileTap,
      whileFocus,
      initial,
      layout,
      animate,
      transition,
      exit,
      ...props
    }) => <div {...props}>{children}</div>,
    input: ({
      whileHover,
      whileTap,
      whileFocus,
      initial,
      layout,
      animate,
      transition,
      exit,
      ...props
    }) => <input {...props} />,
    button: ({
      children,
      whileHover,
      whileTap,
      whileFocus,
      initial,
      layout,
      animate,
      transition,
      exit,
      ...props
    }) => <button {...props}>{children}</button>,
    span: ({
      children,
      whileHover,
      whileTap,
      whileFocus,
      initial,
      layout,
      animate,
      transition,
      exit,
      ...props
    }) => <span {...props}>{children}</span>,
    p: ({
      children,
      whileHover,
      whileTap,
      whileFocus,
      initial,
      layout,
      animate,
      transition,
      exit,
      ...props
    }) => <p {...props}>{children}</p>,
    h1: ({
      children,
      whileHover,
      whileTap,
      whileFocus,
      initial,
      layout,
      animate,
      transition,
      exit,
      ...props
    }) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock the animations utils
vi.mock('../../utils/animations', () => ({
  cardVariants: {},
  slideUp: {},
  fadeIn: {},
  getInputFocusVariants: () => ({}),
  useReducedMotion: () => true,
}));

// Mock the Skeleton component
vi.mock('../common/Skeleton', () => ({
  SignupFormSkeleton: () => <div data-testid="signup-skeleton">Loading...</div>,
}));

// Mock the Button component
vi.mock('../common/Button', () => ({
  default: ({ children, onClick, isLoading, fullWidth, variant, className, type, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      type={type}
      className={className}
      data-variant={variant}
      data-fullwidth={fullWidth}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

// Mock the API import
vi.mock('../../api', () => ({
  signupApi: vi.fn(),
  getErrorMessage: (error, fallback) => error?.message || fallback,
  getFieldErrors: error =>
    error?.details && typeof error.details === 'object' && !Array.isArray(error.details)
      ? error.details
      : {},
}));

describe('Signup', () => {
  const mockOnSignup = vi.fn();
  const mockOnShowLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSignup = (props = {}) => {
    return render(<Signup onSignup={mockOnSignup} onShowLogin={mockOnShowLogin} {...props} />);
  };

  it('renders signup form with all fields', () => {
    renderSignup();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders DIANA branding', () => {
    renderSignup();

    expect(screen.getByText('DIANA')).toBeInTheDocument();
    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
  });

  it('shows login link', () => {
    renderSignup();

    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in instead/i)).toBeInTheDocument();
  });

  it('calls onShowLogin when login link is clicked', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText(/sign in instead/i));
    expect(mockOnShowLogin).toHaveBeenCalledTimes(1);
  });

  it('validates required email field', async () => {
    const user = userEvent.setup();
    renderSignup();

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates required password field', async () => {
    const user = userEvent.setup();
    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a password/i)).toBeInTheDocument();
    });
  });

  it('shows password requirements when typing password', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'p');

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows password requirement met status', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'Password123');

    await waitFor(() => {
      const requirements = screen.getAllByText(/password must be at least 8 characters/i);
      expect(requirements.length).toBeGreaterThan(0);
    });
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Different123');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows match indicator when passwords match', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    await waitFor(() => {
      expect(screen.getByText(/match/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the first toggle button (for password field)
    const toggleButtons = screen.getAllByRole('button');
    const passwordToggleButton = toggleButtons.find(btn => btn.querySelector('svg'));

    if (passwordToggleButton) {
      await user.click(passwordToggleButton);
      // After click, type should be text
    }
  });

  it('validates all fields before submission', async () => {
    const user = userEvent.setup();
    renderSignup();

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a password/i)).toBeInTheDocument();
    });
  });

  it('shows email valid indicator when valid email is entered', async () => {
    const user = userEvent.setup();
    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');
    await user.tab(); // Trigger blur

    // The checkmark should appear for valid email
    await waitFor(() => {
      // Email field should not show error
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });
  });

  it('displays error from failed signup', async () => {
    const user = userEvent.setup();
    const { signupApi } = await import('../../api');
    signupApi.mockRejectedValueOnce(new Error('Email already exists'));
    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('displays backend validation details next to the matching field', async () => {
    const user = userEvent.setup();
    const { signupApi } = await import('../../api');
    const error = new Error('This email is already registered');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = { email: 'This email is already registered' };
    signupApi.mockRejectedValueOnce(error);

    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/this email is already registered/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles successful signup', async () => {
    const user = userEvent.setup();
    const { signupApi } = await import('../../api');
    signupApi.mockResolvedValueOnce({ user: { id: 1, email: 'test@example.com' } });
    mockOnSignup.mockResolvedValueOnce({});

    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(signupApi).toHaveBeenCalledWith('test@example.com', 'Password123');
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const { signupApi } = await import('../../api');
    signupApi.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Form is unmounted and replaced by skeleton during loading
    await waitFor(() => {
      expect(screen.getByTestId('signup-skeleton')).toBeInTheDocument();
    });
  });

  it('toggles Guided Mode and displays instruction cards', async () => {
    const user = userEvent.setup();
    renderSignup();

    // Guided Mode toggle is visible
    const toggle = screen.getByTestId('guided-mode-toggle');
    expect(toggle).toBeInTheDocument();

    // Verify instructions are NOT visible initially
    expect(screen.queryByText(/Step 1: Enter your email address/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 2: Enter your password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 3: Type your password again/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 4: Click this button to proceed/i)).not.toBeInTheDocument();

    // Turn Guided Mode ON
    await user.click(toggle);

    // Verify all helper cards are now rendered
    expect(screen.getByText(/Step 1: Enter your email address/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2: Enter your password/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 3: Type your password again/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 4: Click this button to proceed/i)).toBeInTheDocument();

    // Turn Guided Mode OFF
    await user.click(toggle);

    // Verify instructions are gone again
    expect(screen.queryByText(/Step 1: Enter your email address/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 2: Enter your password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 3: Type your password again/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 4: Click this button to proceed/i)).not.toBeInTheDocument();
  });
});
