import { describe, it, expect, vi } from 'vitest';
import { toast as sonnerToast } from 'sonner';
import { toast } from '@/common/hooks/useToast';

vi.mock('sonner', () => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };
  fn.error = vi.fn();
  fn.success = vi.fn();

  return { toast: fn };
});

describe('toast', () => {
  it('calls sonner for default variant', () => {
    toast({ title: 'Hello' });
    expect(sonnerToast).toHaveBeenCalledWith('Hello', expect.any(Object));
  });

  it('calls sonner.error for destructive variant', () => {
    toast({ variant: 'destructive', title: 'Error!' });
    expect(sonnerToast.error).toHaveBeenCalledWith(
      'Error!',
      expect.any(Object),
    );
  });

  it('calls sonner.success for success variant', () => {
    toast({ variant: 'success', title: 'Done' });
    expect(sonnerToast.success).toHaveBeenCalledWith(
      'Done',
      expect.any(Object),
    );
  });

  it('passes description as option when both title and description provided', () => {
    toast({ title: 'Title', description: 'Details' });
    expect(sonnerToast).toHaveBeenCalledWith(
      'Title',
      expect.objectContaining({ description: 'Details' }),
    );
  });

  it('uses description as message when no title', () => {
    toast({ description: 'Only desc' });
    expect(sonnerToast).toHaveBeenCalledWith('Only desc', expect.any(Object));
  });

  it('sets 8 second duration for action toasts', () => {
    toast({ title: 'Update', action: { label: 'Undo', onClick: vi.fn() } });
    expect(sonnerToast).toHaveBeenCalledWith(
      'Update',
      expect.objectContaining({ duration: 8000 }),
    );
  });

  it('respects explicit duration over action default', () => {
    toast({
      title: 'Quick',
      duration: 2000,
      action: { label: 'Go', onClick: vi.fn() },
    });
    expect(sonnerToast).toHaveBeenCalledWith(
      'Quick',
      expect.objectContaining({ duration: 2000 }),
    );
  });

  // The old 3s global default cleared a two-line toast before it could be
  // read — the 80% budget warning, "saved offline, will sync".
  it('gives a toast time to be read', () => {
    toast({ title: 'Saved' });
    expect(sonnerToast).toHaveBeenLastCalledWith(
      'Saved',
      expect.objectContaining({ duration: 4000 }),
    );

    toast({ title: 'Saved offline', description: 'Will sync later' });
    expect(sonnerToast).toHaveBeenLastCalledWith(
      'Saved offline',
      expect.objectContaining({ duration: 6000 }),
    );
  });

  it('gives an error a visible close button', () => {
    toast({ variant: 'destructive', title: 'Failed' });
    expect(sonnerToast.error).toHaveBeenLastCalledWith(
      'Failed',
      expect.objectContaining({ closeButton: true, duration: 8000 }),
    );
  });

  // Both refreshes failing on one bad connection used to stack two identical
  // "Could not refresh" toasts. The same failure now updates one.
  it('files a repeated error under one id', () => {
    toast({ variant: 'destructive', title: 'Error', description: 'Refresh' });
    toast({ variant: 'destructive', title: 'Error', description: 'Refresh' });

    const [first, second] = vi
      .mocked(sonnerToast.error)
      .mock.calls.slice(-2)
      .map(([, options]) => options?.id);
    expect(first).toBeDefined();
    expect(first).toBe(second);
  });

  it('keeps an id the caller chose', () => {
    toast({ variant: 'destructive', title: 'Update', id: 'pwa-update' });
    expect(sonnerToast.error).toHaveBeenLastCalledWith(
      'Update',
      expect.objectContaining({ id: 'pwa-update' }),
    );
  });
});
