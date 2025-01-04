import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type MonthlyOverviewProps = {
    monthlyTotal: number;
    selectedMonth: string;
    currentMonth: string;
    isExpanded?: boolean;
    hasExpenses: boolean;
    onCurrentMonthClick: () => void;
    onMonthlyTotalClick: () => void;
};

const MonthlyOverview = ({
    monthlyTotal,
    selectedMonth,
    currentMonth,
    isExpanded = false,
    hasExpenses,
    onCurrentMonthClick,
    onMonthlyTotalClick,
}: MonthlyOverviewProps) => (
    <div className="flex items-start justify-between gap-4 bg-background border rounded-lg p-4">
        <div
            onClick={hasExpenses ? onMonthlyTotalClick : undefined}
            className={cn(
                "group transition-all",
                hasExpenses && "cursor-pointer hover:opacity-70"
            )}
        >
            <p className="text-sm font-medium text-muted-foreground">Monthly Total</p>
            <p className="text-2xl font-bold">€{monthlyTotal.toFixed(2)}</p>
            {hasExpenses && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <ChevronDown
                        className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            isExpanded && "rotate-180"
                        )}
                    />
                    <span>Show breakdown</span>
                </div>
            )}
        </div>

        {selectedMonth !== currentMonth && (
            <Button
                variant="outline"
                size="sm"
                onClick={onCurrentMonthClick}
                className="text-muted-foreground"
            >
                <CalendarDays className="h-4 w-4 mr-2" />
                Today
            </Button>
        )}
    </div>
);

export default MonthlyOverview;