import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
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
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Routes>
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
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/dashboard" element={
                            <ProtectedRoute><Dashboard /></ProtectedRoute>
                        } />
                        <Route path="/finder" element={
                            <ProtectedRoute><Finder /></ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute><SettingsPage /></ProtectedRoute>
                        } />
                        <Route path="/compare" element={
                            <ProtectedRoute><Compare /></ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}
