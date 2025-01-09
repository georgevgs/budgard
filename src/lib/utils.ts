import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function parseCurrencyInput(value: string): number {
    // Remove currency symbol and any whitespace
    const cleaned = value.replace(/[€\s]/g, "");
    // Replace comma with dot for decimal
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    return parseFloat(normalized);
}

export function formatCurrencyInput(value: string): string {
    // Remove any non-digit, non-comma, non-dot characters
    const cleaned = value.replace(/[^\d.,]/g, "");

    // Convert to the format with dots for thousands and comma for decimal
    const parts = cleaned.split(",");
    if (parts[0]) {
        // Format the integer part with dots for thousands
        parts[0] = parts[0].replace(/\./g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Ensure max 2 decimal places
    if (parts[1]) {
        parts[1] = parts[1].slice(0, 2);
    }

    return parts.join(",");
}