import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Header from './Header';

describe('landing/Header', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('renders nav links and CTA buttons', () => {
    render(<Header onSignIn={vi.fn()} />);

    expect(screen.getByText('landing.nav.features')).toBeInTheDocument();
    expect(screen.getByText('landing.nav.pricing')).toBeInTheDocument();
    expect(screen.getByText('landing.nav.faq')).toBeInTheDocument();
    expect(screen.getByText('landing.nav.signIn')).toBeInTheDocument();
    expect(screen.getByText('landing.nav.getStarted')).toBeInTheDocument();
  });

  it('forwards sign-in clicks from both buttons', () => {
    const onSignIn = vi.fn();
    render(<Header onSignIn={onSignIn} />);

    fireEvent.click(screen.getByText('landing.nav.signIn'));
    fireEvent.click(screen.getByText('landing.nav.getStarted'));

    expect(onSignIn).toHaveBeenCalledTimes(2);
  });

  it('starts unscrolled with a transparent border', () => {
    const { container } = render(<Header onSignIn={vi.fn()} />);
    const header = container.querySelector('header');

    expect(header?.className).toContain('border-transparent');
  });

  it('applies scrolled styles after a scroll event', () => {
    const { container } = render(<Header onSignIn={vi.fn()} />);

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(container.querySelector('header')?.className).toContain(
      'bg-background/85',
    );
  });

  it('removes the scroll listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Header onSignIn={vi.fn()} />);

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
