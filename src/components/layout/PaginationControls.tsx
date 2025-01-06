import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: string) => void;
    totalItems: number;
    startItem: number;
    endItem: number;
}

const PaginationControls = ({
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange,
    totalItems,
    startItem,
    endItem,
}: PaginationControlsProps) => (
    <div className="fixed -bottom-[1px] left-0 right-0 bg-background border-t md:static md:rounded-lg md:border">
        <div className="flex items-center justify-between px-4 py-4 md:p-4">
            {/* Left - Items count & Page navigation */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="h-8 w-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm">
                    {startItem}-{endItem} <span className="text-muted-foreground">of</span> {totalItems}
                </span>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Right - Items per page */}
            <Select
                value={pageSize.toString()}
                onValueChange={onPageSizeChange}
            >
                <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="-1">All</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
);

export default PaginationControls;