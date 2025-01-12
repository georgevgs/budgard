import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {RootProvider} from "@/contexts/RootProvider";
import App from "./App.tsx";
import "./lib/i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RootProvider>
            <App/>
        </RootProvider>
    </StrictMode>
);