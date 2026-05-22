import { Navigate } from "react-router-dom";

export default function RutaProtegida({ children }) {
    const user = null; //useAuthContext();

    if(!user) {
        return <Navigate to="/" replace />
    }

    return (children);
}