import React, { useState, useEffect } from 'react';
import { checkSession, logout } from './api';
import Login from './components/Login';
import ResourceManager from './components/ResourceManager';
import './App.css';

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isSessionChecked, setIsSessionChecked] = useState(false);

    // On first load, check if we already have a valid session on the backend
    useEffect(() => {
        const verifySession = async () => {
            const result = await checkSession();
            if (result.ok) {
                setIsLoggedIn(true);
            }
            setIsSessionChecked(true); // Stop showing the loading screen
        };
        verifySession();
    }, []);

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = async () => {
        await logout();
        setIsLoggedIn(false);
    };

    // Show a loading message until the initial session check is complete
    if (!isSessionChecked) {
        return <div className="loading-screen">Checking session...</div>;
    }

    return (
        <div className="App">
            {isLoggedIn ? (
                <ResourceManager onLogout={handleLogout} />
            ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
};

export default App;