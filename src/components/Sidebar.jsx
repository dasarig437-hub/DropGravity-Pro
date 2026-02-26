import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
    LayoutDashboard, Home, Search, Settings, ChevronLeft,
    ChevronRight, Zap, TrendingUp, Crown, HelpCircle, GitCompareArrows
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/finder', icon: Search, label: 'Product Finder' },
    { path: '/compare', icon: GitCompareArrows, label: 'Compare' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed, onToggle }) {
    const { user } = useAuth();
    const showUpgrade = !user?.plan || user.plan === 'free';

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-inner">
                {/* Logo — clickable, navigates home */}
                <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
                    <div className="logo-icon">
                        <Zap size={22} />
                    </div>
                    {!collapsed && (
                        <div className="logo-text">
                            <span className="logo-name">DropGravity</span>
                            <span className="logo-badge">PRO</span>
                        </div>
                    )}
                </Link>

                {/* Nav Links */}
                <nav className="sidebar-nav">
                    <div className="nav-section-label">{!collapsed && 'MAIN MENU'}</div>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Upgrade CTA */}
                {!collapsed && showUpgrade && (
                    <div className="sidebar-upgrade">
                        <div className="upgrade-card">
                            <Crown size={20} className="upgrade-icon" />
                            <div className="upgrade-text">
                                <strong>Upgrade to Pro</strong>
                                <span>Unlimited scans & AI insights</span>
                            </div>
                            <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => window.location.href = '/settings'}>
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                )}

                {/* Collapse Toggle */}
                <button className="sidebar-toggle" onClick={onToggle}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
    );
}
