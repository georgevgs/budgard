import {Button} from "@/components/ui/button";
import {signOut} from "@/lib/auth";
import {LogOut, Moon, Sun, Sparkles} from "lucide-react";
import {useAuth} from "@/contexts/AuthContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useTheme} from "@/hooks/useTheme";

const Header = () => {
    const {session} = useAuth();
    const {theme, setTheme} = useTheme();

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
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                {theme === "light" && <Sun className="h-4 w-4"/>}
                                {theme === "dark" && <Moon className="h-4 w-4"/>}
                                {theme === "barbie" && <Sparkles className="h-4 w-4 text-pink-500"/>}
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                                <Sun className="h-4 w-4 mr-2"/>
                                Light
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                <Moon className="h-4 w-4 mr-2"/>
                                Dark
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("barbie")} className="text-pink-500">
                                <Sparkles className="h-4 w-4 mr-2"/>
                                Barbie
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-muted-foreground gap-2 font-normal"
                    >
                        <LogOut className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </header>
    );
};

export default Header;