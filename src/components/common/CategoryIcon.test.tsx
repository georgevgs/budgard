import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import CategoryIcon from '@/components/common/CategoryIcon';

describe('CategoryIcon', () => {
  it('renders a semantic SVG for a stored category emoji', () => {
    const { container } = render(<CategoryIcon icon="🍔" />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container).not.toHaveTextContent('🍔');
  });

  it('renders a stable SVG fallback for a custom icon', () => {
    const { container } = render(<CategoryIcon icon="🪴" />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container).not.toHaveTextContent('🪴');
  });
});
