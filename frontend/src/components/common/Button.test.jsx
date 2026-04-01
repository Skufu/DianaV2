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
    expect(button).toHaveClass('bg-diana-teal');
  });

  it('applies outline variant styles', () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('border-2');
    expect(button).toHaveClass('border-diana-teal');
  });

  it('applies ghost variant styles', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('text-slate-500');
  });

  it('applies danger variant styles', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-rose-600');
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

  it('updates correctly when variant prop changes', () => {
    const { rerender, container } = render(<Button variant="primary">Text</Button>);
    let button = container.querySelector('button');
    expect(button).toHaveClass('bg-diana-teal');

    rerender(<Button variant="danger">Text</Button>);
    button = container.querySelector('button');
    expect(button).toHaveClass('bg-rose-600');
    expect(button).not.toHaveClass('bg-diana-teal');
  });

  it('updates correctly when disabled prop changes', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <Button onClick={handleClick} disabled>
        Text
      </Button>
    );
    let button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();

    rerender(
      <Button onClick={handleClick} disabled={false}>
        Text
      </Button>
    );
    button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('updates correctly when children prop changes', () => {
    const { rerender } = render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();

    rerender(<Button>New text</Button>);
    expect(screen.getByText('New text')).toBeInTheDocument();
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('updates correctly when fullWidth prop changes', () => {
    const { rerender, container } = render(<Button fullWidth>Text</Button>);
    let button = container.querySelector('button');
    expect(button).toHaveClass('w-full');

    rerender(<Button fullWidth={false}>Text</Button>);
    button = container.querySelector('button');
    expect(button).not.toHaveClass('w-full');
  });

  it('updates correctly when className prop changes', () => {
    const { rerender, container } = render(<Button className="custom-class">Text</Button>);
    let button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');

    rerender(<Button className="another-class">Text</Button>);
    button = container.querySelector('button');
    expect(button).toHaveClass('another-class');
    expect(button).not.toHaveClass('custom-class');
  });
});
