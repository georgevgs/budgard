import {useTranslation} from "react-i18next";
import {NavLink} from "react-router-dom";
import {cn} from "@/lib/utils";
import {FileText, BarChart, Repeat} from "lucide-react";

const NavTabs = () => {
    const {t} = useTranslation();

    const tabs = [
        {
            name: t("navigation.expenses"),
            path: "/expenses",
            icon: FileText
        },
        {
            name: t("navigation.recurring"),
            path: "/recurring",
            icon: Repeat
        },
        {
            name: t("navigation.analytics"),
            path: "/analytics",
            icon: BarChart
        }
    ];

    return (
        <div className="w-full border-b bg-background">
            <div className="container mx-auto px-4">
                <nav className="flex" aria-label={t("navigation.ariaLabel")}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <NavLink
                                key={tab.path}
                                to={tab.path}
                                className={({isActive}) =>
                                    cn(
                                        "flex items-center justify-center gap-2 px-2 py-2 text-sm font-medium border-b-2 transition-colors flex-1 md:flex-initial md:px-3",
                                        isActive
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )
                                }
                            >
                                <Icon className="h-4 w-4 flex-shrink-0"/>
                                <span className="truncate">{tab.name}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default NavTabs;