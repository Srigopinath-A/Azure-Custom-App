import React from 'react';
import { AuthProvider, useAuth } from './services/AuthContent';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

// A small component to handle the loading and routing logic
const AppRouter = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>Loading session...</p>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <LoginPage />;
};

function App() {
  return (
    <AuthProvider>
      <div className="bg-gray-900 min-h-screen font-sans">
        <AppRouter />
      </div>
    </AuthProvider>
  );
}

export default App;