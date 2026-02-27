import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, Menu, LogOut, Loader2, Settings, CreditCard, ChevronDown, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession } from '../services/api';
import './Topbar.css';

// Mock notifications
const mockNotifications = [
    { id: 1, text: 'New A-grade product discovered!', time: '2m ago', unread: true },
    { id: 2, text: 'Your LED Lamp analysis is complete', time: '1h ago', unread: true },
    { id: 3, text: 'Market trend alert: Home Decor rising', time: '3h ago', unread: false },
    { id: 4, text: 'Weekly product report is ready', time: '1d ago', unread: false },
];

export default function Topbar({ collapsed, onMobileToggle }) {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchShake, setSearchShake] = useState(false);
    const [searchTooltip, setSearchTooltip] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [upgrading, setUpgrading] = useState(false);

    const searchDebounceRef = useRef(false);
    const searchInputRef = useRef(null);
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
        };
        // Global keyboard shortcut: Ctrl+K / Cmd+K to focus search
        const handleKeyboardShortcut = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyboardShortcut);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyboardShortcut);
        };
    }, []);

    const handleLogout = () => {
        setShowProfileMenu(false);
        logout();
        navigate('/login', { replace: true });
    };

    const handleSearch = () => {
        const query = searchQuery.trim();
        if (!query) {
            setSearchShake(true);
            setSearchTooltip('Enter a keyword to search');
            setTimeout(() => setSearchShake(false), 500);
            setTimeout(() => setSearchTooltip(''), 1500);
            return;
        }
        if (searchDebounceRef.current) return;
        searchDebounceRef.current = true;
        setSearching(true);
        navigate('/finder', { state: { keyword: query } });
        setTimeout(() => {
            setSearchQuery('');
            setSearching(false);
            searchDebounceRef.current = false;
        }, 300);
    };

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const data = await createCheckoutSession();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Upgrade redirect failed:', err);
            alert('Could not start checkout. Please try again later.');
        } finally {
            setUpgrading(false);
        }
    };

    const unreadCount = mockNotifications.filter(n => n.unread).length;

    return (
        <header className={`topbar ${collapsed ? 'collapsed' : ''}`}>
            <div className="topbar-left">
                <button className="mobile-menu-btn" onClick={onMobileToggle}>
                    <Menu size={20} />
                </button>
                <div className={`topbar-search ${searchShake ? 'shake' : ''}`}>
                    {searching
                        ? <Loader2 size={16} className="search-icon spin-icon" />
                        : <Search size={16} className="search-icon" />
                    }
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search products, trends, or enter URL..."
                        className="search-input"
                        value={searchQuery}
                        maxLength={200}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <kbd className="search-kbd">⌘K</kbd>
                    {searchTooltip && <span className="search-tooltip animate-fade-in">{searchTooltip}</span>}
                </div>
            </div>

            <div className="topbar-right">

                {/* Upgrade Button */}
                {isAuthenticated && user?.plan !== 'pro' && (
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleUpgrade}
                        disabled={upgrading}
                        style={{ marginRight: '1rem' }}
                    >
                        {upgrading ? <Loader2 size={14} className="spin-icon" /> : <Zap size={14} />}
                        Upgrade to Pro
                    </button>
                )}

                {/* Notification Bell */}
                <div className="topbar-dropdown-wrapper" ref={notifRef}>
                    <button
                        className={`topbar-btn ${showNotifications ? 'active' : ''}`}
                        title="Notifications"
                        onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && <span className="notification-dot"></span>}
                    </button>

                    {showNotifications && (
                        <div className="topbar-dropdown notif-dropdown animate-fade-in-up">
                            <div className="dropdown-header">
                                <span className="dropdown-title">Notifications</span>
                                {unreadCount > 0 && <span className="dropdown-badge">{unreadCount} new</span>}
                            </div>
                            <div className="dropdown-list">
                                {mockNotifications.map(n => (
                                    <div key={n.id} className={`dropdown-item ${n.unread ? 'unread' : ''}`}>
                                        <div className="dropdown-item-dot" />
                                        <div className="dropdown-item-content">
                                            <span className="dropdown-item-text">{n.text}</span>
                                            <span className="dropdown-item-time">{n.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="dropdown-footer">
                                <button className="dropdown-footer-btn" onClick={() => { setShowNotifications(false); navigate('/settings'); }}>View All Notifications</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="topbar-divider"></div>

                {/* Profile */}
                {isAuthenticated ? (
                    <div className="topbar-dropdown-wrapper" ref={profileRef}>
                        <div
                            className={`topbar-user ${showProfileMenu ? 'active' : ''}`}
                            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                        >
                            <div className="user-avatar">
                                <User size={16} />
                            </div>
                            <div className="user-info">
                                <span className="user-name">{user?.email || 'User'}</span>
                                <span className="user-plan">{user?.plan ? `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan` : 'Free Plan'}</span>
                            </div>
                            <ChevronDown size={14} className={`user-chevron ${showProfileMenu ? 'open' : ''}`} />
                        </div>

                        {showProfileMenu && (
                            <div className="topbar-dropdown profile-dropdown animate-fade-in-up">
                                <div className="dropdown-header">
                                    <span className="dropdown-title">{user?.email}</span>
                                    <span className="dropdown-badge">{user?.plan ? `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}` : 'Free'}</span>
                                </div>
                                <div className="dropdown-list">
                                    <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}>
                                        <Settings size={14} />
                                        <span className="dropdown-item-text">Account Settings</span>
                                    </div>
                                    <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}>
                                        <CreditCard size={14} />
                                        <span className="dropdown-item-text">Billing & Plan</span>
                                    </div>
                                </div>
                                <div className="dropdown-divider" />
                                <div className="dropdown-list">
                                    <div className="dropdown-item danger" onClick={handleLogout}>
                                        <LogOut size={14} />
                                        <span className="dropdown-item-text">Sign Out</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="topbar-user" onClick={() => navigate('/login')}>
                        <div className="user-avatar">
                            <User size={16} />
                        </div>
                        <div className="user-info">
                            <span className="user-name">Guest</span>
                            <span className="user-plan">Not signed in</span>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
