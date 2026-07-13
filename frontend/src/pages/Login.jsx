import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import "../styles/Login.css";
import supabase from "../lib/supabase";

const Login = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await authService.login(email, password);

        setLoading(false);

        if (error) {
            alert(error.message);
        } else {
            navigate("/");
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}`,
            },
        });

        if (error) {
            alert(error.message);
        }
    };

    return (
        <div className="login-page">

            {/* ── Left brand panel — mirrors the purple sidebar header ── */}
            <div className="login-brand">
                <div className="login-brand-icon">🤖</div>
                <h1>Morepen AI</h1>
                <p>Analytics assistant for Morepen employees</p>
                <div className="login-brand-tagline">
                    🔒 Restricted access — authorized personnel only. Query internal organizational data securely.
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="login-form-panel">
                <div className="login-card">
                    <div className="login-card-header">
                        <h2>Welcome</h2>
                        <p>Sign in to continue to Morepen Analyst Chatbot</p>
                    </div>

                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-field">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="password">Password</label>
                            <div className="password-row">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="show-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <button className="login-btn" disabled={loading}>
                            {loading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>

                    <div className="login-divider">
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className="google-btn"
                        onClick={handleGoogleLogin}
                    >
                        <svg className="google-icon" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.78-2.4 3.62v3.02h3.87c2.26-2.09 3.58-5.18 3.58-8.49z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.11C3.18 21.88 7.31 24 12 24z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.62H1.21C.44 8.16 0 9.88 0 12s.44 3.84 1.21 5.38l4.11-3.11z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 5.38l4.11 3.11c.94-2.85 3.57-4.96 6.68-4.96z"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="login-footer-text">
                        Don't have an account?
                        <Link to="/register">Create one</Link>
                    </p>
                </div>
            </div>

        </div>
    );
};

export default Login;