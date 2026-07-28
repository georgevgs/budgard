import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReceiptScanButton from '@/components/expenses/ReceiptScanButton';
import type { ReceiptScanApi } from '@/hooks/expenseForm/useReceiptScan';

const makeScan = (overrides?: Partial<ReceiptScanApi>): ReceiptScanApi => ({
  isScanning: false,
  progress: 0,
  handleScan: vi.fn(),
  handleCancel: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReceiptScanButton', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<ReceiptScanButton scan={makeScan()} visible={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('fires handleScan on click when idle', () => {
    const scan = makeScan();
    render(<ReceiptScanButton scan={scan} visible={true} />);

    fireEvent.click(screen.getByRole('button', { name: /receipt\.scanReceipt/ }));

    expect(scan.handleScan).toHaveBeenCalled();
  });

  it('shows progress and a working cancel button while scanning', () => {
    const scan = makeScan({ isScanning: true, progress: 42 });
    render(<ReceiptScanButton scan={scan} visible={true} />);

    expect(screen.getByText(/42%/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'receipt.cancelScan' }));

    expect(scan.handleCancel).toHaveBeenCalled();
  });
});
