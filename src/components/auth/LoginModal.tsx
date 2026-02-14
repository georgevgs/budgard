import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import OtpForm from '@/components/auth/OtpForm';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LoginModal = ({ open, onOpenChange }: LoginModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[425px] p-0 gap-0" onOpenChange={onOpenChange}>
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <div className="px-6 pb-6 pt-2 sm:pt-6">
        <DialogHeader data-draggable-area>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to your account using email verification
          </DialogDescription>
        </DialogHeader>
        <OtpForm onSuccess={() => onOpenChange(false)} />
      </div>
    </DialogContent>
  </Dialog>
);

export default LoginModal;
