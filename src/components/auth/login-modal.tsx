import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MagicLinkForm from "./magic-link-form";

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LoginModal = ({ open, onOpenChange }: LoginModalProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-lg">
            <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
        </DialogHeader>
        <MagicLinkForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
);

export default LoginModal;