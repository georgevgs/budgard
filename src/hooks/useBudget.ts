import {useState, useEffect} from "react";
import {supabase} from "@/lib/supabase";
import {useToast} from "@/hooks/useToast";
import type {Budget} from "@/types/Budget";

export function useBudget() {
    const [budget, setBudget] = useState<Budget | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const {toast} = useToast();

    useEffect(() => {
        const fetchBudget = async () => {
            try {
                const {data: {user}} = await supabase.auth.getUser();
                if (!user) {
                    setIsLoading(false);
                    return;
                }

                const {data, error} = await supabase
                    .from("budgets")
                    .select()
                    .eq("user_id", user.id)
                    .single();

                if (error && error.code !== "PGRST116") throw error;
                setBudget(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load budget",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchBudget();
    }, [toast]);

    const updateBudget = async (amount: string) => {
        try {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication required");

            const {data, error} = await supabase
                .from("budgets")
                .upsert({
                    id: budget?.id,
                    amount: parseFloat(amount),
                    user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;

            setBudget(data);
            toast({
                title: "Success",
                description: `Budget ${budget ? "updated" : "set"} successfully`
            });

            return true;
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${budget ? "update" : "set"} budget`,
                variant: "destructive"
            });
            return false;
        }
    };

    return {
        budget,
        isLoading,
        updateBudget
    };
}