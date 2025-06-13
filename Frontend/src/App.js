import React from 'react';
import { AuthProvider, useAuth } from './services/AuthContent';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

// This router is now much simpler.
const AppRouter = () => {
  // It only cares about one thing: is the user authenticated?
  const { isAuthenticated } = useAuth();

  // If authenticated, show Dashboard. If not, show LoginPage.
  // The concept of a global "loading..." screen is gone.
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