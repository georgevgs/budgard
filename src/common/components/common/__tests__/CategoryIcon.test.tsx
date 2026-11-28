import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CategoryIcon } from '@/common/components/common/CategoryIcon';

const sourceOf = (icon: string): string => {
  const { container } = render(<CategoryIcon icon={icon} />);
  const image = container.querySelector('img');
  if (null === image) {
    throw new Error('CategoryIcon rendered no image');
  }

  return image.getAttribute('src') ?? '';
};

describe('CategoryIcon', () => {
  it('draws a stored category emoji as its 3D object', () => {
    expect(sourceOf('🍔')).toContain('hamburger');
  });

  it('falls back to a label for an emoji outside the set', () => {
    expect(sourceOf('🪴')).toContain('label');
  });

  it('is decorative, never announced or shown as text', () => {
    const { container } = render(<CategoryIcon icon="🍔" />);

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(container).not.toHaveTextContent('🍔');
  });
});
