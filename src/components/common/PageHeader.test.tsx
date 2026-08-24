import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PageHeader from '@/components/common/PageHeader';

describe('PageHeader', () => {
  it('wraps around long translated titles without clipping a word', () => {
    render(
      <MemoryRouter initialEntries={['/recurring']}>
        <PageHeader
          title="Επαναλαμβανόμενα έξοδα"
          action={<button type="button">Add</button>}
        />
      </MemoryRouter>,
    );

    const title = screen.getByRole('heading', {
      name: 'Επαναλαμβανόμενα έξοδα',
    });
    const header = title.parentElement?.parentElement;
    const action = screen.getByRole('button', { name: 'Add' }).parentElement;

    expect(header).toHaveClass('flex-wrap');
    expect(title.parentElement).toHaveClass('min-w-min');
    expect(action).toHaveClass('ml-auto', 'shrink-0');
    expect(title).not.toHaveClass('truncate');
  });
});
