import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeviceFrame from './DeviceFrame';

describe('DeviceFrame', () => {
  it('renders children inside the frame', () => {
    render(
      <DeviceFrame>
        <span>screen content</span>
      </DeviceFrame>,
    );

    expect(screen.getByText('screen content')).toBeInTheDocument();
  });

  it('renders the glow layer by default', () => {
    const { container } = render(
      <DeviceFrame>
        <span>x</span>
      </DeviceFrame>,
    );

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('omits the glow layer when glow is false', () => {
    const { container } = render(
      <DeviceFrame glow={false}>
        <span>x</span>
      </DeviceFrame>,
    );

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('merges a custom className onto the root', () => {
    const { container } = render(
      <DeviceFrame className="extra-frame">
        <span>x</span>
      </DeviceFrame>,
    );

    expect((container.firstChild as HTMLElement).className).toContain(
      'extra-frame',
    );
  });
});
