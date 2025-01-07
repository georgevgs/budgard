import {ReactNode} from "react";
import {AuthProvider} from "@/contexts/AuthContext.tsx";
import {DataProvider} from "@/contexts/DataContext.tsx";

export const RootProvider = ({children}: { children: ReactNode }) => (
    <AuthProvider>
        <DataProvider>
            {children}
        </DataProvider>
    </AuthProvider>
);