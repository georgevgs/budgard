import { format, addMonths, parseISO } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRef, useMemo } from "react";

interface ExpenseTabsProps {
    selectedMonth: string;
    onMonthChange: (month: string) => void;
}

const ExpenseTabs = ({ selectedMonth, onMonthChange }: ExpenseTabsProps) => {
    const tabsListRef = useRef<HTMLDivElement>(null);

    // Generate months range based on selected month
    const months = useMemo(() => {
        const selectedDate = parseISO(`${selectedMonth}-01`);

        // Generate 12 months before and 12 months after the selected month
        return Array.from({ length: 25 }, (_, index) => {
            const date = addMonths(selectedDate, index - 12);
            return format(date, "yyyy-MM");
        });
    }, [selectedMonth]);

    const scrollToMonth = (month: string) => {
        if (tabsListRef.current) {
            const tabElement = tabsListRef.current.querySelector(`[data-value="${month}"]`) as HTMLButtonElement | null;

            if (tabElement) {
                const containerWidth = tabsListRef.current.getBoundingClientRect().width;
                const tabWidth = tabElement.getBoundingClientRect().width;
                const tabLeft = tabElement.getBoundingClientRect().left - tabsListRef.current.getBoundingClientRect().left;

                const scrollPosition = tabLeft - (containerWidth / 2) + (tabWidth / 2);

                tabsListRef.current.scrollTo({
                    left: Math.max(0, scrollPosition),
                    behavior: 'smooth'
                });
            }
        }
    };

    const handleTabClick = (month: string) => {
        onMonthChange(month);
        scrollToMonth(month);
    };

    return (
        <Tabs value={selectedMonth} onValueChange={handleTabClick} className="w-full">
            <TabsList
                ref={tabsListRef}
                className="h-auto bg-transparent p-0 flex overflow-x-auto no-scrollbar scroll-smooth"
            >
                {months.map((month) => (
                    <TabsTrigger
                        key={month}
                        value={month}
                        data-value={month}
                        className="flex-shrink-0 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4"
                    >
                        {format(new Date(month + "-01"), "MMM yyyy")}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
};

export default ExpenseTabs;