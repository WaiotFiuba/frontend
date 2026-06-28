import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function RutaProtegida({ children }: { children: ReactNode }) {
    const { accessToken } = useAuthContext();
    const location = useLocation();
    const isDevBypassEnabled = import.meta.env.DEV && import.meta.env.VITE_AUTH_DEV_BYPASS === 'true';
    const canAccess = Boolean(accessToken) || isDevBypassEnabled;

    if (!canAccess) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    return <>{children}</>;
}