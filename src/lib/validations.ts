import * as z from "zod";
import {parseCurrencyInput} from "@/lib/utils";

// Shared regex patterns
const SAFE_STRING = /^[\p{L}\p{N}\s.,!?-]*$/u; // Unicode letters, numbers, basic punctuation
const AMOUNT_PATTERN = /^\d{1,3}(?:\.\d{3})*(?:,\d{0,2})?$/;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// Email validation with common disposable email providers blocked
const BLOCKED_DOMAINS = [
    "tempmail.com",
    "throwawaymail.com",
    // Add more as needed
];

export const emailSchema = z.string()
    .email("Please enter a valid email address")
    .refine((email) => !BLOCKED_DOMAINS.some(domain => email.endsWith(domain)), {
        message: "Please use a valid email address"
    });

// Expense validation schema
export const expenseSchema = z.object({
    amount: z.string()
        .min(1, "Amount is required")
        .regex(AMOUNT_PATTERN, "Invalid amount format")
        .refine(
            (val) => {
                const amount = parseCurrencyInput(val);
                return amount > 0 && amount <= 1000000;
            },
            "Amount must be between 0 and 1.000.000"
        ),
    description: z.string()
        .min(1, "Description is required")
        .max(100, "Description must be less than 100 characters")
        .regex(SAFE_STRING, "Description contains invalid characters")
        .transform(str => str.trim())
        .refine(str => str.length > 0, "Description cannot be empty"),
    category_id: z.string(),
    date: z.date({
        required_error: "Date is required",
    }),
});

// Category validation schema
export const categorySchema = z.object({
    name: z.string()
        .min(1, "Category name is required")
        .max(50, "Category name must be less than 50 characters")
        .regex(SAFE_STRING, "Category name contains invalid characters")
        .transform(str => str.trim())
        .refine(str => str.length > 0, "Category name cannot be empty"),
    color: z.string()
        .regex(HEX_COLOR, "Invalid color format")
});

// Budget validation schema
export const budgetSchema = z.object({
    amount: z.string()
        .min(1, "Budget amount is required")
        .regex(AMOUNT_PATTERN, "Invalid amount format")
        .refine(
            (val) => {
                const amount = parseCurrencyInput(val);
                return amount >= 0 && amount <= 1000000;
            },
            "Budget must be between 0 and 1.000.000"
        )
});

// Recurring expense validation schema
export const recurringExpenseSchema = z.object({
    amount: z.string()
        .min(1, "Amount is required")
        .regex(AMOUNT_PATTERN, "Invalid amount format")
        .refine(
            (val) => {
                const amount = parseCurrencyInput(val);
                return amount > 0 && amount <= 1000000;
            },
            "Amount must be between 0 and 1.000.000"
        ),
    description: z.string()
        .min(1, "Description is required")
        .max(100, "Description must be less than 100 characters")
        .regex(SAFE_STRING, "Description contains invalid characters")
        .transform(str => str.trim())
        .refine(str => str.length > 0, "Description cannot be empty"),
    category_id: z.string(),
    frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"] as const),
    start_date: z.date({
        required_error: "Start date is required",
    }),
    end_date: z.date().optional()
});

// Types
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;