import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";

const Header = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="container flex h-14 items-center justify-between px-4">
                <h1 className="text-lg font-semibold tracking-tight">
                    Budgard
                </h1>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="text-muted-foreground gap-2 font-normal"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </Button>
            </div>
        </header>
    );
};

export default Header;