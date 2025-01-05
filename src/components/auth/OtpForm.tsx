import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signInWithOTP, requestOTP } from "@/lib/auth";
import { CheckCircle2 } from "lucide-react";
import { InputOTP,  InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";

type OtpFormProps = {
    onSuccess?: () => void;
};

const OtpForm = ({ onSuccess }: OtpFormProps) => {
    const [email, setEmail] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        try {
            const { error } = await requestOTP(email);
            if (error) throw error;

            setOtpSent(true);
            toast({
                title: "Code Sent",
                description: "Check your email for the 6-digit code.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send verification code. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || otp.length !== 6) return;

        setLoading(true);
        try {
            const { error } = await signInWithOTP(email, otp);
            if (error) throw error;

            toast({
                title: "Success",
                description: "Successfully signed in!",
            });
            onSuccess?.();
        } catch (error) {
            toast({
                title: "Error",
                description: "Invalid verification code. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!otpSent) {
        return (
            <div className="space-y-4">
                <form onSubmit={handleRequestOTP} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full h-10"
                        disabled={loading}
                    />
                    <Button
                        type="submit"
                        className="w-full h-10"
                        disabled={loading}
                    >
                        {loading ? "Sending..." : "Send Code"}
                    </Button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <p className="text-muted-foreground text-sm text-center px-4">
                    Enter the 6-digit code sent to {email}
                </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex justify-center">
                    <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={loading}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>

                <div className="space-y-2">
                    <Button
                        type="submit"
                        className="w-full h-10"
                        disabled={loading || otp.length !== 6}
                    >
                        {loading ? "Verifying..." : "Verify Code"}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-10"
                        onClick={() => {
                            setOtpSent(false);
                            setOtp("");
                        }}
                        disabled={loading}
                    >
                        Use Different Email
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default OtpForm;