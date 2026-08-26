import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { useReceiptScan } from '@/hooks/expenseForm/useReceiptScan';
import type { ExpenseFormData } from '@/lib/validations';

const mockRunReceiptOcr = vi.fn();
const mockCancel = vi.fn();
const mockToast = vi.fn();
const mockOpenUpgrade = vi.fn();
let mockIsPro = true;

vi.mock('@/services/ocrService', () => ({
  runReceiptOcr: (...args: unknown[]) => mockRunReceiptOcr(...args),
  resolveOcrLanguages: () => 'eng',
}));

vi.mock('@/hooks/useIsPro', () => ({
  useIsPro: () => mockIsPro,
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

type HarnessResult = {
  scan: ReturnType<typeof useReceiptScan>;
  form: ReturnType<typeof useForm<ExpenseFormData>>;
};

const receiptFile = new File(['data'], 'receipt.jpg', { type: 'image/jpeg' });

const renderScanHook = (overrides?: Partial<ExpenseFormData>) =>
  renderHook<HarnessResult, undefined>(() => {
    const form = useForm<ExpenseFormData>({
      defaultValues: {
        amount: '',
        description: '',
        category_id: 'none',
        date: new Date(),
        ...overrides,
      },
    });

    return { scan: useReceiptScan({ form, receiptFile }), form };
  });

const mockOcrText = (text: string | null) => {
  mockRunReceiptOcr.mockReturnValue({
    promise: Promise.resolve(text),
    cancel: mockCancel,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPro = true;
  mockOcrText('SUPERMART\nTOTAL 12,50');
});

describe('useReceiptScan', () => {
  it('opens the upgrade dialog for free users without starting a scan', async () => {
    mockIsPro = false;
    const { result } = renderScanHook();

    await act(async () => {
      await result.current.scan.handleScan();
    });

    expect(mockOpenUpgrade).toHaveBeenCalled();
    expect(mockRunReceiptOcr).not.toHaveBeenCalled();
  });

  it('prefills empty amount and description from the receipt', async () => {
    const { result } = renderScanHook();

    await act(async () => {
      await result.current.scan.handleScan();
    });

    expect(result.current.form.getValues('amount')).toBe('12,50');
    expect(result.current.form.getValues('description')).toBe('SUPERMART');
    expect(mockToast).toHaveBeenCalledWith({
      description: 'receipt.scanSuccess',
    });
  });

  it('never overwrites fields the user already filled', async () => {
    const { result } = renderScanHook({ amount: '99,00' });

    await act(async () => {
      await result.current.scan.handleScan();
    });

    expect(result.current.form.getValues('amount')).toBe('99,00');
    expect(result.current.form.getValues('description')).toBe('SUPERMART');
  });

  it('fills the date only when it still sits on the untouched today default', async () => {
    mockOcrText('SHOP\n01/02/2026\nTOTAL 5,00');
    const { result } = renderScanHook();

    await act(async () => {
      await result.current.scan.handleScan();
    });

    const date = result.current.form.getValues('date');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(1);
  });

  it('leaves a user-chosen date alone', async () => {
    mockOcrText('SHOP\n01/02/2026\nTOTAL 5,00');
    const { result } = renderScanHook();
    const chosenDate = new Date(2026, 5, 15);

    act(() => {
      result.current.form.setValue('date', chosenDate, { shouldDirty: true });
    });

    await act(async () => {
      await result.current.scan.handleScan();
    });

    expect(result.current.form.getValues('date').getTime()).toBe(chosenDate.getTime());
  });

  it('shows the no-data toast when nothing could be prefilled', async () => {
    mockOcrText('~~ ## @@ 12');
    const { result } = renderScanHook();

    await act(async () => {
      await result.current.scan.handleScan();
    });

    expect(mockToast).toHaveBeenCalledWith({ description: 'receipt.scanNoData' });
  });

  it('shows a destructive toast when the scan fails', async () => {
    mockRunReceiptOcr.mockReturnValue({
      promise: Promise.reject(new Error('network')),
      cancel: mockCancel,
    });
    const { result } = renderScanHook();

    await act(async () => {
      await result.current.scan.handleScan();
    });

    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      description: 'receipt.scanFailed',
    });
    expect(result.current.scan.isScanning).toBe(false);
  });

  it('stays silent when the scan was cancelled', async () => {
    mockOcrText(null);
    const { result } = renderScanHook();

    await act(async () => {
      await result.current.scan.handleScan();
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(result.current.scan.isScanning).toBe(false);
  });

  it('cancels an in-flight scan on unmount', async () => {
    let resolveText: (text: string | null) => void = () => undefined;
    mockRunReceiptOcr.mockReturnValue({
      promise: new Promise<string | null>((resolve) => {
        resolveText = resolve;
      }),
      cancel: mockCancel.mockImplementation(async () => resolveText(null)),
    });
    const { result, unmount } = renderScanHook();

    act(() => {
      void result.current.scan.handleScan();
    });

    unmount();

    expect(mockCancel).toHaveBeenCalled();
  });
});
