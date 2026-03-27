import { describe, it, expect, vi } from 'vitest';
import { toast as sonnerToast } from 'sonner';
import { toast } from './useToast';

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
});
