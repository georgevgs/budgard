import {useTranslation} from "react-i18next";
import {useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {useData} from "@/contexts/DataContext";
import ExpensesBudgetList from "./ExpensesBudgetList";
import ExpensesBudgetAddDialog from "./ExpensesBudgetAddDialog";

const ExpensesBudget = () => {
    const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
    const {budget, isInitialized, isLoading} = useData();
    const {t} = useTranslation();

    if (!isInitialized || isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t("budget.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-4">
                        {t("budget.loading")}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>{t("budget.title")}</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddBudgetOpen(true)}
                        >
                            {budget ? t("budget.editBudget") : t("budget.setBudget")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ExpensesBudgetList/>
                </CardContent>
            </Card>

            <ExpensesBudgetAddDialog
                isOpen={isAddBudgetOpen}
                onOpenChange={setIsAddBudgetOpen}
                existingBudget={budget}
            />
        </div>
    );
};

export default ExpensesBudget;