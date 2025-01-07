import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {DialogTitle, DialogHeader, DialogDescription} from "@/components/ui/dialog";
import {ArrowLeft} from "lucide-react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import {useAuth} from "@/contexts/AuthContext";
import {useDataOperations} from "@/hooks/useDataOperations";
import {useData} from "@/contexts/DataContext";
import {categorySchema, type CategoryFormData} from "@/lib/validations";

interface CategoryFormProps {
    onBack: () => void;
    onClose: () => void;
}

const CategoryForm = ({onBack, onClose}: CategoryFormProps) => {
    const {session} = useAuth();
    const {handleCategoryAdd} = useDataOperations();
    const {isInitialized} = useData();

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: "",
            color: "#000000",
        },
    });

    const handleSubmit = async (values: CategoryFormData) => {
        if (!session?.user?.id || !isInitialized) return;

        try {
            await handleCategoryAdd({
                name: values.name,
                color: values.color,
                user_id: session.user.id
            });
            onClose();
        } catch (error) {
            // Error is handled by parent
        }
    };

    // Prevent form submission if data isn't initialized
    const isDisabled = form.formState.isSubmitting || !isInitialized;

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

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({field}) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        placeholder="Category Name"
                                        {...field}
                                        disabled={isDisabled}
                                        aria-label="Category name"
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="color"
                        render={({field}) => (
                            <FormItem>
                                <div className="flex gap-4 items-center">
                                    <FormControl>
                                        <Input
                                            type="color"
                                            {...field}
                                            className="w-20 h-10 p-1 cursor-pointer"
                                            disabled={isDisabled}
                                            aria-label="Category color"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="#000000"
                                            className="flex-1"
                                            disabled={isDisabled}
                                            aria-label="Category color hex value"
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

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
                            disabled={isDisabled}
                        >
                            {form.formState.isSubmitting ? "Adding..." : "Add Category"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default CategoryForm;