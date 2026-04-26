import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import EyebrowLabel from './EyebrowLabel';
import SectionShell from './SectionShell';
import Reveal from './Reveal';

describe('EyebrowLabel', () => {
  it('renders the provided text inside a paragraph', () => {
    render(<EyebrowLabel>Hello</EyebrowLabel>);
    const p = screen.getByText('Hello');

    expect(p.tagName).toBe('P');
    expect(p.className).toContain('uppercase');
  });
});

describe('SectionShell', () => {
  it('passes id and default tone class', () => {
    const { container } = render(
      <SectionShell id="features">
        <span>content</span>
      </SectionShell>,
    );
    const section = container.querySelector('section');

    expect(section?.id).toBe('features');
    expect(section?.className).toContain('bg-background');
  });

  it('applies muted tone class', () => {
    const { container } = render(
      <SectionShell tone="muted">
        <span>x</span>
      </SectionShell>,
    );

    expect(container.querySelector('section')?.className).toContain('bg-muted');
  });

  it('applies inverted tone class', () => {
    const { container } = render(
      <SectionShell tone="inverted">
        <span>x</span>
      </SectionShell>,
    );

    expect(container.querySelector('section')?.className).toContain(
      'bg-foreground',
    );
  });

  it('merges a custom className', () => {
    const { container } = render(
      <SectionShell className="extra-class">
        <span>x</span>
      </SectionShell>,
    );

    expect(container.querySelector('section')?.className).toContain(
      'extra-class',
    );
  });
});

describe('Reveal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders children regardless of visibility state', () => {
    class FakeObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn();
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    render(<Reveal>visible</Reveal>);
    expect(screen.getByText('visible')).toBeInTheDocument();
  });

  it('starts visible when prefers-reduced-motion is enabled', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '',
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    const { container } = render(<Reveal>x</Reveal>);
    expect(container.firstChild).toHaveClass('opacity-100');
  });

  it('becomes visible when the observer reports intersection', () => {
    let trigger: ((entries: IntersectionObserverEntry[]) => void) | null = null;
    class FakeObserver {
      constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
        trigger = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn();
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    const { container } = render(<Reveal>x</Reveal>);
    expect(container.firstChild).toHaveClass('opacity-0');

    act(() => {
      trigger?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(container.firstChild).toHaveClass('opacity-100');
  });

  it('honors the delay prop', () => {
    const { container } = render(<Reveal delay={250}>x</Reveal>);
    const div = container.firstChild as HTMLElement;

    expect(div.style.transitionDelay).toBe('250ms');
  });
});
