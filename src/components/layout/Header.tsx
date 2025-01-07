import {Button} from "@/components/ui/button";
import {signOut} from "@/lib/auth";
import {LogOut} from "lucide-react";
import {useAuth} from "@/contexts/AuthContext";

const Header = () => {
    const {session} = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (!session) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <img
                        src="/icon-512x512.png"
                        alt="Budgard Logo"
                        className="h-7 w-7"
                        style={{objectFit: "contain"}}
                    />
                    <span className="text-lg font-semibold tracking-tight">
                        Budgard
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-muted-foreground gap-2 font-normal"
                >
                    <LogOut className="h-4 w-4"/>
                </Button>
            </div>
        </header>
    );
};

export default Header;