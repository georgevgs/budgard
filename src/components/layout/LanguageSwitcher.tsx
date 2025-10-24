import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

const languages = {
  en: "English",
  el: "Ελληνικά",
};

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languages).map(([code, name]) =>
          renderLanguageItem(code, name, i18n)
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const renderLanguageItem = (
  code: string,
  name: string,
  i18n: { language: string; changeLanguage: (lang: string) => void }
): ReactElement => {
  const isCurrentLanguage = i18n.language === code;
  const className = getLanguageItemClassName(isCurrentLanguage);

  return (
    <DropdownMenuItem
      key={code}
      onClick={() => i18n.changeLanguage(code)}
      className={className}
    >
      {name}
    </DropdownMenuItem>
  );
};

const getLanguageItemClassName = (isCurrentLanguage: boolean): string => {
  if (isCurrentLanguage) {
    return "bg-accent";
  }

  return "";
};

export default LanguageSwitcher;
