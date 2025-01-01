import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendMagicLink } from "@/lib/auth";
import { CheckCircle2 } from "lucide-react";

type MagicLinkFormProps = {
    onSuccess?: () => void;
};

const MagicLinkForm = ({ onSuccess }: MagicLinkFormProps) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await sendMagicLink(email);
            if (error) throw error;

            setSent(true);
            toast({
                title: "Check your email",
                description: "We sent you a magic link to sign in.",
            });
            onSuccess?.();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send magic link. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                    Magic Link Sent!
                </h3>
                <p className="text-muted-foreground mb-6 px-4">
                    Check your email for the sign in link
                </p>
                <Button
                    variant="outline"
                    onClick={() => setSent(false)}
                    className="min-w-[200px]"
                >
                    Try another email
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-muted-foreground text-sm text-center px-4">
                Enter your email to receive a magic link for secure, password-free sign in
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-10"
                />
                <Button
                    type="submit"
                    className="w-full h-10"
                    disabled={loading}
                >
                    {loading ? "Sending..." : "Send Magic Link"}
                </Button>
            </form>
        </div>
    );
};

export default MagicLinkForm;