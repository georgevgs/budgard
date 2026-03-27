import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import {
  compressImage,
  uploadReceipt,
  getReceiptUrl,
  deleteReceipt,
} from './receiptService';

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File) => file),
}));

describe('compressImage', () => {
  it('returns a webp file with correct name', async () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await compressImage(file);
    expect(result.name).toBe('photo.webp');
    expect(result.type).toBe('image/webp');
  });

  it('keeps original name when no extension to replace', async () => {
    const file = new File(['data'], 'photo', { type: 'image/jpeg' });
    const result = await compressImage(file);
    // The regex only replaces if there's a dot+extension
    expect(result.name).toBe('photo');
    expect(result.type).toBe('image/webp');
  });
});

describe('uploadReceipt', () => {
  it('uploads compressed image and returns path', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
    } as never);

    vi.spyOn(Date, 'now').mockReturnValue(1000);

    const file = new File(['data'], 'receipt.jpg', { type: 'image/jpeg' });
    const path = await uploadReceipt(file, 'user-1', 'exp-1');

    expect(path).toBe('user-1/exp-1_1000.webp');
    expect(supabase.storage.from).toHaveBeenCalledWith('receipts');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/exp-1_1000.webp',
      expect.any(File),
      { contentType: 'image/webp', upsert: false },
    );
  });

  it('throws on upload error', async () => {
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: 'storage full' } }),
    } as never);

    const file = new File(['data'], 'receipt.jpg', { type: 'image/jpeg' });
    await expect(uploadReceipt(file, 'user-1', 'exp-1')).rejects.toEqual({
      message: 'storage full',
    });
  });
});

describe('getReceiptUrl', () => {
  it('downloads blob and creates object URL', async () => {
    const blob = new Blob(['image data']);
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: vi.fn().mockResolvedValue({ data: blob, error: null }),
    } as never);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');

    const url = await getReceiptUrl('user-1/receipt.webp');
    expect(url).toBe('blob:url');
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('throws on download error', async () => {
    vi.mocked(supabase.storage.from).mockReturnValue({
      download: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'not found' } }),
    } as never);

    await expect(getReceiptUrl('bad-path')).rejects.toEqual({
      message: 'not found',
    });
  });
});

describe('deleteReceipt', () => {
  it('removes file from storage', async () => {
    const mockRemove = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      remove: mockRemove,
    } as never);

    await deleteReceipt('user-1/receipt.webp');
    expect(mockRemove).toHaveBeenCalledWith(['user-1/receipt.webp']);
  });

  it('throws on delete error', async () => {
    vi.mocked(supabase.storage.from).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: { message: 'forbidden' } }),
    } as never);

    await expect(deleteReceipt('path')).rejects.toEqual({
      message: 'forbidden',
    });
  });
});
