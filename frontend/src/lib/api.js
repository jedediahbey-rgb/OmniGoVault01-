/**
 * Centralized API Client for OmniGoVault
 * 
 * This module provides a pre-configured axios instance that automatically
 * includes authentication credentials with all requests. ALL API calls
 * in the application should use this client instead of raw fetch/axios.
 * 
 * Usage:
 *   import api from '../lib/api';
 *   
 *   // GET request
 *   const response = await api.get('/api/portfolios');
 *   
 *   // POST request
 *   const response = await api.post('/api/portfolios', { name: 'My Portfolio' });
 *   
 *   // With custom headers
 *   const response = await api.get('/api/omnibinder/schedules', {
 *     headers: { 'X-Workspace-ID': workspaceId }
 *   });
 */

import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with default configuration
const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, // CRITICAL: Always send cookies/credentials
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor for logging and adding common headers
api.interceptors.request.use(
  (config) => {
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      // Log error details
      console.error(`[API Error] ${status}:`, data?.detail || data?.message || 'Unknown error');
      
      // Handle authentication errors
      if (status === 401) {
        console.warn('[API] Authentication required - user may need to log in');
        // Could dispatch an event or redirect to login here if needed
      }
      
      // Handle forbidden errors
      if (status === 403) {
        console.warn('[API] Access denied - insufficient permissions');
      }
    } else if (error.request) {
      console.error('[API Error] No response received:', error.message);
    } else {
      console.error('[API Error] Request setup failed:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper function for file downloads (returns blob)
export const downloadFile = async (url, filename) => {
  const response = await api.get(url, {
    responseType: 'blob',
  });
  
  // Create download link
  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
  
  return response;
};

// Helper for multipart form data (file uploads)
export const uploadFile = async (url, formData, onProgress) => {
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress
      ? (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      : undefined,
  });
};

export default api;
