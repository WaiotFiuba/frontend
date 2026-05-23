import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

export default function RutaProtegida({ children }: { children: ReactNode }) {
    const user = null; //useAuthContext();

    if(!user) {
        return <Navigate to="/" replace />
    }

    return <>{children}</>;
}