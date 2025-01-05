import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import type { Category } from "@/types/Category.ts";

interface SimplifiedCategoryFormProps {
    onBack: () => void;
    onSubmit: (categoryData: Partial<Category>) => Promise<void>;
}

const CategoryForm = ({ onBack, onSubmit }: SimplifiedCategoryFormProps) => {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#000000");
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
            setColor("#000000");
            // Note: Success toast is now handled by parent
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-8 px-2"
                    disabled={loading}
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
                disabled={loading}
            />

            <div className="flex gap-4 items-center">
                <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-20 h-10 p-1"
                    disabled={loading}
                />
                <Input
                    type="text"
                    value={color}
                    onChange={handleColorInputChange}
                    placeholder="#000000"
                    className="flex-1"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    disabled={loading}
                />
            </div>

            <div className="flex gap-3 justify-end">
                <Button
                    variant="outline"
                    onClick={onBack}
                    type="button"
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Adding..." : "Add Category"}
                </Button>
            </div>
        </form>
    );
};

export default CategoryForm;