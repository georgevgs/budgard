import {useTranslation} from "react-i18next";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Plus, Receipt, Tag, X} from "lucide-react";
import {cn} from "@/lib/utils";

interface SpeedDialProps {
    onAddExpense: () => void;
    onAddCategory: () => void;
}

const SpeedDial = ({onAddExpense, onAddCategory}: SpeedDialProps) => {
    const {t} = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleAction = (callback: () => void) => {
        setIsOpen(false);
        callback();
    };

    return (
        <>
            {/* Overlay to handle clicks outside when menu is open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-transparent z-40"
                    onClick={() => setIsOpen(false)}
                    aria-label={t("speedDial.closeMenu")}
                />
            )}

            <div
                className="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end gap-2 pb-safe pointer-events-none">
                {/* Action Buttons */}
                <div
                    className={cn(
                        "flex flex-col gap-2 items-end transition-all duration-200 scale-90 origin-bottom pointer-events-auto",
                        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                    )}
                >
                    {/* Add Expense Button */}
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "px-2 py-1 rounded-md bg-background border shadow-sm",
                            "opacity-0 -translate-x-4 transition-all duration-200",
                            isOpen && "opacity-100 translate-x-0 delay-100"
                        )}>
                            <span className="text-sm font-medium">
                                {t("expenses.addExpense")}
                            </span>
                        </div>
                        <Button
                            size="icon"
                            className="h-12 w-12 rounded-full shadow-lg"
                            onClick={() => handleAction(onAddExpense)}
                            aria-label={t("expenses.addExpense")}
                        >
                            <Receipt className="h-5 w-5"/>
                        </Button>
                    </div>

                    {/* Add Category Button */}
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "px-2 py-1 rounded-md bg-background border shadow-sm",
                            "opacity-0 -translate-x-4 transition-all duration-200",
                            isOpen && "opacity-100 translate-x-0"
                        )}>
                            <span className="text-sm font-medium">
                                {t("categories.addCategory")}
                            </span>
                        </div>
                        <Button
                            size="icon"
                            className="h-12 w-12 rounded-full shadow-lg"
                            onClick={() => handleAction(onAddCategory)}
                            aria-label={t("categories.addCategory")}
                        >
                            <Tag className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>

                {/* Main Toggle Button */}
                <Button
                    size="icon"
                    className={cn(
                        "h-14 w-14 rounded-full shadow-lg transition-transform duration-200 pointer-events-auto",
                        isOpen && "rotate-45"
                    )}
                    onClick={toggleMenu}
                    aria-label={t(isOpen ? "speedDial.close" : "speedDial.open")}
                    aria-expanded={isOpen}
                >
                    {isOpen ? <X className="h-6 w-6"/> : <Plus className="h-6 w-6"/>}
                </Button>
            </div>
        </>
    );
};

export default SpeedDial;