import React, { useState, useEffect, useRef } from 'react';
import { startLogin, checkLoginStatus } from '../api';

const Login = ({ onLoginSuccess }) => {
    const [tenantId, setTenantId] = useState('');
    const [subscriptionId, setSubscriptionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [deviceCodeInfo, setDeviceCodeInfo] = useState(null);
    const pollingIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setIsLoading(true); setDeviceCodeInfo(null);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        const result = await startLogin(tenantId, subscriptionId);
        if (result.ok) {
            setDeviceCodeInfo(result.data.deviceCodeInfo);
            startPolling(result.data.loginId);
        } else {
            setError(result.error); setIsLoading(false);
        }
    };

    const startPolling = (loginId) => {
        pollingIntervalRef.current = setInterval(async () => {
            const result = await checkLoginStatus(loginId, tenantId, subscriptionId);
            if (result.status === 200) {
                clearInterval(pollingIntervalRef.current); onLoginSuccess();
            } else if (result.status !== 202) {
                clearInterval(pollingIntervalRef.current);
                setError(result.error || 'Login failed or expired.');
                setIsLoading(false); setDeviceCodeInfo(null);
            }
        }, 3000);
    };

    return (
        <div className="login-container">
            <h2>Login to Azure</h2>
            <form onSubmit={handleLogin}>
                <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Enter Tenant ID" disabled={isLoading} required />
                <input type="text" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} placeholder="Enter Subscription ID" disabled={isLoading} required />
                <button type="submit" disabled={isLoading}>{isLoading ? 'Waiting for Sign-in...' : 'Login'}</button>
            </form>
            {error && <p className="error-message">{error}</p>}
            {deviceCodeInfo && (
                <div className="device-code-info">
                    <p dangerouslySetInnerHTML={{ __html: deviceCodeInfo.message.replace(deviceCodeInfo.verificationUrl, `<a href="https://${deviceCodeInfo.verificationUrl}" target="_blank">${deviceCodeInfo.verificationUrl}</a>`) }}></p>
                    <div className="code-box">
                       <span>User Code: <strong>{deviceCodeInfo.userCode}</strong></span>
                        <button onClick={() => navigator.clipboard.writeText(deviceCodeInfo.userCode)}>Copy</button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Login;