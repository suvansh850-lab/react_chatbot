import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const {
                data: { session },
            } = await authService.getSession();

            setUser(session?.user ?? null);
            setLoading(false);

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

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);