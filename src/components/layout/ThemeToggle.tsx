import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Moon, Sun, Sparkles} from "lucide-react";
import {useTheme} from "@/hooks/useTheme";

type Theme = "light" | "dark" | "barbie";

const ThemeToggle: React.FC = () => {
    const {t} = useTranslation();
    const {theme, setTheme} = useTheme();

    const themeIcons: Record<Theme, React.ReactNode> = {
        light: <Sun className="h-4 w-4"/>,
        dark: <Moon className="h-4 w-4"/>,
        barbie: <Sparkles className="h-4 w-4 text-pink-500"/>
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0"
                    aria-label={t("theme.toggle")}
                >
                    {themeIcons[theme as Theme]}
                    <span className="sr-only">{t("theme.toggle")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {(Object.keys(themeIcons) as Theme[]).map((themeName) => (
                    <DropdownMenuItem
                        key={themeName}
                        onClick={() => setTheme(themeName)}
                        className={themeName === "barbie" ? "text-pink-500" : ""}
                    >
                        {themeIcons[themeName]}
                        <span className="ml-2">{t(`theme.${themeName}`)}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ThemeToggle;