import axios from 'axios';

// Create an Axios instance with base configuration
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8080/api', // Your Spring Boot backend URL
  withCredentials: true, // IMPORTANT: This sends cookies for session management
});

// --- Authentication Flow ---

export const startLogin = (tenantId, subscriptionId) => {
  return apiClient.post('/login/start', { tenantId, subscriptionId });
};

export const checkLoginStatus = (loginId, tenantId, subscriptionId) => {
  return apiClient.post(`/login/check/${loginId}`, { tenantId, subscriptionId });
};

export const checkSession = () => {
  return apiClient.get('/check-session');
};

export const logout = () => {
  return apiClient.post('/logout');
};

// --- Resource Management ---

export const fetchResources = () => {
  return apiClient.get('/resources');
};

export const fetchTagsForResource = (resourceName) => {
  // The resourceName might contain characters that need encoding in a URL
  return apiClient.get(`/tags/${encodeURIComponent(resourceName)}`);
};

export const updateTagsForResource = (resourceName, tags) => {
  return apiClient.post('/resource/update-tags', { resourceName, tags });
};

export const downloadResourcesCSV = async () => {
  const response = await apiClient.get('/resources/csv', {
    responseType: 'blob', // Important to handle the file download
  });
  // Create a link to trigger the download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'azure-resources.csv');
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
};