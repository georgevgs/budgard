import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import type { Category } from "@/types/category";

interface SimplifiedCategoryFormProps {
    onBack: () => void;
    onSuccess: (category: Category) => void;
}

const CategoryForm = ({ onBack, onSuccess }: SimplifiedCategoryFormProps) => {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#000000");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from("categories")
                .insert({ name, color })
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Success",
                description: "Category added successfully",
            });

            onSuccess(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to add category",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-8 px-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold">Add New Category</h3>
            </div>

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
                <Button variant="outline" onClick={onBack} type="button">
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Adding..." : "Add Category"}
                </Button>
            </div>
        </form>
    );
};

export default CategoryForm;