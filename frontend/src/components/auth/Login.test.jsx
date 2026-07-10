import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// Mock the assets import
vi.mock('../../assets/logo-icon.png', () => ({
  default: 'mock-logo.png',
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <div {...props}>{children}</div>,
    input: ({ whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <input {...props} />,
    button: ({ children, whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <button {...props}>{children}</button>,
    p: ({ children, whileHover, whileTap, whileFocus, initial, layout, animate, transition, exit, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock the animations utils
vi.mock('../../utils/animations', () => ({
  fadeIn: {},
  getInputFocusVariants: () => ({}),
  useReducedMotion: () => true,
}));

// Mock the Skeleton component
vi.mock('../common/Skeleton', () => ({
  LoginFormSkeleton: () => <div data-testid="login-skeleton">Loading...</div>,
}));

describe('Login', () => {
  const mockOnLogin = vi.fn();
  const mockOnShowSignup = vi.fn();
  const mockOnShowVerify = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLogin = (props = {}) => {
    return render(
      <Login
        onLogin={mockOnLogin}
        onShowSignup={mockOnShowSignup}
        onShowVerify={mockOnShowVerify}
        {...props}
      />
    );
  };

  it('renders login form with email and password fields', () => {
    renderLogin();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to dashboard/i })).toBeInTheDocument();
  });

  it('renders DIANA branding', () => {
    renderLogin();

    expect(screen.getByText('DIANA')).toBeInTheDocument();
    expect(screen.getByText(/personal diabetes risk insights/i)).toBeInTheDocument();
  });

  it('shows signup link', () => {
    renderLogin();

    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('calls onShowSignup when signup link is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText(/sign up/i));
    expect(mockOnShowSignup).toHaveBeenCalledTimes(1);
  });

  it('does not show forgot password link', () => {
    renderLogin();

    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
  });

  it('validates required email field', async () => {
    const user = userEvent.setup();
    renderLogin();

    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates required password field', async () => {
    const user = userEvent.setup();
    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('validates minimum password length', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'short');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/^password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the toggle button by its aria-label
    const toggleButton = screen.getByLabelText(/show password/i);
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText(/hide password/i);
    await user.click(hideButton);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls onLogin with valid credentials', async () => {
    const user = userEvent.setup();
    mockOnLogin.mockResolvedValueOnce({});
    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validpassword123');

    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'validpassword123');
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockOnLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validpassword123');

    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });
    await user.click(submitButton);

    // Form is unmounted and replaced by skeleton during loading
    await waitFor(() => {
      expect(screen.getByTestId('login-skeleton')).toBeInTheDocument();
    });
  });

  it('displays error message from props', () => {
    renderLogin({ error: { message: 'Invalid credentials' } });

    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('displays string error from props', () => {
    renderLogin({ error: 'Account deactivated' });

    expect(screen.getByText(/account deactivated/i)).toBeInTheDocument();
  });

  it('handles login error gracefully', async () => {
    const user = userEvent.setup();
    mockOnLogin.mockRejectedValueOnce(new Error('Network error'));
    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validpassword123');

    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it('renders remember me checkbox', () => {
    renderLogin();

    expect(screen.getByLabelText(/keep me signed in/i)).toBeInTheDocument();
  });

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup();
    renderLogin();

    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test');

    // Error should be cleared after typing
    await waitFor(() => {
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });
});
