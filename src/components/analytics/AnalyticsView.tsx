import {useMemo, useState} from "react";
import {format, parseISO, getYear} from "date-fns";
import Chart from "react-apexcharts";
import {Card, CardContent} from "@/components/ui/card";
import {useData} from "@/contexts/DataContext";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type {ApexOptions} from "apexcharts";

const AnalyticsView = () => {
    const {expenses, categories} = useData();

    // Get available years from expenses
    const availableYears = useMemo(() => {
        const years = new Set(
            expenses.map(e => getYear(parseISO(e.date)))
        );
        return Array.from(years).sort().reverse();
    }, [expenses]);

    const [selectedYear, setSelectedYear] = useState(() =>
        availableYears[0] || new Date().getFullYear()
    );

    // Generate monthly data for selected year
    const monthlyData = useMemo(() => {
        const months = Array.from({length: 12}, (_, i) => {
            const month = (i + 1).toString().padStart(2, "0");
            return `${selectedYear}-${month}`;
        });

        return months.map(month => {
            const monthExpenses = expenses.filter(e =>
                format(parseISO(e.date), "yyyy-MM") === month
            );

            return {
                month: format(parseISO(`${month}-01`), "MMM"),
                fullMonth: format(parseISO(`${month}-01`), "MMMM"),
                amount: monthExpenses.reduce((sum, e) => sum + e.amount, 0)
            };
        });
    }, [expenses, selectedYear]);

    // Calculate yearly totals and category breakdown
    const yearlyStats = useMemo(() => {
        const yearExpenses = expenses.filter(e =>
            getYear(parseISO(e.date)) === selectedYear
        );

        const totalSpent = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
        // Calculate monthly average only for months that have expenses
        const monthsWithExpenses = monthlyData.filter(m => m.amount > 0).length;
        const monthlyAverage = monthsWithExpenses > 0 ? totalSpent / monthsWithExpenses : 0;

        // Get months with expenses for highest/lowest calculation
        const activeMonths = monthlyData.filter(m => m.amount > 0);

        const highestMonth = activeMonths.length > 0
            ? activeMonths.reduce((prev, curr) => curr.amount > prev.amount ? curr : prev)
            : null;

        // Only set lowest month if we have more than one month with expenses
        const lowestMonth = activeMonths.length > 1
            ? activeMonths.reduce((prev, curr) => curr.amount < prev.amount ? curr : prev)
            : null;

        const categoryBreakdown = categories
            .map(cat => ({
                name: cat.name,
                color: cat.color,
                amount: yearExpenses
                    .filter(e => e.category_id === cat.id)
                    .reduce((sum, e) => sum + e.amount, 0)
            }))
            .filter(cat => cat.amount > 0) // Only include categories with expenses
            .sort((a, b) => b.amount - a.amount);

        return {
            totalSpent,
            monthlyAverage,
            categoryBreakdown,
            highestMonth,
            lowestMonth,
            activeMonths: activeMonths.length
        };
    }, [expenses, categories, selectedYear, monthlyData]);

    const chartOptions: ApexOptions = {
        chart: {
            type: "area",
            toolbar: {show: false},
            fontFamily: "inherit",
            background: "transparent",
            animations: {
                enabled: true
            }
        },
        grid: {
            borderColor: "hsl(var(--border) / 0.2)",
            strokeDashArray: 4
        },
        stroke: {
            curve: "smooth",
            width: 2
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.2,
                stops: [0, 90, 100]
            }
        },
        dataLabels: {enabled: false},
        xaxis: {
            categories: monthlyData.map(d => d.month),
            axisBorder: {show: false},
            axisTicks: {show: false},
            labels: {
                style: {colors: "hsl(var(--muted-foreground))"}
            }
        },
        yaxis: {
            labels: {
                formatter: val => `${Math.round(val)} €`,
                style: {colors: "hsl(var(--muted-foreground))"}
            }
        },
        tooltip: {
            theme: "dark",
            y: {
                formatter: val => `${val.toFixed(2)} €`
            }
        },
        colors: ["hsl(var(--primary))"]
    };

    const chartSeries = [{
        name: "Monthly Spending",
        data: monthlyData.map(d => d.amount)
    }];

    const formatAmount = (amount: number) => `${amount.toFixed(2)} €`;

    return (
        <div className="container max-w-6xl mx-auto p-4 space-y-6">
            {/* Year selector and summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select year"/>
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex gap-4 text-sm text-muted-foreground">
                    <div>
                        <span className="block text-lg text-foreground font-semibold">
                            {formatAmount(yearlyStats.totalSpent)}
                        </span>
                        Total Spent
                    </div>
                    <div>
                        <span className="block text-lg text-foreground font-semibold">
                            {formatAmount(yearlyStats.monthlyAverage)}
                        </span>
                        Monthly Average
                    </div>
                </div>
            </div>

            {/* Main chart */}
            <Card className="overflow-hidden">
                <CardContent className="p-6">
                    <div className="h-[300px] w-full">
                        <Chart
                            options={chartOptions}
                            series={chartSeries}
                            type="area"
                            height="100%"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Highest & Lowest months */}
                <Card>
                    <CardContent className="p-6 space-y-4">
                        {yearlyStats.activeMonths === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No spending data available for {selectedYear}
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                                        Highest Spending Month
                                    </h3>
                                    <p className="text-2xl font-semibold">
                                        {formatAmount(yearlyStats.highestMonth?.amount || 0)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {yearlyStats.highestMonth?.fullMonth}
                                    </p>
                                </div>
                                {yearlyStats.activeMonths > 1 && yearlyStats.lowestMonth && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                                            Lowest Spending Month
                                        </h3>
                                        <p className="text-2xl font-semibold">
                                            {formatAmount(yearlyStats.lowestMonth.amount)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {yearlyStats.lowestMonth.fullMonth}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Top categories */}
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">
                            Top Categories
                        </h3>
                        {yearlyStats.categoryBreakdown.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No categorized expenses for {selectedYear}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {yearlyStats.categoryBreakdown.slice(0, 5).map(category => (
                                    <div key={category.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{backgroundColor: category.color}}
                                            />
                                            <span className="font-medium">{category.name}</span>
                                        </div>
                                        <span>{formatAmount(category.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsView;