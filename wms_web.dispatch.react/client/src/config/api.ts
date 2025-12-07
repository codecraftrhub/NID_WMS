// API Configuration for WMS React App
// This configuration uses environment variables for flexibility across environments

/**
 * Get the API Base URL based on environment
 * Priority:
 * 1. REACT_APP_API_BASE_URL environment variable (from .env files)
 * 2. Fallback to production URL
 */
const getApiBaseUrl = (): string => {
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback: use proxy in development, production URL otherwise
  if (process.env.NODE_ENV === 'development') {
    return '/api';
  }

  // Important: production API is under /api path
  return 'https://plankton-app-d86df.ondigitalocean.app/api';  // Production URL
  // return 'http://localhost:5000/api';  // Development URL - commented out
};

/**
 * Get API timeout from environment or use default
 */
const getApiTimeout = (): number => {
  const envTimeout = process.env.REACT_APP_API_TIMEOUT;
  return envTimeout ? parseInt(envTimeout, 10) : 15000;
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: getApiTimeout(),
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * Build a complete API URL from an endpoint
 * @param endpoint - API endpoint (e.g., 'Auth/login' or '/Parcels')
 * @returns Complete API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL.slice(0, -1) 
    : API_CONFIG.BASE_URL;
  
  const cleanEndpoint = endpoint.startsWith('/') 
    ? endpoint.slice(1) 
    : endpoint;
  
  return `${baseUrl}/${cleanEndpoint}`;
};

/**
 * Get headers with authentication token if available
 * @returns Headers object with Content-Type, Accept, and Authorization (if token exists)
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token') || 
                localStorage.getItem('auth_token') || 
                sessionStorage.getItem('auth_token');
  
  const headers: Record<string, string> = { ...API_CONFIG.HEADERS };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

