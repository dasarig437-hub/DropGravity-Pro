import { useState } from 'react';
import {
    User, Globe, DollarSign, Shield, Bell, Moon, Sun,
    Key, CreditCard, Download, ChevronRight, Palette,
    Target, AlertTriangle, BarChart3, Mail, Lock, Trash
} from 'lucide-react';
import './Settings.css';

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('general');
    const [settings, setSettings] = useState({
        currency: 'USD',
        country: 'United States',
        profitGoal: 40,
        riskTolerance: 50,
        alertThreshold: 80,
        darkMode: true,
        emailNotifs: true,
        pushNotifs: false,
        weeklyReport: true,
        gradeAlerts: true,
        autoRegrade: true,
    });

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const sections = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'targets', label: 'Targets & Goals', icon: Target },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'account', label: 'Account', icon: User },
        { id: 'api', label: 'API Keys', icon: Key },
        { id: 'data', label: 'Data & Export', icon: Download },
    ];

    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];
    const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Brazil'];

    return (
        <div className="settings-page">
            <div className="settings-header animate-fade-in-up">
                <h1 className="settings-title">Settings</h1>
                <p className="settings-subtitle">Customize your product grading experience</p>
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
                            <ChevronRight size={14} className="nav-arrow" />
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <div className="settings-content">
                    {activeSection === 'general' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><Globe size={18} /> General Settings</h2>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Default Currency</label>
                                    <span className="setting-desc">Currency for price displays and profit calculations</span>
                                </div>
                                <select className="select-field setting-control" value={settings.currency} onChange={e => updateSetting('currency', e.target.value)}>
                                    {currencies.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Target Country</label>
                                    <span className="setting-desc">Default market for trend analysis and competition data</span>
                                </div>
                                <select className="select-field setting-control" value={settings.country} onChange={e => updateSetting('country', e.target.value)}>
                                    {countries.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Auto Re-Grade</label>
                                    <span className="setting-desc">Automatically re-grade products every 24 hours</span>
                                </div>
                                <div className={`toggle ${settings.autoRegrade ? 'active' : ''}`} onClick={() => updateSetting('autoRegrade', !settings.autoRegrade)}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'targets' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><Target size={18} /> Targets & Goals</h2>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Profit Goal: {settings.profitGoal}%</label>
                                    <span className="setting-desc">Minimum profit margin you're targeting</span>
                                </div>
                                <div className="slider-container">
                                    <input type="range" className="range-slider" min="10" max="90" value={settings.profitGoal}
                                        onChange={e => updateSetting('profitGoal', Number(e.target.value))} />
                                    <div className="slider-labels">
                                        <span>10%</span><span>90%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Risk Tolerance: {settings.riskTolerance}%</label>
                                    <span className="setting-desc">How much risk you're comfortable with</span>
                                </div>
                                <div className="slider-container">
                                    <input type="range" className="range-slider" min="0" max="100" value={settings.riskTolerance}
                                        onChange={e => updateSetting('riskTolerance', Number(e.target.value))} />
                                    <div className="slider-labels">
                                        <span>Conservative</span><span>Aggressive</span>
                                    </div>
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Alert Threshold: {settings.alertThreshold}+</label>
                                    <span className="setting-desc">Only alert me for products scoring above this</span>
                                </div>
                                <div className="slider-container">
                                    <input type="range" className="range-slider" min="50" max="100" value={settings.alertThreshold}
                                        onChange={e => updateSetting('alertThreshold', Number(e.target.value))} />
                                    <div className="slider-labels">
                                        <span>50</span><span>100</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><Bell size={18} /> Notifications</h2>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Email Notifications</label>
                                    <span className="setting-desc">Receive grade alerts and weekly reports via email</span>
                                </div>
                                <div className={`toggle ${settings.emailNotifs ? 'active' : ''}`} onClick={() => updateSetting('emailNotifs', !settings.emailNotifs)}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Push Notifications</label>
                                    <span className="setting-desc">Browser push notifications for real-time alerts</span>
                                </div>
                                <div className={`toggle ${settings.pushNotifs ? 'active' : ''}`} onClick={() => updateSetting('pushNotifs', !settings.pushNotifs)}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Weekly Report</label>
                                    <span className="setting-desc">Summary of top products and market trends</span>
                                </div>
                                <div className={`toggle ${settings.weeklyReport ? 'active' : ''}`} onClick={() => updateSetting('weeklyReport', !settings.weeklyReport)}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Grade Alerts</label>
                                    <span className="setting-desc">Notify when a tracked product's grade changes</span>
                                </div>
                                <div className={`toggle ${settings.gradeAlerts ? 'active' : ''}`} onClick={() => updateSetting('gradeAlerts', !settings.gradeAlerts)}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'appearance' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><Palette size={18} /> Appearance</h2>
                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Dark Mode</label>
                                    <span className="setting-desc">Toggle between dark and light theme</span>
                                </div>
                                <div className={`toggle ${settings.darkMode ? 'active' : ''}`} onClick={() => updateSetting('darkMode', !settings.darkMode)}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'billing' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><CreditCard size={18} /> Billing & Plan</h2>

                            <div className="plan-card">
                                <div className="plan-current">
                                    <div className="plan-name">Free Plan</div>
                                    <span className="badge badge-info">Active</span>
                                </div>
                                <div className="plan-details">
                                    <p>3 scans per day • Basic grade</p>
                                </div>
                                <div className="plan-upgrade-options">
                                    <div className="plan-option">
                                        <div className="po-header">
                                            <h4>Pro</h4>
                                            <span className="po-price">$29<small>/mo</small></span>
                                        </div>
                                        <ul className="po-features">
                                            <li>Unlimited scans</li>
                                            <li>Forecast models</li>
                                            <li>Product comparison</li>
                                            <li>AI strategy tips</li>
                                        </ul>
                                        <button className="btn btn-primary" style={{ width: '100%' }}>Upgrade to Pro</button>
                                    </div>
                                    <div className="plan-option featured">
                                        <div className="po-header">
                                            <h4>Agency</h4>
                                            <span className="po-price">$99<small>/mo</small></span>
                                        </div>
                                        <ul className="po-features">
                                            <li>Multi-store dashboard</li>
                                            <li>Bulk reports</li>
                                            <li>White-label PDF</li>
                                            <li>Priority support</li>
                                        </ul>
                                        <button className="btn btn-primary" style={{ width: '100%' }}>Upgrade to Agency</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'account' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><User size={18} /> Account</h2>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Email</label>
                                    <span className="setting-desc">demo@dropgravity.pro</span>
                                </div>
                                <button className="btn btn-secondary btn-sm"><Mail size={14} /> Change</button>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Password</label>
                                    <span className="setting-desc">Last changed 30 days ago</span>
                                </div>
                                <button className="btn btn-secondary btn-sm"><Lock size={14} /> Update</button>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Two-Factor Authentication</label>
                                    <span className="setting-desc">Add an extra layer of security</span>
                                </div>
                                <button className="btn btn-secondary btn-sm"><Shield size={14} /> Enable</button>
                            </div>

                            <div className="setting-row danger">
                                <div className="setting-info">
                                    <label className="setting-label">Delete Account</label>
                                    <span className="setting-desc">Permanently delete your account and all data</span>
                                </div>
                                <button className="btn btn-sm" style={{ color: '#ef4444' }}><Trash size={14} /> Delete</button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'api' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><Key size={18} /> API Keys</h2>
                            <div className="api-key-box">
                                <div className="api-key-display">
                                    <code>dg_pro_sk_••••••••••••••••</code>
                                    <button className="btn btn-ghost btn-sm">Show</button>
                                </div>
                                <button className="btn btn-secondary btn-sm">Regenerate Key</button>
                            </div>
                            <p className="api-note">Use this key to access the DropGravity Pro API for custom integrations.</p>
                        </div>
                    )}

                    {activeSection === 'data' && (
                        <div className="settings-panel glass-card animate-fade-in">
                            <h2 className="panel-title"><Download size={18} /> Data & Export</h2>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Export Scan History</label>
                                    <span className="setting-desc">Download all your product scans as CSV</span>
                                </div>
                                <button className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <label className="setting-label">Export Reports</label>
                                    <span className="setting-desc">Download grade reports as PDF</span>
                                </div>
                                <button className="btn btn-secondary btn-sm"><Download size={14} /> Export PDF</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
