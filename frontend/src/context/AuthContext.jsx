import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            try {
                const res = await authService.getSession();
                setUser(res?.data?.session?.user ?? null);
            } catch (err) {
                console.error("Failed to retrieve auth session:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }

            // Clean up OAuth hash fragment from URL
            if (window.location.hash) {
                window.history.replaceState(
                    null,
                    "",
                    window.location.pathname + window.location.search
                );
            }
        };

        getSession();

        const subscription = authService.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            if (subscription && typeof subscription.unsubscribe === "function") {
                subscription.unsubscribe();
            }
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);