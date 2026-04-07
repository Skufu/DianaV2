import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorFallback from './ErrorFallback';

describe('ErrorFallback', () => {
  it('renders error title and message', () => {
    const error = new Error('Test error message');
    render(<ErrorFallback section="Dashboard" error={error} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
  });

  it('displays generic message when error has no message', () => {
    render(<ErrorFallback section="Test" error={{}} />);
    expect(screen.getByText(/Test encountered an error/)).toBeInTheDocument();
  });

  it('renders retry button when onRetry callback is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorFallback onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorFallback />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorFallback onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows technical details toggle button in development mode', () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    render(<ErrorFallback error={new Error('Test')} />);
    expect(screen.getByRole('button', { name: /show technical details/i })).toBeInTheDocument();

    import.meta.env.DEV = originalDev;
  });

  it('does not show technical details toggle in production mode', () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = false;

    render(<ErrorFallback error={new Error('Test')} />);
    expect(
      screen.queryByRole('button', { name: /show technical details/i })
    ).not.toBeInTheDocument();

    import.meta.env.DEV = originalDev;
  });

  it('shows error details when show technical details is clicked', async () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const error = new Error('Test error');
    const user = userEvent.setup();
    render(<ErrorFallback error={error} />);

    const toggleButton = screen.getByRole('button', { name: /show technical details/i });
    await user.click(toggleButton);

    expect(screen.getByText('Error Message:')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    import.meta.env.DEV = originalDev;
  });

  it('hides details when hide details is clicked', async () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const error = new Error('Test error');
    const user = userEvent.setup();
    render(<ErrorFallback error={error} />);

    const toggleButton = screen.getByRole('button', { name: /show technical details/i });
    await user.click(toggleButton);

    expect(screen.getByText('Test error')).toBeInTheDocument();

    const hideButton = screen.getByRole('button', { name: /hide details/i });
    await user.click(hideButton);

    expect(screen.queryByText('Test error')).not.toBeInTheDocument();

    import.meta.env.DEV = originalDev;
  });

  it('displays component stack when errorInfo is provided', async () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const error = new Error('Test');
    const errorInfo = { componentStack: 'Test stack trace' };
    const user = userEvent.setup();
    render(<ErrorFallback error={error} errorInfo={errorInfo} />);

    const toggleButton = screen.getByRole('button', { name: /show technical details/i });
    await user.click(toggleButton);

    expect(screen.getByText('Component Stack:')).toBeInTheDocument();
    expect(screen.getByText('Test stack trace')).toBeInTheDocument();

    import.meta.env.DEV = originalDev;
  });

  it('does not display component stack when errorInfo is not provided', async () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const error = new Error('Test');
    const user = userEvent.setup();
    render(<ErrorFallback error={error} />);

    const toggleButton = screen.getByRole('button', { name: /show technical details/i });
    await user.click(toggleButton);

    expect(screen.queryByText('Component Stack:')).not.toBeInTheDocument();

    import.meta.env.DEV = originalDev;
  });

  it('has correct styling classes', () => {
    const { container } = render(<ErrorFallback />);
    const errorCard = container.firstChild.firstChild;
    expect(errorCard).toHaveClass('max-w-md');
    expect(errorCard).toHaveClass('rounded-2xl');
  });

  it('shows icon in header', () => {
    render(<ErrorFallback />);
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
