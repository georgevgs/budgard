import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import OtpForm from "@/components/auth/OtpForm.tsx";

type LoginModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const LoginModal = ({ open, onOpenChange }: LoginModalProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-lg">
            <DialogHeader>
                <DialogTitle>Sign In</DialogTitle>
                <DialogDescription>
                    Sign in to your account using email verification
                </DialogDescription>
            </DialogHeader>
            <OtpForm onSuccess={() => onOpenChange(false)} />
        </DialogContent>
    </Dialog>
);

export default LoginModal;