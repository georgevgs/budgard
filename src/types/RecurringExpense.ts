import {Category} from "./Category";

export type RecurringExpenseFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringExpense {
    id: string;
    user_id: string;
    amount: number;
    description: string;
    category_id?: string;
    frequency: RecurringExpenseFrequency;
    start_date: string;
    end_date?: string;
    last_generated_date?: string;
    created_at: string;
    active: boolean;
    category?: Category;
}

export interface RecurringExpenseFormData {
    amount: string;
    description: string;
    category_id: string;
    frequency: RecurringExpenseFrequency;
    start_date: Date;
    end_date?: Date;
}