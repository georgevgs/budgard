import {createContext, useContext, useReducer, useEffect, ReactNode, useRef, useCallback} from "react";
import {useAuth} from "./AuthContext";
import {dataService} from "@/services/dataService";
import type {Category} from "@/types/Category";
import type {Expense} from "@/types/Expense";
import type {Budget} from "@/types/Budget";
import {useToast} from "@/hooks/useToast";

interface DataState {
    categories: Category[];
    expenses: Expense[];
    budget: Budget | null;
    isLoading: boolean;
    error: Error | null;
    isInitialized: boolean;
}

interface DataContextType extends DataState {
    refreshData: () => Promise<void>;
    dispatch: React.Dispatch<DataAction>;
    updateOptimistically: <T extends keyof DataState>(
        key: T,
        data: DataState[T]
    ) => void;
    revertOptimisticUpdate: () => void;
}

type DataAction =
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_ERROR"; payload: Error | null }
    | { type: "SET_DATA"; payload: Partial<DataState> }
    | { type: "OPTIMISTIC_UPDATE"; payload: Partial<DataState> }
    | { type: "RESET_DATA" };

const initialState: DataState = {
    categories: [],
    expenses: [],
    budget: null,
    isLoading: true,
    error: null,
    isInitialized: false
};

const DataContext = createContext<DataContextType | null>(null);

function dataReducer(state: DataState, action: DataAction): DataState {
    switch (action.type) {
        case "SET_LOADING":
            return {...state, isLoading: action.payload};
        case "SET_ERROR":
            return {...state, error: action.payload, isLoading: false};
        case "SET_DATA":
            return {...state, ...action.payload, isLoading: false, error: null};
        case "OPTIMISTIC_UPDATE":
            return {...state, ...action.payload};
        case "RESET_DATA":
            return {...initialState};
        default:
            return state;
    }
}

export function DataProvider({children}: { children: ReactNode }) {
    const {session, isLoading: isAuthLoading} = useAuth();
    const [state, dispatch] = useReducer(dataReducer, initialState);
    const {toast} = useToast();

    const previousStateRef = useRef<DataState | null>(null);
    const initializingRef = useRef(false);

    const fetchData = async (userId: string) => {
        if (initializingRef.current) return;
        initializingRef.current = true;

        try {
            const [categories, expenses, budget] = await Promise.all([
                dataService.getCategories(),
                dataService.getExpenses(),
                dataService.getBudget(userId),
            ]);

            dispatch({
                type: "SET_DATA",
                payload: {
                    categories,
                    expenses,
                    budget,
                    isInitialized: true
                },
            });
        } catch (error) {
            dispatch({type: "SET_ERROR", payload: error as Error});
            toast({
                title: "Error",
                description: "Failed to load data",
                variant: "destructive",
            });
        } finally {
            initializingRef.current = false;
        }
    };

    const refreshData = useCallback(async () => {
        if (!session?.user?.id) return;
        await fetchData(session.user.id);
    }, [session?.user?.id]);

    useEffect(() => {
        if (!isAuthLoading) {
            if (session?.user?.id && !state.isInitialized) {
                fetchData(session.user.id);
            } else if (!session) {
                dispatch({type: "RESET_DATA"});
            }
        }
    }, [isAuthLoading, session?.user?.id, state.isInitialized]);

    const updateOptimistically = useCallback(<T extends keyof DataState>(
        key: T,
        data: DataState[T]
    ) => {
        previousStateRef.current = state;
        dispatch({
            type: "OPTIMISTIC_UPDATE",
            payload: {[key]: data},
        });
    }, [state]);

    const revertOptimisticUpdate = useCallback(() => {
        if (previousStateRef.current) {
            dispatch({
                type: "SET_DATA",
                payload: previousStateRef.current,
            });
            previousStateRef.current = null;
        }
    }, []);

    const value = {
        ...state,
        refreshData,
        dispatch,
        updateOptimistically,
        revertOptimisticUpdate,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}