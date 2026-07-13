import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import "../styles/Login.css";

const Register = () => {
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        const { error } = await authService.register(fullName, email, password);

        setLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        alert("Registration Successful");
        navigate("/");
    };

    return (
        <div className="login-page">

            {/* ── Left purple brand panel ── */}
            <div className="login-brand">
                <div className="login-brand-icon">🤖</div>
                <h1>Morepen AI</h1>
                <p>Internal analytics assistant for Morepen employees</p>
                <div className="login-brand-tagline">
                    🔒 Restricted access — authorized personnel only. Query internal organizational data securely.
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="login-form-panel">
                <div className="login-card">
                    <div className="login-card-header">
                        <h2>Create an account</h2>
                        <p>Get started with Morepen Analyst Chatbot</p>
                    </div>

                    <form className="login-form" onSubmit={handleRegister}>
                        <div className="form-field">
                            <label htmlFor="fullName">Full Name</label>
                            <input
                                id="fullName"
                                type="text"
                                placeholder="Your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

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
                                    placeholder="Create a password (min. 6 chars)"
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

                        <div className="form-field">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="password-row">
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button className="login-btn" disabled={loading}>
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <p className="login-footer-text">
                        Already have an account?
                        <Link to="/">Sign in</Link>
                    </p>
                </div>
            </div>

        </div>
    );
};

export default Register;