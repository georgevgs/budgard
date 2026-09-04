import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapOcrProgress,
  resolveOcrLanguages,
  runReceiptOcr,
} from '@/services/ocrService';

const mockRecognize = vi.fn();
const mockTerminate = vi.fn();
const mockCreateWorker = vi.fn();

vi.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockCreateWorker(...args),
}));

const makeFile = (): File =>
  new File(['data'], 'receipt.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  mockRecognize.mockResolvedValue({ data: { text: 'TOTAL 9.99' } });
  mockTerminate.mockResolvedValue(undefined);
  mockCreateWorker.mockResolvedValue({
    recognize: mockRecognize,
    terminate: mockTerminate,
  });
  // jsdom has no createImageBitmap — normalization falls back to the original file
  vi.stubGlobal('createImageBitmap', undefined);
});

describe('resolveOcrLanguages', () => {
  it('returns ell+eng for Greek app languages', () => {
    expect(resolveOcrLanguages('el')).toBe('ell+eng');
    expect(resolveOcrLanguages('el-GR')).toBe('ell+eng');
  });

  it('returns eng for everything else', () => {
    expect(resolveOcrLanguages('en')).toBe('eng');
    expect(resolveOcrLanguages('de')).toBe('eng');
  });
});

describe('mapOcrProgress', () => {
  it('maps setup stages into the 0-30 band', () => {
    expect(mapOcrProgress('loading tesseract core', 0)).toBe(0);
    expect(mapOcrProgress('loading tesseract core', 1)).toBe(10);
    expect(mapOcrProgress('loading language traineddata', 0.5)).toBe(20);
    expect(mapOcrProgress('initializing api', 1)).toBe(30);
  });

  it('maps recognition into the 30-100 band', () => {
    expect(mapOcrProgress('recognizing text', 0)).toBe(30);
    expect(mapOcrProgress('recognizing text', 0.5)).toBe(65);
    expect(mapOcrProgress('recognizing text', 1)).toBe(100);
  });

  it('ignores unknown statuses and clamps out-of-range progress', () => {
    expect(mapOcrProgress('something else', 0.5)).toBeNull();
    expect(mapOcrProgress('recognizing text', 2)).toBe(100);
    expect(mapOcrProgress('recognizing text', -1)).toBe(30);
  });
});

describe('runReceiptOcr', () => {
  it('creates a worker pointing at the self-hosted assets and returns the text', async () => {
    const handle = runReceiptOcr(makeFile(), 'eng', vi.fn());

    await expect(handle.promise).resolves.toBe('TOTAL 9.99');

    expect(mockCreateWorker).toHaveBeenCalledWith(
      'eng',
      1,
      expect.objectContaining({
        workerPath: `${__OCR_ASSET_BASE__}/worker.min.js`,
        corePath: __OCR_ASSET_BASE__,
        langPath: '/ocr/tessdata',
        logger: expect.any(Function),
      }),
    );
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  it('forwards mapped progress from the tesseract logger', async () => {
    const onProgress = vi.fn();
    const handle = runReceiptOcr(makeFile(), 'eng', onProgress);
    await handle.promise;

    const { logger } = mockCreateWorker.mock.calls[0][2] as {
      logger: (message: { status: string; progress: number }) => void;
    };
    logger({ status: 'recognizing text', progress: 0.5 });
    logger({ status: 'unknown', progress: 0.5 });

    expect(onProgress).toHaveBeenCalledWith(65);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('terminates the worker when recognition fails and rethrows', async () => {
    mockRecognize.mockRejectedValue(new Error('decode failed'));

    const handle = runReceiptOcr(makeFile(), 'eng', vi.fn());

    await expect(handle.promise).rejects.toThrow('decode failed');
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  it('resolves null when cancelled mid-recognition', async () => {
    let resolveRecognize: (value: { data: { text: string } }) => void = () =>
      undefined;
    mockRecognize.mockReturnValue(
      new Promise((resolve) => {
        resolveRecognize = resolve;
      }),
    );

    const handle = runReceiptOcr(makeFile(), 'eng', vi.fn());
    await vi.waitFor(() => expect(mockRecognize).toHaveBeenCalled());

    await handle.cancel();
    resolveRecognize({ data: { text: 'ignored' } });

    await expect(handle.promise).resolves.toBeNull();
    expect(mockTerminate).toHaveBeenCalled();
  });

  it('resolves null when cancelled while the worker is still being created', async () => {
    let resolveWorker: (worker: unknown) => void = () => undefined;
    mockCreateWorker.mockReturnValue(
      new Promise((resolve) => {
        resolveWorker = resolve;
      }),
    );

    const handle = runReceiptOcr(makeFile(), 'eng', vi.fn());
    await vi.waitFor(() => expect(mockCreateWorker).toHaveBeenCalled());

    await handle.cancel();
    resolveWorker({ recognize: mockRecognize, terminate: mockTerminate });

    await expect(handle.promise).resolves.toBeNull();
    expect(mockRecognize).not.toHaveBeenCalled();
    expect(mockTerminate).toHaveBeenCalled();
  });

  it('resolves null instead of rejecting when cancellation races an error', async () => {
    mockRecognize.mockImplementation(async () => {
      await handle.cancel();
      throw new Error('terminated');
    });

    const handle = runReceiptOcr(makeFile(), 'eng', vi.fn());

    await expect(handle.promise).resolves.toBeNull();
  });
});
