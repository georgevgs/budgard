import { useEffect } from 'react';
import { handleAuthRedirect } from '@/lib/auth';
import ExpenseLoadingState from '@/components/expenses/expense-loading';

const AuthCallback = () => {
    useEffect(() => {
        handleAuthRedirect();
    }, []);

    return <ExpenseLoadingState />;
};

export default AuthCallback;