import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuickReceiptScanAction from '@/components/expenses/QuickReceiptScanAction';
import type { QuickReceiptScanApi } from '@/hooks/expenseForm/useQuickReceiptScan';

const makeScan = (
  overrides?: Partial<QuickReceiptScanApi>,
): QuickReceiptScanApi => ({
  receiptFile: null,
  isScanning: false,
  progress: 0,
  receiptOptions: undefined,
  openPicker: vi.fn(),
  handleChange: vi.fn(),
  cancel: vi.fn(),
  ...overrides,
});

describe('QuickReceiptScanAction', () => {
  it('keeps the idle action icon-only and opens the receipt picker', () => {
    const scan = makeScan();
    render(<QuickReceiptScanAction scan={scan} />);

    const button = screen.getByRole('button', {
      name: 'receipt.scanReceipt',
    });
    expect(button.textContent).toBe('');

    fireEvent.click(button);

    expect(scan.openPicker).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('changes its accessible label when a receipt is attached', () => {
    const receipt = new File(['receipt'], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    render(
      <QuickReceiptScanAction scan={makeScan({ receiptFile: receipt })} />,
    );

    expect(
      screen.getByRole('button', { name: 'receipt.changeReceipt' }),
    ).toBeInTheDocument();
  });

  it('shows progress and keeps cancel available while scanning', () => {
    const scan = makeScan({ isScanning: true, progress: 42 });
    render(<QuickReceiptScanAction scan={scan} />);

    expect(screen.getByText('42%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'receipt.cancelScan' }));

    expect(scan.cancel).toHaveBeenCalled();
  });
});
