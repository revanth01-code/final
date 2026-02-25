import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // upon mount, figure out if this tab has a current role and token
    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const STORAGE_KEY = (role) => `token_${role}`;

    /**
     * Read token for current tab role from sessionStorage, fall back to nothing.
     */
    const getCurrentToken = () => {
        const role = sessionStorage.getItem('currentRole');
        if (role) {
            return localStorage.getItem(STORAGE_KEY(role));
        }
        return null;
    };

    const checkAuth = async () => {
        const token = getCurrentToken();
        if (token) {
            try {
                const response = await getMe();
                setUser(response.data.user);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Auth check failed:', error);
                // remove invalid token for this role
                const role = sessionStorage.getItem('currentRole');
                if (role) {
                    localStorage.removeItem(STORAGE_KEY(role));
                }
                sessionStorage.removeItem('currentRole');
                setUser(null);
                setIsAuthenticated(false);
            }
        } else {
            // no token for this tab, remain unauthenticated
            setUser(null);
            setIsAuthenticated(false);
        }
        setLoading(false);
    };

    /**
     * Store the received JWT and remember which role is active in this tab
     */
    const login = (userData, rawToken) => {
        if (userData && userData.role && rawToken) {
            localStorage.setItem(STORAGE_KEY(userData.role), rawToken);
            sessionStorage.setItem('currentRole', userData.role);
        }
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        // clear only the token used by this tab
        const role = sessionStorage.getItem('currentRole');
        if (role) {
            localStorage.removeItem(STORAGE_KEY(role));
        }
        sessionStorage.removeItem('currentRole');
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/login';
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};