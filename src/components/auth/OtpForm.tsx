import {useState, useRef, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useToast} from "@/hooks/useToast";
import {signInWithOTP, requestOTP} from "@/lib/auth";
import {CheckCircle2} from "lucide-react";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {useAuth} from "@/contexts/AuthContext";
import {useTurnstile} from "@/hooks/useTurnstile";
import {emailSchema} from "@/lib/validations";

// Constants for rate limiting
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

type OtpFormProps = {
    onSuccess?: () => void;
};

const OtpForm = ({onSuccess}: OtpFormProps) => {
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const {toast} = useToast();
    const {isLoading: isAuthLoading} = useAuth();

    const {
        token,
        renderTurnstile,
        reset: resetTurnstile,
        isLoading: isTurnstileLoading,
        isExpired: isTurnstileExpired,
        getToken
    } = useTurnstile(TURNSTILE_SITE_KEY);

    // Initialize Turnstile
    useEffect(() => {
        if (turnstileRef.current && !isTurnstileLoading && !otpSent) {
            renderTurnstile(turnstileRef.current);
        }
    }, [renderTurnstile, isTurnstileLoading, otpSent]);

    const checkRateLimit = (): boolean => {
        const attempts = parseInt(localStorage.getItem("otpAttempts") || "0");
        const lastAttempt = localStorage.getItem("lastOtpAttempt");

        if (attempts >= MAX_ATTEMPTS && lastAttempt) {
            const timeLeft = LOCKOUT_TIME - (Date.now() - parseInt(lastAttempt));
            if (timeLeft > 0) {
                toast({
                    title: "Too many attempts",
                    description: `Please try again in ${Math.ceil(timeLeft / 60000)} minutes`,
                    variant: "destructive",
                });
                return false;
            }
            // Reset after lockout period
            localStorage.setItem("otpAttempts", "0");
        }
        return true;
    };

    const updateRateLimit = () => {
        const attempts = parseInt(localStorage.getItem("otpAttempts") || "0");
        localStorage.setItem("otpAttempts", (attempts + 1).toString());
        localStorage.setItem("lastOtpAttempt", Date.now().toString());
    };

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isAuthLoading) return;

        // Validate email
        try {
            emailSchema.parse(email);
            setEmailError("");
        } catch (error) {
            setEmailError((error as Error).message);
            return;
        }

        // Check Turnstile
        if (isTurnstileExpired()) {
            toast({
                title: "Security check expired",
                description: "Please complete the security check again",
                variant: "destructive",
            });
            resetTurnstile();
            return;
        }

        const currentToken = getToken();
        if (!currentToken) {
            toast({
                title: "Security check required",
                description: "Please complete the security check",
                variant: "destructive",
            });
            return;
        }

        // Check rate limiting
        if (!checkRateLimit()) return;

        setLoading(true);
        try {
            const {error} = await requestOTP(email);
            if (error) throw error;

            updateRateLimit();
            setOtpSent(true);
            resetTurnstile();

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
            resetTurnstile();
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || isAuthLoading || otp.length !== 6) return;

        setLoading(true);
        try {
            const {error} = await signInWithOTP(email, otp);
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
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full h-10 ${emailError ? "border-destructive" : ""}`}
                            disabled={loading || isAuthLoading}
                            aria-label="Email address"
                            aria-invalid={!!emailError}
                            aria-describedby={emailError ? "email-error" : undefined}
                        />
                        {emailError && (
                            <p
                                id="email-error"
                                className="text-sm text-destructive"
                            >
                                {emailError}
                            </p>
                        )}
                    </div>

                    <div
                        ref={turnstileRef}
                        className="flex justify-center"
                        aria-label="Security challenge"
                    />

                    <Button
                        type="submit"
                        className="w-full h-10"
                        disabled={loading || isAuthLoading || !token}
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
                <CheckCircle2 className="h-8 w-8 text-primary"/>
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
                        disabled={loading || isAuthLoading}
                        pattern="\d{6}"
                        inputMode="numeric"
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0}/>
                            <InputOTPSlot index={1}/>
                            <InputOTPSlot index={2}/>
                            <InputOTPSlot index={3}/>
                            <InputOTPSlot index={4}/>
                            <InputOTPSlot index={5}/>
                        </InputOTPGroup>
                    </InputOTP>
                </div>

                <div className="space-y-2">
                    <Button
                        type="submit"
                        className="w-full h-10"
                        disabled={loading || isAuthLoading || otp.length !== 6}
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
                        disabled={loading || isAuthLoading}
                    >
                        Use Different Email
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default OtpForm;