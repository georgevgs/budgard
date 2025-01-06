import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import type { Category } from "@/types/Category";

interface CategoryFormProps {
    onSubmit: (categoryData: Partial<Category>) => Promise<void>;
    onBack: () => void;
}

const CategoryForm = ({ onSubmit, onBack }: CategoryFormProps) => {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#4A90E2");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        const trimmedName = name.trim();
        if (!trimmedName) return;

        setLoading(true);
        try {
            await onSubmit({ name: trimmedName, color });
            // Clear form on success
            setName("");
            setColor("#4A90E2");
        } catch (error) {
            // Error toast is handled by parent
        } finally {
            setLoading(false);
        }
    };

    const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value;
        if (newColor.match(/^#[0-9A-Fa-f]{0,6}$/)) {
            setColor(newColor);
        }
    };

    return (
        <div className="space-y-6">
            <DialogHeader>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="h-8 w-8 p-0"
                        disabled={loading}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Go back</span>
                    </Button>
                    <DialogTitle>Add New Category</DialogTitle>
                </div>
                <DialogDescription>
                    Create a new category to organize your expenses
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Input
                        type="text"
                        placeholder="Category Name"
                        value={name}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Prevent starting with space
                            if (value === ' ' && !name) return;
                            // Prevent multiple spaces
                            if (value.includes('  ')) return;
                            setName(value);
                        }}
                        required
                        maxLength={50}
                        disabled={loading}
                        aria-label="Category name"
                    />
                </div>

                <div className="flex gap-4 items-center">
                    <Input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-20 h-10 p-1 cursor-pointer"
                        disabled={loading}
                        aria-label="Category color"
                    />
                    <Input
                        type="text"
                        value={color}
                        onChange={handleColorInputChange}
                        placeholder="#000000"
                        className="flex-1"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        disabled={loading}
                        aria-label="Category color hex value"
                    />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBack}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || !name.trim()}
                    >
                        {loading ? "Adding..." : "Add Category"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CategoryForm;