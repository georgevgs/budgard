import {useTranslation} from "react-i18next";
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
import {useEffect, useState} from "react";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
    const {session} = useAuth();
    const [theme, setTheme] = useState("light");
    const {t} = useTranslation();

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute("data-theme", theme);

        // Handle dark mode class
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    }, [theme]);

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
                        alt={t("common.logoAlt")}
                        className="h-7 w-7"
                        style={{objectFit: "contain"}}
                    />
                    <span className="text-lg font-semibold tracking-tight">
                        Budgard
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <LanguageSwitcher/>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                {theme === "light" && <Sun className="h-4 w-4"/>}
                                {theme === "dark" && <Moon className="h-4 w-4"/>}
                                {theme === "barbie" && <Sparkles className="h-4 w-4 text-pink-500"/>}
                                <span className="sr-only">{t("common.toggleTheme")}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                                <Sun className="h-4 w-4 mr-2"/>
                                {t("theme.light")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                <Moon className="h-4 w-4 mr-2"/>
                                {t("theme.dark")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("barbie")} className="text-pink-500">
                                <Sparkles className="h-4 w-4 mr-2"/>
                                {t("theme.barbie")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-muted-foreground gap-2 font-normal"
                        aria-label={t("auth.signOut")}
                    >
                        <LogOut className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </header>
    );
};

export default Header;