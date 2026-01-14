import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies primary variant styles by default', () => {
    const { container } = render(<Button>Primary</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-[#4318FF]');
  });

  it('applies outline variant styles', () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('border-2');
    expect(button).toHaveClass('border-[#4318FF]');
  });

  it('applies ghost variant styles', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('text-[#A3AED0]');
  });

  it('applies danger variant styles', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-[#EE5D50]');
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );
    await user.click(screen.getByText('Disabled'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies disabled attribute when disabled prop is true', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
  });

  it('applies fullWidth class when fullWidth prop is true', () => {
    const { container } = render(<Button fullWidth>Full width</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('w-full');
  });

  it('renders icon when provided', () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(<Button icon={TestIcon}>With Icon</Button>);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('applies custom font family', () => {
    const { container } = render(<Button>Text</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({ fontFamily: '"DM Sans", sans-serif' });
  });
});
