// Centralized API Configuration for LegalMetrix
// Reads VITE_API_BASE_URL from Vite environment (production: https://legalmetrix-qjt1.onrender.com)
const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

// Root URL of backend (e.g. 'https://legalmetrix-qjt1.onrender.com' or empty string in local proxy dev)
export const API_ROOT_URL = RAW_BASE_URL.replace(/\/api(\/v1)?$/, '');

// API v1 prefix URL (e.g. 'https://legalmetrix-qjt1.onrender.com/api/v1' or '/api/v1')
export const API_BASE_URL = RAW_BASE_URL
  ? (RAW_BASE_URL.endsWith('/api/v1') ? RAW_BASE_URL : `${API_ROOT_URL}/api/v1`)
  : '/api/v1';

/**
 * Resolves an endpoint to a fully qualified URL based on the centralized configuration.
 * Handles root endpoints (/verify/...), absolute HTTP URLs, and API v1 endpoints.
 */
export function getEndpointUrl(endpoint) {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (normalizedPath.startsWith('/verify') || normalizedPath.startsWith('/api')) {
    return `${API_ROOT_URL}${normalizedPath}`;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('legalmetrix_token');
  const headers = { ...options.headers };

  // For public verification endpoints or if skipAuth is explicitly requested, do not attach bearer token
  const isPublic = endpoint.startsWith('/verify') || endpoint.startsWith('verify') || options.skipAuth;

  if (token && !headers['Authorization'] && !isPublic) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = getEndpointUrl(endpoint);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = response.statusText;
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return response;
}
