import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  fileType: 'image/webp' as const,
  useWebWorker: true,
};

const SKIP_COMPRESSION_THRESHOLD = 500 * 1024; // 500KB

export async function compressImage(file: File): Promise<File> {
  if (file.size <= SKIP_COMPRESSION_THRESHOLD) {
    return file;
  }

  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
  return new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
    type: 'image/webp',
  });
}

export async function uploadReceipt(
  file: File,
  userId: string,
  expenseId: string,
): Promise<string> {
  const compressed = await compressImage(file);
  const path = `${userId}/${expenseId}_${Date.now()}.webp`;

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, compressed, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (error) throw error;
  return path;
}

export async function getReceiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600); // 1 hour

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteReceipt(path: string): Promise<void> {
  const { error } = await supabase.storage.from('receipts').remove([path]);

  if (error) throw error;
}
