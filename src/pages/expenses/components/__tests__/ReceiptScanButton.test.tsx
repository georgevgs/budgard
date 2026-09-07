import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReceiptScanButton } from '@/pages/expenses/components/ReceiptScanButton';
import type { UseReceiptScanReturn } from '@/pages/expenses/hooks/useReceiptScan';

const makeScan = (
  overrides?: Partial<UseReceiptScanReturn>,
): UseReceiptScanReturn => ({
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
  it('renders nothing when not isVisible', () => {
    const { container } = render(
      <ReceiptScanButton scan={makeScan()} isVisible={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('fires handleScan on click when idle', () => {
    const scan = makeScan();
    render(<ReceiptScanButton scan={scan} isVisible={true} />);

    fireEvent.click(
      screen.getByRole('button', { name: /receipt\.scanReceipt/ }),
    );

    expect(scan.handleScan).toHaveBeenCalled();
  });

  it('shows progress and a working cancel button while scanning', () => {
    const scan = makeScan({ isScanning: true, progress: 42 });
    render(<ReceiptScanButton scan={scan} isVisible={true} />);

    expect(screen.getByText(/42%/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'receipt.cancelScan' }));

    expect(scan.handleCancel).toHaveBeenCalled();
  });
});
