import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with error status
            throw new Error(error.response.data.message || 'An error occurred');
        } else if (error.request) {
            // Request was made but no response
            throw new Error('No response from server. Please check your connection.');
        } else {
            // Something else happened
            throw new Error(error.message || 'An unexpected error occurred');
        }
    }
);

export const signup = async (userData) => {
    try {
        const response = await api.post('/auth/signup', userData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const signin = async (credentials) => {
    try {
        const response = await api.post('/auth/signin', credentials);
        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.message || 'Signin failed');
        }
    } catch (error) {
        throw error;
    }
};

export default api;
