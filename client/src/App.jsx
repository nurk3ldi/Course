import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Client from './pages/Client';
import Course from './pages/Course';

const ProtectedRoute = ({ children, role }) => {
    const { user } = useContext(AuthContext);
    if (!user) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to="/" />;
    return children;
};

function AppRoutes() {
    const { user } = useContext(AuthContext);
    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'admin' ? '/admin' : '/client'} />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to={user.role === 'admin' ? '/admin' : '/client'} />} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
            <Route path="/client" element={<ProtectedRoute role="client"><Client /></ProtectedRoute>} />
            <Route path="/course/:id" element={<ProtectedRoute><Course /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}