import {useEffect, useState, useRef} from "react";

interface QueryState<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
}

interface CacheEntry<T> {
    promise: Promise<T> | null;
    timestamp: number;
    data: T | null;
}

// Cache for storing query results
const queryCache: Map<string, CacheEntry<any>> = new Map();

const CACHE_TIME = 1000 * 60; // 1 minute cache

// Function to generate a cache key
export function generateQueryKey(key: string, params?: Record<string, any>): string {
    if (!params) return key;
    return `${key}:${JSON.stringify(params)}`;
}

// Custom hook for data fetching with caching
export function useQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    enabled = true,
    deps: any[] = []
): QueryState<T> {
    const [state, setState] = useState<QueryState<T>>({
        data: null,
        isLoading: true,
        error: null,
    });

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        const fetchData = async () => {
            if (!enabled) {
                setState(prev => ({...prev, isLoading: false}));
                return;
            }

            try {
                const cached = queryCache.get(queryKey);
                const now = Date.now();

                if (cached) {
                    // If there's an ongoing request, wait for it
                    if (cached.promise) {
                        const data = await cached.promise;
                        if (mountedRef.current) {
                            setState({data, isLoading: false, error: null});
                        }
                        return;
                    }

                    // If cache is still fresh, use it
                    if (now - cached.timestamp < CACHE_TIME) {
                        setState({data: cached.data, isLoading: false, error: null});
                        return;
                    }
                }

                // Start new request
                const promise = queryFn();
                queryCache.set(queryKey, {promise, timestamp: now, data: null});

                const data = await promise;
                queryCache.set(queryKey, {promise: null, timestamp: now, data});

                if (mountedRef.current) {
                    setState({data, isLoading: false, error: null});
                }
            } catch (error) {
                queryCache.delete(queryKey);
                if (mountedRef.current) {
                    setState({data: null, isLoading: false, error: error as Error});
                }
            }
        };

        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [queryKey, queryFn, enabled, ...deps]);

    return state;
}

// Function to invalidate cache
export function invalidateQuery(queryKey: string) {
    queryCache.delete(queryKey);
}