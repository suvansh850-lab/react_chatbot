import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: "flex",
                height: "100vh",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Inter, sans-serif",
                color: "#6D4FC2"
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
