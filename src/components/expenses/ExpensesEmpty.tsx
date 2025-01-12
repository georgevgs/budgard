import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";
import {format} from "date-fns";
import {el, enUS} from "date-fns/locale";

type ExpensesEmptyProps = {
    selectedMonth: string;
    onAddClick: () => void;
};

const ExpensesEmpty = ({selectedMonth, onAddClick}: ExpensesEmptyProps) => {
    const {t, i18n} = useTranslation();

    // Select the appropriate locale for date-fns
    const dateLocale = i18n.language === "el" ? el : enUS;

    return (
        <div className="text-center py-12 px-4 rounded-lg border-2 border-dashed">
            <h3 className="text-lg font-semibold mb-1">
                {t("expenses.noExpensesFor", {
                    month: format(new Date(selectedMonth + "-01"), "MMMM yyyy", {locale: dateLocale})
                })}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
                {t("expenses.addFirstExpense")}
            </p>
            <Button onClick={onAddClick} variant="outline">
                <Plus className="h-4 w-4 mr-2"/>
                {t("expenses.addExpense")}
            </Button>
        </div>
    );
};

export default ExpensesEmpty;