import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
    const navigate = useNavigate();
    const { register, isAuthenticated } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    if (isAuthenticated) {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await register(email.trim(), password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-mesh" />
            <div className="auth-card">
                <div className="auth-brand">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">
                            <Zap size={20} />
                        </div>
                        <div className="auth-logo-text">
                            DropGravity <span>Pro</span>
                        </div>
                    </div>
                    <h1 className="auth-title">Create your account</h1>
                    <p className="auth-subtitle">Start finding winning products today</p>
                </div>

                {error && (
                    <div className="auth-error">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="register-email">Email</label>
                        <input
                            id="register-email"
                            type="email"
                            className="auth-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="register-password">Password</label>
                        <input
                            id="register-password"
                            type="password"
                            className="auth-input"
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <span className="auth-hint">Must be at least 6 characters</span>
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="register-confirm">Confirm Password</label>
                        <input
                            id="register-confirm"
                            type="password"
                            className="auth-input"
                            placeholder="Repeat your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? (
                            <><Loader2 size={16} className="spin-icon" /> Creating account...</>
                        ) : (
                            <><UserPlus size={16} /> Create Account</>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
