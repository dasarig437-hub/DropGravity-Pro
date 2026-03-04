import { useState } from 'react';
import { User, CreditCard, Moon, Sun, LogOut, Zap, Check, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('profile');
    const [upgrading, setUpgrading] = useState(false);

    const isPro = user?.plan === 'pro';

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const data = await createCheckoutSession();
            if (data.url) window.location.href = data.url;
        } catch (err) {
            console.error('Upgrade failed:', err);
        } finally {
            setUpgrading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const sections = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
    ];

    return (
        <div className="settings-page">
            <div className="settings-header animate-fade-in-up">
                <h1 className="settings-title">Settings</h1>
                <p className="settings-subtitle">Manage your account and subscription</p>
            </div>

            <div className="settings-layout animate-fade-in-up delay-1">
                {/* Navigation */}
                <nav className="settings-nav glass-card">
                    {sections.map(s => (
                        <button
                            key={s.id}
                            className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(s.id)}
                        >
                            <s.icon size={16} />
                            <span>{s.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <div className="settings-content">

                    {/* ---- PROFILE ---- */}
                    {activeSection === 'profile' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><User size={18} /> Profile</h2>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Email</label>
                                    <span className="setting-desc">{user?.email || 'Not signed in'}</span>
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Current Plan</label>
                                    <span className="setting-desc">
                                        {isPro ? (
                                            <span className="plan-badge plan-badge-pro">⚡ Pro</span>
                                        ) : (
                                            <span className="plan-badge plan-badge-free">Free</span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Member Since</label>
                                    <span className="setting-desc">
                                        {user?.createdAt
                                            ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
                                            : '—'}
                                    </span>
                                </div>
                            </div>

                            <div className="setting-row setting-row-action">
                                <button className="btn btn-sm" style={{ color: '#ef4444' }} onClick={handleLogout}>
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---- PLAN & BILLING ---- */}
                    {activeSection === 'billing' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><CreditCard size={18} /> Plan & Billing</h2>

                            {/* Current Plan Card */}
                            <div className={`plan-status-card ${isPro ? 'plan-status-pro' : ''}`}>
                                <div className="plan-status-header">
                                    <div>
                                        <div className="plan-status-name">
                                            {isPro ? '⚡ Pro Plan' : 'Free Plan'}
                                        </div>
                                        <ul className="plan-features-list">
                                            {isPro ? (
                                                <>
                                                    <li>Unlimited searches</li>
                                                    <li>Save up to 20 products</li>
                                                    <li>Pro insights unlocked</li>
                                                    <li>No ads</li>
                                                </>
                                            ) : (
                                                <>
                                                    <li>3 searches per day</li>
                                                    <li>+2 searches via ads</li>
                                                    <li>Save up to 5 products</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                    <span className={`plan-status-badge ${isPro ? 'active' : ''}`}>
                                        {isPro ? 'Active' : 'Current'}
                                    </span>
                                </div>
                            </div>

                            {/* Upgrade or Manage */}
                            {isPro ? (
                                <div className="billing-manage">
                                    <p className="billing-manage-text">
                                        Your Pro subscription is active. Manage your payment method or cancel anytime through the Stripe customer portal.
                                    </p>
                                    <button className="btn btn-secondary btn-sm" disabled>
                                        <ExternalLink size={14} /> Manage Subscription
                                        <span className="coming-soon-tag">Coming Soon</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="billing-upgrade">
                                    <div className="upgrade-offer">
                                        <div className="upgrade-offer-header">
                                            <h3>Upgrade to Pro</h3>
                                            <div className="upgrade-price">
                                                <span className="price-amount">$9.99</span>
                                                <span className="price-period">/month</span>
                                            </div>
                                        </div>
                                        <ul className="upgrade-features">
                                            <li><Check size={14} /> Unlimited product searches</li>
                                            <li><Check size={14} /> Pro Insights (Demand, Intent, Competition)</li>
                                            <li><Check size={14} /> No ads or daily limits</li>
                                            <li><Check size={14} /> Save up to 20 products</li>
                                        </ul>
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%' }}
                                            onClick={handleUpgrade}
                                            disabled={upgrading}
                                        >
                                            {upgrading ? <Loader2 size={16} className="spin-icon" /> : <Zap size={16} />}
                                            {upgrading ? 'Redirecting to Stripe...' : 'Upgrade to Pro — $9.99/mo'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
