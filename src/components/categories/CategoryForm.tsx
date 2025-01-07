import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {DialogTitle, DialogHeader, DialogDescription} from "@/components/ui/dialog";
import {ArrowLeft} from "lucide-react";
import {useAuth} from "@/contexts/AuthContext";
import {useDataOperations} from "@/hooks/useDataOperations";
import {useData} from "@/contexts/DataContext";

interface CategoryFormProps {
    onBack: () => void;
    onClose: () => void;
}

const CategoryForm = ({onBack, onClose}: CategoryFormProps) => {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#000000");
    const [loading, setLoading] = useState(false);
    const {session} = useAuth();
    const {handleCategoryAdd} = useDataOperations();
    const {isInitialized} = useData();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || !session?.user?.id || !isInitialized) return;

        const trimmedName = name.trim();
        if (!trimmedName) return;

        setLoading(true);
        try {
            await handleCategoryAdd({
                name: trimmedName,
                color,
                user_id: session.user.id
            });
            // Clear form on success
            setName("");
            setColor("#000000");
            onClose();
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

    // Prevent form submission if data isn't initialized
    const isDisabled = loading || !isInitialized;

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
                        disabled={isDisabled}
                    >
                        <ArrowLeft className="h-4 w-4"/>
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
                            if (value === " " && !name) return;
                            // Prevent multiple spaces
                            if (value.includes("  ")) return;
                            setName(value);
                        }}
                        required
                        maxLength={50}
                        disabled={isDisabled}
                        aria-label="Category name"
                    />
                </div>

                <div className="flex gap-4 items-center">
                    <Input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-20 h-10 p-1 cursor-pointer"
                        disabled={isDisabled}
                        aria-label="Category color"
                    />
                    <Input
                        type="text"
                        value={color}
                        onChange={handleColorInputChange}
                        placeholder="#000000"
                        className="flex-1"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        disabled={isDisabled}
                        aria-label="Category color hex value"
                    />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBack}
                        disabled={isDisabled}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isDisabled || !name.trim()}
                    >
                        {loading ? "Adding..." : "Add Category"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CategoryForm;