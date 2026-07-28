// Client-side receipt OCR via Tesseract.js. The runtime is heavy (~4 MB wasm
// core + traineddata), so everything loads lazily on first scan: the JS entry
// through a dynamic import, worker/core/traineddata over HTTP from the
// self-hosted /ocr/ path (service-worker cached after first use; traineddata
// is additionally cached in IndexedDB by tesseract itself).

import type { Worker as TesseractWorker } from 'tesseract.js';

export type OcrRunHandle = {
  promise: Promise<string | null>;
  cancel: () => Promise<void>;
};

const OCR_LANG_PATH = '/ocr/tessdata';
const OEM_LSTM_ONLY = 1;

export const resolveOcrLanguages = (appLanguage: string): string => {
  if (appLanguage.startsWith('el')) {
    return 'ell+eng';
  }

  return 'eng';
};

// Maps tesseract logger events onto one 0-100 scale: the setup stages share
// 0-30, recognition fills 30-100. Unknown statuses return null (ignored).
const STAGE_RANGES = [
  { status: 'loading tesseract core', from: 0, to: 10 },
  { status: 'initializing tesseract', from: 10, to: 15 },
  { status: 'loading language traineddata', from: 15, to: 25 },
  { status: 'initializing api', from: 25, to: 30 },
  { status: 'recognizing text', from: 30, to: 100 },
];

export const mapOcrProgress = (status: string, progress: number): number | null => {
  const stage = STAGE_RANGES.find((entry) => entry.status === status);

  if (!stage) {
    return null;
  }

  const clamped = Math.min(Math.max(progress, 0), 1);

  return Math.round(stage.from + (stage.to - stage.from) * clamped);
};

export const runReceiptOcr = (
  file: File,
  languages: string,
  onProgress: (percent: number) => void,
): OcrRunHandle => {
  let cancelled = false;
  let workerRef: TesseractWorker | null = null;

  const cancel = async (): Promise<void> => {
    cancelled = true;
    const worker = workerRef;
    workerRef = null;

    if (worker) {
      await worker.terminate().catch(swallow);
    }
  };

  const promise = (async (): Promise<string | null> => {
    try {
      const { createWorker } = await import('tesseract.js');

      if (cancelled) {
        return null;
      }

      const worker = await createWorker(languages, OEM_LSTM_ONLY, {
        workerPath: `${__OCR_ASSET_BASE__}/worker.min.js`,
        corePath: __OCR_ASSET_BASE__,
        langPath: OCR_LANG_PATH,
        logger: (message) => {
          const percent = mapOcrProgress(message.status, message.progress);

          if (percent !== null) {
            onProgress(percent);
          }
        },
      });
      workerRef = worker;

      // cancel() fired while the worker was still being created misses it —
      // catch up here.
      if (cancelled) {
        workerRef = null;
        await worker.terminate().catch(swallow);

        return null;
      }

      try {
        const image = await normalizeImage(file);
        const result = await worker.recognize(image);

        if (cancelled) {
          return null;
        }

        return result.data.text;
      } finally {
        workerRef = null;
        await worker.terminate().catch(swallow);
      }
    } catch (error) {
      if (cancelled) {
        return null;
      }

      throw error;
    }
  })();

  return { promise, cancel };
};

// --- Helpers ---

// Re-encodes the image to a bounded JPEG before recognition: Leptonica inside
// the wasm core cannot decode WebP/HEIC, and a full-resolution phone photo
// (~50 MB decoded) can exhaust the wasm heap on low-end devices. Any failure
// falls back to the original file — JPEG/PNG receipts work natively.
const MAX_OCR_DIMENSION = 2200;

const normalizeImage = async (file: File): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_OCR_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      bitmap.close();

      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    if (!blob) {
      return file;
    }

    return blob;
  } catch {
    return file;
  }
};

const swallow = (): undefined => undefined;
