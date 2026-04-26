import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CategorySparkline from './CategorySparkline';

describe('CategorySparkline', () => {
  it('renders a placeholder div when all values are zero', () => {
    const { container } = render(
      <CategorySparkline values={[0, 0, 0]} color="#22c55e" />,
    );

    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders an svg path for non-zero values', () => {
    const { container } = render(
      <CategorySparkline values={[10, 20, 30]} color="#22c55e" />,
    );

    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('stroke')).toBe('#22c55e');
  });

  it('trims trailing zeros and only plots up to the last non-zero', () => {
    const { container } = render(
      <CategorySparkline values={[10, 20, 30, 0, 0]} color="#000" />,
    );

    const d = container.querySelector('path')?.getAttribute('d') ?? '';
    expect(d.split('L').length).toBe(3);
  });

  it('starts the path with an M command', () => {
    const { container } = render(
      <CategorySparkline values={[5, 10]} color="#000" />,
    );

    const d = container.querySelector('path')?.getAttribute('d') ?? '';
    expect(d.startsWith('M')).toBe(true);
  });

  it('uses fixed width and height', () => {
    const { container } = render(
      <CategorySparkline values={[1, 2, 3]} color="#000" />,
    );
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('28');
  });

  it('renders placeholder for empty values', () => {
    const { container } = render(<CategorySparkline values={[]} color="#000" />);

    expect(container.querySelector('svg')).toBeNull();
  });
});
