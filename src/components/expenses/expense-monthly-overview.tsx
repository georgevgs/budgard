import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

type MonthlyOverviewProps = {
    monthlyTotal: number;
    selectedMonth: string;
    currentMonth: string;
    onCurrentMonthClick: () => void;
};

const MonthlyOverview = ({
    monthlyTotal,
    selectedMonth,
    currentMonth,
    onCurrentMonthClick,
}: MonthlyOverviewProps) => (
    <div className="flex items-center justify-between gap-4 bg-background border rounded-lg p-4">
        <div>
            <p className="text-sm font-medium text-muted-foreground">Monthly Total</p>
            <p className="text-2xl font-bold">€{monthlyTotal.toFixed(2)}</p>
        </div>
        <Button
            variant="outline"
            size="sm"
            onClick={onCurrentMonthClick}
            className={`text-muted-foreground ${selectedMonth === currentMonth ? 'bg-primary/10' : ''}`}
        >
            <CalendarDays className="h-4 w-4 mr-2" />
            Today
        </Button>
    </div>
);

export default MonthlyOverview;