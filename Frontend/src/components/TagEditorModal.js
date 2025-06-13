import React, { useState, useEffect, useCallback } from 'react';
import { fetchTagsForResource, updateTagsForResource } from '../services/api';
import { Spinner } from './Icon';

const TagEditorModal = ({ resourceName, onClose }) => {
    const [tags, setTags] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    
    // For adding new tags
    const [newTagKey, setNewTagKey] = useState('');
    const [newTagValue, setNewTagValue] = useState('');

    const loadTags = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetchTagsForResource(resourceName);
            setTags(response.data || {});
        } catch (err) {
            setError('Failed to load tags.');
        } finally {
            setIsLoading(false);
        }
    }, [resourceName]);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    const handleTagChange = (key, value) => {
        setTags(prev => ({ ...prev, [key]: value }));
    };

    const handleRemoveTag = (keyToRemove) => {
        const { [keyToRemove]: _, ...remainingTags } = tags;
        setTags(remainingTags);
    };

    const handleAddTag = () => {
        if (!newTagKey || !newTagValue) {
            alert('Both tag key and value are required.');
            return;
        }
        if (tags.hasOwnProperty(newTagKey)) {
            alert('This tag key already exists. Please use a unique key.');
            return;
        }
        handleTagChange(newTagKey, newTagValue);
        setNewTagKey('');
        setNewTagValue('');
    };

    const handleSaveChanges = async () => {
        setIsUpdating(true);
        setError('');
        try {
            await updateTagsForResource(resourceName, tags);
            onClose(true); // pass true to indicate an update happened
        } catch (err) {
            setError('Failed to update tags. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Edit Tags</h2>
                    <p className="text-cyan-400 truncate">{resourceName}</p>
               </div>

                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Spinner /> <span className="ml-3 text-gray-400">Loading tags...</span>
                        </div>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : (
                        <>
                            {Object.entries(tags).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(tags).map(([key, value]) => (
                                        <div key={key} className="flex items-center space-x-3">
                                            <input type="text" value={key} readOnly className="w-1/3 px-3 py-2 bg-gray-900 text-gray-400 rounded-lg cursor-not-allowed" />
                                            <input type="text" value={value} onChange={(e) => handleTagChange(key, e.target.value)} className="flex-grow px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                            <button onClick={() => handleRemoveTag(key)} className="text-red-500 hover:text-red-400 font-bold text-2xl">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">This resource has no tags.</p>
                            )}

                             {/* --- Add New Tag Section --- */}
                            <div className="mt-8 pt-6 border-t border-gray-600">
                                <h3 className="text-lg font-semibold text-white mb-3">Add a new tag</h3>
                                <div className="flex items-center space-x-3">
                                    <input type="text" value={newTagKey} onChange={e => setNewTagKey(e.target.value)} placeholder="Tag Key (e.g., 'environment')" className="w-1/3 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                    <input type="text" value={newTagValue} onChange={e => setNewTagValue(e.target.value)} placeholder="Tag Value (e.g., 'production')" className="flex-grow px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                    <button onClick={handleAddTag} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">+</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                {isUpdating && <p className="text-yellow-400 text-center pb-4">Saving changes...</p>}
                {error && <p className="text-red-500 text-center pb-4">{error}</p>}
                
                <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
                    <button onClick={() => onClose(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handleSaveChanges} disabled={isUpdating} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-500">
                        {isUpdating && <Spinner />} Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagEditorModal;