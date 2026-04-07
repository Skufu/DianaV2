import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let originalError;
  let originalLogError;

  beforeEach(() => {
    originalError = console.error;
    originalLogError = console.log;
    console.error = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.log = originalLogError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('catches errors and displays default ErrorFallback', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.queryByText('No error')).not.toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('passes section prop to default ErrorFallback', () => {
    render(
      <ErrorBoundary section="Test Section">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Test Section/)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom Error</div>;
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('passes error, errorInfo, and onRetry props to custom fallback', () => {
    const CustomFallback = ({ error, errorInfo, onRetry }) => (
      <div>
        <div>Error: {error?.message}</div>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );

    const { container } = render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('resets error state when onRetry is called', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalledWith('[ErrorBoundary] Caught error:', expect.any(Error));
  });

  it('logs component stack to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary] Component stack:',
      expect.any(String)
    );
  });
});
