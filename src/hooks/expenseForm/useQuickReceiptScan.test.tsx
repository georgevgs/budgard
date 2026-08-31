import type { ChangeEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuickReceiptScan } from '@/hooks/expenseForm/useQuickReceiptScan';
import { todayIso } from '@/lib/dates';

const mockRunReceiptOcr = vi.fn();
const mockCancel = vi.fn();
const mockToast = vi.fn();
const mockOpenUpgrade = vi.fn();
let mockIsPro = true;

vi.mock('@/services/ocrService', () => ({
  runReceiptOcr: (...args: unknown[]) => mockRunReceiptOcr(...args),
  resolveOcrLanguages: () => 'eng',
}));

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPro: mockIsPro }),
}));

vi.mock('@/contexts/UpgradeDialogContext', () => ({
  useUpgradeDialog: () => ({ openUpgrade: mockOpenUpgrade }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
  // The Pro gate toasts through the module-level export, not the hook. Called
  // lazily: this factory is hoisted above `const mockToast`, so referencing it
  // eagerly would throw at import time.
  toast: (...args: unknown[]) => mockToast(...args),
}));

type Props = {
  isOpen: boolean;
  amountIsEmpty: boolean;
  date: string;
  name: string;
};

const setAmount = vi.fn();
const setDate = vi.fn();
const setName = vi.fn();
const receipt = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });

const renderScan = (initial?: Partial<Props>) => {
  const props: Props = {
    isOpen: true,
    amountIsEmpty: true,
    date: todayIso(),
    name: '',
    ...initial,
  };

  return renderHook(
    (current: Props) =>
      useQuickReceiptScan({
        ...current,
        setAmount,
        setDate,
        setName,
      }),
    { initialProps: props },
  );
};

const selectFile = (
  handler: (event: ChangeEvent<HTMLInputElement>) => void,
) => {
  const event = {
    target: { files: [receipt], value: 'receipt.jpg' },
  } as unknown as ChangeEvent<HTMLInputElement>;

  handler(event);
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPro = true;
  mockRunReceiptOcr.mockReturnValue({
    promise: Promise.resolve('SHOP\n01/02/2026\nTOTAL 12,50'),
    cancel: mockCancel,
  });
});

describe('useQuickReceiptScan', () => {
  it('gates camera access for free users', () => {
    mockIsPro = false;
    const { result } = renderScan();

    act(() => result.current.openPicker());

    expect(mockOpenUpgrade).toHaveBeenCalled();
    expect(mockRunReceiptOcr).not.toHaveBeenCalled();
  });

  it('attaches a valid image and fills empty quick-add fields', async () => {
    const { result } = renderScan();

    await act(async () => selectFile(result.current.handleChange));

    expect(setAmount).toHaveBeenCalledWith(12.5);
    expect(setName).toHaveBeenCalledWith('SHOP');
    expect(setDate).toHaveBeenCalledWith('2026-02-01');
    expect(result.current.receiptOptions).toEqual({
      receiptFile: receipt,
      removeExistingReceipt: false,
      existingReceiptPath: null,
    });
  });

  it('does not overwrite a value entered while OCR is running', async () => {
    let resolveText: (text: string) => void = () => undefined;
    mockRunReceiptOcr.mockReturnValue({
      promise: new Promise<string>((resolve) => {
        resolveText = resolve;
      }),
      cancel: mockCancel,
    });
    const { result, rerender } = renderScan();

    act(() => selectFile(result.current.handleChange));
    rerender({
      isOpen: true,
      amountIsEmpty: false,
      date: todayIso(),
      name: 'Already typed',
    });
    await act(async () => resolveText('SHOP\nTOTAL 12,50'));

    expect(setAmount).not.toHaveBeenCalled();
    expect(setName).not.toHaveBeenCalled();
  });

  it('rejects unsupported files before OCR starts', () => {
    const { result } = renderScan();
    const invalid = new File(['text'], 'receipt.txt', { type: 'text/plain' });
    const event = {
      target: { files: [invalid], value: 'receipt.txt' },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => result.current.handleChange(event));

    expect(mockRunReceiptOcr).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      description: 'receipt.invalidType',
    });
  });

  it('cancels work and clears the attachment when Quick Add closes', async () => {
    let resolveText: (text: string | null) => void = () => undefined;
    mockRunReceiptOcr.mockReturnValue({
      promise: new Promise<string | null>((resolve) => {
        resolveText = resolve;
      }),
      cancel: mockCancel.mockImplementation(async () => resolveText(null)),
    });
    const { result, rerender } = renderScan();

    act(() => selectFile(result.current.handleChange));
    rerender({
      isOpen: false,
      amountIsEmpty: true,
      date: todayIso(),
      name: '',
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.receiptFile).toBeNull();
  });
});
