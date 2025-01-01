import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/category";

type CategoryFormProps = {
    open: boolean;
    onClose: () => void;
    category?: Category;
    onSuccess: () => void;
};

const CategoryForm = ({ open, onClose, category, onSuccess }: CategoryFormProps) => {
    const [name, setName] = useState(category?.name || "");
    const [color, setColor] = useState(category?.color || "#000000");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (category) {
            setName(category.name);
            setColor(category.color);
        } else {
            setName("");
            setColor("#000000");
        }
    }, [category]);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);

        try {
            if (category) {
                const { error } = await supabase
                    .from("categories")
                    .update({ name, color })
                    .eq("id", category.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("categories")
                    .insert({ name, color });

                if (error) throw error;
            }

            toast({
                title: "Success",
                description: `Category ${category ? "updated" : "added"} successfully`,
            });
            onSuccess();
            onClose();
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${category ? "update" : "add"} category`,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{category ? "Edit" : "Add"} Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Category Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <div className="flex gap-4 items-center">
                        <Input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-20 h-10 p-1"
                        />
                        <Input
                            type="text"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            placeholder="#000000"
                            className="flex-1"
                            pattern="^#[0-9A-Fa-f]{6}$"
                        />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : category ? "Update" : "Add"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CategoryForm;