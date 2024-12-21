import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import {ExpenseList} from "@/components/ExpenseList.tsx";
import {ExpenseForm} from "@/components/ExpenseForm.tsx";

export default function App() {
    return (
        <div className="max-w-md mx-auto p-4">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Expense Tracker</h1>
                <SignedOut>
                    <SignInButton />
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </header>

            <SignedIn>
                <ExpenseForm />
                <div className="mt-8">
                    <ExpenseList />
                </div>
            </SignedIn>

            <SignedOut>
                <p className="text-center text-gray-500">
                    Please sign in to manage your expenses
                </p>
            </SignedOut>
        </div>
    )
}