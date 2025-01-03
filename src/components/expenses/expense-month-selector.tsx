import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, parseISO } from "date-fns";

interface MonthSelectorProps {
    selectedMonth: string; // Format: "yyyy-MM"
    onMonthChange: (month: string) => void;
}

const MonthSelector = ({ selectedMonth, onMonthChange }: MonthSelectorProps) => {
    const handleMonthChange = (direction: 'prev' | 'next') => {
        const currentDate = parseISO(`${selectedMonth}-01`);
        const newDate = addMonths(currentDate, direction === 'next' ? 1 : -1);
        onMonthChange(format(newDate, 'yyyy-MM'));
    };

    return (
        <div className="flex items-center justify-between gap-4 p-1 rounded-lg bg-muted/30">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMonthChange('prev')}
                className="h-8 w-8 p-0"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center">
                <p className="text-sm font-medium">
                    {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
                </p>
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMonthChange('next')}
                className="h-8 w-8 p-0"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
};

export default MonthSelector;
