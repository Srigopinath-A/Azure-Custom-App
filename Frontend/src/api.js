const request = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);

        // Handle responses that don't have a JSON body (e.g., 202 for pending login)
        if (response.status === 202 || response.status === 204) {
            return { ok: true, status: response.status, data: {} };
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/csv")) {
            return { ok: true, status: response.status, data: await response.blob() };
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }
        
        return { ok: true, status: response.status, data };

    } catch (error) {
        console.error("API call failed:", error);
        // This is where your specific error is coming from
        return { ok: false, error: error.message || "An unknown error occurred." };
    }
};

// --- LOGIN FLOW FUNCTIONS ---
export const checkSession = () => {
    return request('/api/check-session');
};

export const startLogin = (tenantId, subscriptionId) => {
    return request('/api/login/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, subscriptionId }),
    });
};

export const checkLoginStatus = (loginId, tenantId, subscriptionId) => {
    return request(`/api/login/check/${loginId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, subscriptionId }),
    });
};

export const logout = () => {
    return request('/api/logout', { method: 'POST' });
};


// --- RESOURCE MANAGEMENT FUNCTIONS ---
export const getResources = () => {
    return request('/api/resources');
};

export const exportResourcesAsCsv = () => {
    return request('/api/resources/csv');
};

export const getTagsForResource = (resourceName) => {
    return request(`/api/tags/${resourceName}`);
};

export const updateResourceTags = (resourceName, tags) => {
    return request('/api/resource/update-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceName, tags }),
    });
};