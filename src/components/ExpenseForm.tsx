import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@clerk/clerk-react';

export function ExpenseForm() {
    const { addExpense, loading } = useExpenses();
    const { getToken } = useAuth();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('food');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Debug: Check if we have a valid token
            const token = await getToken({ template: 'supabase' });
            console.log('Got token before expense creation:', !!token);

            await addExpense({
                amount: parseFloat(amount),
                description,
                category,
            });

            // Reset form
            setAmount('');
            setDescription('');
            setCategory('food');
        } catch (error) {
            console.error('Error in form submission:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full p-2 border rounded"
                    required
                />
            </div>
            <div>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full p-2 border rounded"
                    required
                />
            </div>
            <div>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                >
                    <option value="food">Food</option>
                    <option value="transport">Transport</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="utilities">Utilities</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Expense'}
            </Button>
        </form>
    );
}