import React, { useState, useEffect } from 'react';
import { getResources, exportResourcesAsCsv } from '../api';
import TagModal from './TagModal';

const ResourceManager = ({ onLogout }) => {
    const [resources, setResources] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedResource, setSelectedResource] = useState(null);

    const fetchResources = async () => {
        setIsLoading(true);
        setError('');
        const result = await getResources();
        if (result.ok) {
            const parsedResources = result.data.map(resStr => {
                 const parts = resStr.split(' | ');
                 const namePart = parts.length > 0 ? parts[0].split(': ')[1] : 'N/A';
                 const typePart = parts.length > 0 ? parts[0].split(': ')[0] : 'N/A';
                 const groupPart = parts.length > 2 ? parts[2].split(': ')[1] : 'N/A';
                 return { name: namePart, type: typePart, group: groupPart };
            });
            setResources(parsedResources);
        } else { setError(result.error); }
        setIsLoading(false);
    };

    useEffect(() => { fetchResources(); }, []);

    const handleExport = async () => {
        const result = await exportResourcesAsCsv();
        if (result.ok) {
            const url = window.URL.createObjectURL(result.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'azure-resources.csv';
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } else { setError('Failed to download CSV.'); }
    };

    return (
        <div className="app-container">
            <div className="toolbar">
                <h1>Azure Resource Manager</h1>
                <div>
                    <button onClick={fetchResources} disabled={isLoading}>Refresh</button>
                    <button onClick={handleExport}>Export to CSV</button>
                    <button onClick={onLogout}>Logout</button>
                </div>
            </div>
            {isLoading && <p>Loading resources...</p>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && !error && (
                <table>
                    <thead>
                        <tr><th>Name</th><th>Type</th><th>Resource Group</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {resources.map(res => (
                            <tr key={`${res.name}-${res.group}`}>
                                <td>{res.name}</td><td>{res.type}</td><td>{res.group}</td>
                                <td><button onClick={() => setSelectedResource(res.name)}>Manage Tags</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {selectedResource && <TagModal resourceName={selectedResource} onClose={() => setSelectedResource(null)} />}
        </div>
    );
};
export default ResourceManager;