import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../services/AuthContent';
import { startLogin, checkLoginStatus } from '../services/api';
import { BriefcaseIcon, Spinner } from './Icon';

const LoginPage = () => {
    const { login } = useAuth();
    const pollingInterval = useRef(null);

    // UI State
    const [tenantId, setTenantId] = useState('');
    const [subscriptionId, setSubscriptionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Login Flow State
    const [loginId, setLoginId] = useState(null);
    const [deviceCodeInfo, setDeviceCodeInfo] = useState(null);
    const [pollingStatus, setPollingStatus] = useState('');

    useEffect(() => {
        if (!loginId) return;

        const poll = async () => {
            try {
                setPollingStatus('Polling for completion...');
                const response = await checkLoginStatus(loginId, tenantId, subscriptionId);
                
                if (response.data.message === "Authentication successful!") {
                    clearInterval(pollingInterval.current);
                    setPollingStatus('Success! Logging you in.');
                    login();
                }
            } catch (err) {
                if (err.response?.data?.status === "PENDING") {
                    // This is normal, continue polling.
                } else {
                    setError('An error occurred during polling. Please try again.');
                    clearInterval(pollingInterval.current);
                }
            }
        };

        pollingInterval.current = setInterval(poll, 5000);
        return () => clearInterval(pollingInterval.current);
    }, [loginId, tenantId, subscriptionId, login]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!tenantId || !subscriptionId) {
            setError('Tenant ID and Subscription ID are required.');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const response = await startLogin(tenantId, subscriptionId);
            setDeviceCodeInfo(response.data.deviceCodeInfo);
            setLoginId(response.data.loginId);
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'A fatal error occurred. Check browser and server console.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Code copied to clipboard!');
    };

    // --- REAL JSX TO RENDER ---

    if (deviceCodeInfo) {
        // This is the screen to show the user the device code
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
                <div className="w-full max-w-lg bg-gray-800 p-8 rounded-xl shadow-2xl text-white border border-gray-700">
                    <h2 className="text-2xl font-bold text-center text-cyan-400 mb-4">Complete Your Authentication</h2>
                    <p className="text-center text-gray-300 mb-6">{deviceCodeInfo.message}</p>
                    <div className='text-center my-6'>
                        <p className='text-gray-400'>Your code:</p>
                        <div className="bg-gray-900 text-3xl font-mono tracking-widest p-4 rounded-lg my-2 inline-block cursor-pointer
                                        border border-dashed border-gray-600 hover:border-cyan-400 transition"
                             onClick={() => copyToClipboard(deviceCodeInfo.userCode)}>
                            {deviceCodeInfo.userCode}
                        </div>
                         <p className='text-xs text-gray-500'>(Click code to copy)</p>
                    </div>
                    <a href={deviceCodeInfo.verificationUrl} target="_blank" rel="noopener noreferrer" 
                       className="block w-full text-center bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition mt-2">
                      Open Verification Page
                    </a>
                    <div className="mt-8 text-center flex items-center justify-center space-x-2 text-yellow-400">
                      <Spinner />
                      <span>{pollingStatus || "Waiting for you to complete sign-in..."}</span>
                    </div>
                </div>
            </div>
        );
    }

    // This is the initial login form
    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-2xl text-white border border-gray-700">
                <div className="text-center mb-8">
                    <BriefcaseIcon className="h-12 w-12 mx-auto text-cyan-400 mb-4" />
                    <h1 className="text-3xl font-bold">Azure Resource Manager</h1>
                    <p className="text-gray-400">Please provide your credentials to continue</p>
                </div>                
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="tenantId">Tenant ID</label>
                        <input id="tenantId" type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="subscriptionId">Subscription ID</label>
                        <input id="subscriptionId" type="text" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                    </div>
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="flex items-center justify-center">
                        <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition 
                                     disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
                            {isLoading && <Spinner />}
                            {isLoading ? 'Connecting...' : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;