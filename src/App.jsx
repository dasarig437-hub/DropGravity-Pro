import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PageTransition from './components/PageTransition';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Finder from './pages/Finder';
import SettingsPage from './pages/Settings';
import Compare from './pages/Compare';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}

export default function App() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const location = useLocation();

    // Auth pages get a clean layout (no sidebar/topbar)
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    if (isAuthPage) {
        return (
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
                    <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
                </Routes>
            </AnimatePresence>
        );
    }

    return (
        <div className="app-layout">
            <div className="page-bg-mesh" />
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className={`main-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <Topbar collapsed={sidebarCollapsed} />
                <div className="page-content">
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                            <Route path="/dashboard" element={
                                <ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>
                            } />
                            <Route path="/finder" element={
                                <ProtectedRoute><PageTransition><Finder /></PageTransition></ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                                <ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>
                            } />
                            <Route path="/compare" element={
                                <ProtectedRoute><PageTransition><Compare /></PageTransition></ProtectedRoute>
                            } />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
