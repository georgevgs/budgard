import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/services/receiptService', () => ({ getReceiptUrl: vi.fn() }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import ReceiptViewer from './ReceiptViewer';
import { getReceiptUrl } from '@/services/receiptService';

const mockedGetReceiptUrl = vi.mocked(getReceiptUrl);

describe('ReceiptViewer', () => {
  it('does not render content when closed', () => {
    render(
      <ReceiptViewer receiptPath="r.png" open={false} onClose={vi.fn()} />,
    );

    expect(screen.queryByText('receipt.viewReceipt')).not.toBeInTheDocument();
  });

  it('renders the receipt image after a successful fetch', async () => {
    mockedGetReceiptUrl.mockResolvedValueOnce('blob:abc');
    render(
      <ReceiptViewer receiptPath="r.png" open={true} onClose={vi.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByAltText('receipt.receiptImage')).toHaveAttribute(
        'src',
        'blob:abc',
      ),
    );
  });

  it('shows the error state when the fetch rejects', async () => {
    mockedGetReceiptUrl.mockRejectedValueOnce(new Error('boom'));
    render(
      <ReceiptViewer receiptPath="r.png" open={true} onClose={vi.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByText('receipt.loadError')).toBeInTheDocument(),
    );
  });

  it('falls back to the error state when the image fails to load', async () => {
    mockedGetReceiptUrl.mockResolvedValueOnce('blob:bad');
    render(
      <ReceiptViewer receiptPath="r.png" open={true} onClose={vi.fn()} />,
    );

    const img = await screen.findByAltText('receipt.receiptImage');
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.getByText('receipt.loadError')).toBeInTheDocument(),
    );
  });

  it('revokes the object url when closed after loading', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    mockedGetReceiptUrl.mockResolvedValueOnce('blob:abc');

    const { rerender } = render(
      <ReceiptViewer receiptPath="r.png" open={true} onClose={vi.fn()} />,
    );
    await screen.findByAltText('receipt.receiptImage');

    rerender(
      <ReceiptViewer receiptPath="r.png" open={false} onClose={vi.fn()} />,
    );

    expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
    expect(screen.queryByAltText('receipt.receiptImage')).not.toBeInTheDocument();
  });
});
