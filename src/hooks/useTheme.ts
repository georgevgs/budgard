import {useEffect, useState} from "react";

type Theme = "light" | "dark" | "barbie";

export function useTheme() {
    // Get initial theme from localStorage or default to 'light'
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem("theme");
        return (savedTheme as Theme) || "light";
    });

    useEffect(() => {
        // Update localStorage when theme changes
        localStorage.setItem("theme", theme);

        // Update root element
        const root = window.document.documentElement;
        root.setAttribute("data-theme", theme);

        // Handle dark mode class
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    }, [theme]);

    return {theme, setTheme};
}