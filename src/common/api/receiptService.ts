import { supabase } from '@/config/supabase';
import compressionWorkerUrl from 'browser-image-compression/dist/browser-image-compression.js?url';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  fileType: 'image/webp' as const,
  useWebWorker: true,
};

const SKIP_COMPRESSION_THRESHOLD = 500 * 1024; // 500KB

export const compressImage = async (file: File): Promise<File> => {
  // Lazy import: the compression lib (~55 KB min) is only needed when a
  // receipt is actually attached, so keep it out of the ExpensesList chunk.
  const { default: imageCompression } =
    await import('browser-image-compression');

  let options = COMPRESSION_OPTIONS;
  if (file.size <= SKIP_COMPRESSION_THRESHOLD) {
    options = { ...COMPRESSION_OPTIONS, maxSizeMB: Infinity };
  }

  const compressed = await imageCompression(file, {
    ...options,
    // The library's default points at a CDN. A hashed local asset keeps the
    // worker compatible with our CSP, versioned updates and offline cache.
    libURL: new URL(compressionWorkerUrl, window.location.href).href,
  });

  return new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
    type: 'image/webp',
  });
};

export const uploadReceipt = async (
  file: File,
  userId: string,
  expenseId: string,
): Promise<string> => {
  const compressed = await compressImage(file);
  const path = `${userId}/${expenseId}_${Date.now()}.webp`;

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, compressed, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return path;
};

export const getReceiptUrl = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('receipts')
    .download(path);

  if (error) {
    throw error;
  }

  return URL.createObjectURL(data);
};

export const deleteReceipt = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from('receipts').remove([path]);

  if (error) {
    throw error;
  }
};
