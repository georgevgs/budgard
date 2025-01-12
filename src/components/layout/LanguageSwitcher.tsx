import {useTranslation} from "react-i18next";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Languages} from "lucide-react";

const languages = {
    en: "English",
    el: "Ελληνικά",
};

const LanguageSwitcher = () => {
    const {i18n} = useTranslation();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <Languages className="h-4 w-4"/>
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {Object.entries(languages).map(([code, name]) => (
                    <DropdownMenuItem
                        key={code}
                        onClick={() => i18n.changeLanguage(code)}
                        className={i18n.language === code ? "bg-accent" : ""}
                    >
                        {name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSwitcher;