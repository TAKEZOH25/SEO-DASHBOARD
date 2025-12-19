import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    // Check Local Storage on mount
    useEffect(() => {
        const stored = localStorage.getItem('gsc_user');
        if (stored) {
            const parsedUser = JSON.parse(stored);
            // Simple expiry check (1 hour)
            const now = new Date().getTime();
            if (now - parsedUser.timestamp < 3600 * 1000) {
                setUser(parsedUser);
            } else {
                localStorage.removeItem('gsc_user');
            }
        }
    }, []);

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            const userData = { ...codeResponse, timestamp: new Date().getTime() };
            setUser(userData);
            localStorage.setItem('gsc_user', JSON.stringify(userData));
        },
        onError: (error) => console.log('Login Failed:', error),
        scope: 'https://www.googleapis.com/auth/webmasters.readonly'
    });

    const logout = () => {
        setUser(null);
        localStorage.removeItem('gsc_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
