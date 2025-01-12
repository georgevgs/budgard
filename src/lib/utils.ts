import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    // Format number to European style (1.234,56)
    return amount.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "€";
}

export function formatCurrencyInput(value: string): string {
    // Remove all characters except numbers and comma
    const cleaned = value.replace(/[^\d,]/g, "");

    // Ensure only one comma
    const parts = cleaned.split(",");
    if (parts.length > 2) {
        parts[1] = parts.slice(1).join("");
        value = parts.slice(0, 2).join(",");
    } else {
        value = cleaned;
    }

    // Add thousand separators
    const [whole = "", decimal = ""] = value.split(",");
    const formattedWhole = whole
        .split("")
        .reverse()
        .reduce((acc, digit, i) => {
            if (i > 0 && i % 3 === 0) {
                return digit + "." + acc;
            }
            return digit + acc;
        }, "");

    // Return formatted string
    return formattedWhole + (decimal ? "," + decimal.slice(0, 2) : "");
}

export function parseCurrencyInput(value: string): number {
    // Convert from European format (1.234,56) to number
    const cleaned = value
        .replace(/\./g, "")  // Remove thousand separators
        .replace(",", ".");  // Convert decimal comma to dot
    return parseFloat(cleaned) || 0;
}