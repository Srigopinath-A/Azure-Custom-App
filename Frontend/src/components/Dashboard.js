import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/AuthContent';
import { fetchResources, downloadResourcesCSV } from '../services/api';
import { Spinner, BriefcaseIcon } from './Icon';
import TagEditorModal from './TagEditorModal';

const Dashboard = () => {
    const { logout } = useAuth();
    const [resources, setResources] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    
    // State for the modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedResourceName, setSelectedResourceName] = useState(null);

    const loadResources = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetchResources();
            setResources(response.data);
        } catch (err) {
            setError('Failed to fetch resources. Your session may have expired.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadResources();
    }, [loadResources]);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await downloadResourcesCSV();
        } catch (err) {
            alert('Failed to download CSV.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleResourceClick = (resourceName) => {
        setSelectedResourceName(resourceName);
        setIsModalOpen(true);
    };
    
    // Callback to refresh data after modal closes
    const onModalClose = (didUpdate) => {
        setIsModalOpen(false);
        setSelectedResourceName(null);
        if (didUpdate) {
            // In a real app, you'd be more specific, but for now, just reload all
            loadResources(); 
        }
    };

    // Helper to parse the resource string from the backend
    const parseResourceString = (resourceString) => {
        const parts = resourceString.split(' | ').reduce((acc, part) => {
            const [key, value] = part.split(': ');
            acc[key.toLowerCase()] = value;
            return acc;
        }, {});
        return parts;
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                    <BriefcaseIcon className="h-8 w-8 text-cyan-400" />
                    <h1 className="text-3xl font-bold text-white">Azure Resources</h1>
                </div>
                <button
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                    Logout
                </button>
            </header>

            {error && <p className="text-red-500 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}

            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-200">Your Resources ({resources.length})</h2>
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition
                                   disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                         {isDownloading && <Spinner />}
                         <span>Download CSV</span>
                    </button>
                </div>
                
                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Spinner /><span className="ml-3 text-gray-400">Loading resources...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-gray-300">
                            <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Resource Group</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resources.map((res, index) => {
                                    const { name, type, group } = parseResourceString(res);
                                    return (
                                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="px-6 py-4 font-medium text-white">{name}</td>
                                            <td className="px-6 py-4">{type}</td>
                                            <td className="px-6 py-4">{group}</td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => handleResourceClick(name)}
                                                    className="font-medium text-cyan-400 hover:underline">
                                                    View/Edit Tags
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {resources.length === 0 && <p className="text-center py-10 text-gray-500">No resources found.</p>}
                    </div>
                )}
            </div>
             {isModalOpen && (
                <TagEditorModal 
                    resourceName={selectedResourceName} 
                    onClose={onModalClose} 
                />
            )}
        </div>
    );
};

export default Dashboard;