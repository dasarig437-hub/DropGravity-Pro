import { createContext, useContext, useState, useEffect } from 'react';
import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    getToken,
    getUser,
    fetchCurrentUser,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getUser());
    const [token, setToken] = useState(() => getToken());

    const isAuthenticated = !!token;

    // Listen for forced logout (e.g. 401 from API)
    useEffect(() => {
        const handleLogout = () => {
            setUser(null);
            setToken(null);
        };
        window.addEventListener('dg:logout', handleLogout);
        return () => window.removeEventListener('dg:logout', handleLogout);
    }, []);

    async function login(email, password) {
        const data = await apiLogin(email, password);
        setUser(data.user);
        setToken(data.token);
        return data;
    }

    async function register(email, password) {
        const data = await apiRegister(email, password);
        setUser(data.user);
        setToken(data.token);
        return data;
    }

    function logout() {
        apiLogout();
        setUser(null);
        setToken(null);
    }

    async function refreshUser() {
        try {
            const data = await fetchCurrentUser();
            setUser(data.user);
            setToken(data.token);
            return data;
        } catch (err) {
            console.error('Failed to refresh user:', err);
        }
    }

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
