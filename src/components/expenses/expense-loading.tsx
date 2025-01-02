const ExpenseLoadingState = () => (
    <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">Loading expenses...</p>
    </div>
);

export default ExpenseLoadingState;