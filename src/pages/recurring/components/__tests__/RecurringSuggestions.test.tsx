import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecurringSuggestions } from '@/pages/recurring/components/RecurringSuggestions';

describe('RecurringSuggestions', () => {
  it('offers a retry when dismissed suggestions cannot be loaded', () => {
    const onRetry = vi.fn();

    render(
      <RecurringSuggestions
        suggestions={[]}
        currency="EUR"
        hasError
        onRetry={onRetry}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'common.loadDataFailed',
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.tryAgain' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
