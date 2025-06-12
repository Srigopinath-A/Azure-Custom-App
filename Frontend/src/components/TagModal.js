import React, { useState, useEffect } from 'react';
import { getTagsForResource, updateResourceTags } from '../api';

const TagModal = ({ resourceName, onClose }) => {
    const [tags, setTags] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTags = async () => {
            setIsLoading(true);
            const result = await getTagsForResource(resourceName);
            if (result.ok) {
                setTags(result.data || {});
            } else {
                setError(result.error);
            }
            setIsLoading(false);
        };
        fetchTags();
    }, [resourceName]);

    const handleTagChange = (oldKey, newKey, newValue) => {
        const newTags = { ...tags };
        if (oldKey !== newKey) {
            delete newTags[oldKey];
        }
        if (newKey) {
            newTags[newKey] = newValue;
        }
        setTags(newTags);
    };

    const handleRemoveTag = (keyToRemove) => {
        const { [keyToRemove]: _, ...remainingTags } = tags;
        setTags(remainingTags);
    };

    const handleAddTag = () => {
        const newKey = `__new_tag_${Date.now()}`;
        setTags({ ...tags, [newKey]: '' });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setError('');

        const finalTags = Object.entries(tags).reduce((acc, [key, value]) => {
            if (key && !key.startsWith('__new_tag')) {
                acc[key] = value;
            }
            return acc;
        }, {});


        const result = await updateResourceTags(resourceName, finalTags);
        if (result.ok) {
            onClose();
        } else {
            setError(result.error);
        }
        setIsSaving(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <span className="modal-close-btn" onClick={onClose}>&times;</span>
                <h2>Manage Tags for <strong>{resourceName}</strong></h2>
                <div className="modal-body">
                    {isLoading ? <p>Loading tags...</p> : (
                        <div id="current-tags">
                            {Object.entries(tags).length === 0 && <p>No tags found.</p>}
                            {Object.entries(tags).map(([key, value]) => (
                                <div className="tag-row" key={key}>
                                    <input
                                        type="text"
                                        placeholder="Key"
                                        defaultValue={key.startsWith('__new_tag') ? '' : key}
                                        onChange={(e) => handleTagChange(key, e.target.value.trim(), value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Value"
                                        value={value}
                                        onChange={(e) => handleTagChange(key, key, e.target.value)}
                                    />
                                    <button className="remove-tag-btn" onClick={() => handleRemoveTag(key)}>Remove</button>
                                </div>
                            ))}
                            <button onClick={handleAddTag}>Add Tag</button>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    {error && <p className="error-message">{error}</p>}
                    <button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagModal;