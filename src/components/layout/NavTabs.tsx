import {NavLink} from "react-router-dom";
import {cn} from "@/lib/utils";
import {FileText, BarChart, Repeat} from "lucide-react";

const NavTabs = () => {
    const tabs = [
        {
            name: "Expenses",
            path: "/expenses",
            icon: FileText
        },
        {
            name: "Recurring",
            path: "/recurring",
            icon: Repeat
        },
        {
            name: "Analytics",
            path: "/analytics",
            icon: BarChart
        }
    ];

    return (
        <div className="w-full border-b bg-background">
            <div className="container mx-auto px-4">
                <nav className="flex space-x-4" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <NavLink
                                key={tab.path}
                                to={tab.path}
                                className={({isActive}) =>
                                    cn(
                                        "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                                        isActive
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )
                                }
                            >
                                <Icon className="h-4 w-4"/>
                                {tab.name}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default NavTabs;