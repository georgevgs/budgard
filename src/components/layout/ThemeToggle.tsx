import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Moon, Sun, Sparkles} from "lucide-react";
import {useTheme} from "@/hooks/useTheme";

const ThemeToggle = () => {
    const {theme, setTheme} = useTheme();

    return (
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
    );
};

export default ThemeToggle;