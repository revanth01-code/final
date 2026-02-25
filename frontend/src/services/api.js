import axios from 'axios';

const ENV_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = ENV_URL.endsWith('/api') ? ENV_URL : `${ENV_URL}/api`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests automatically
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// global response interceptor to handle auth failures
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // remove invalid token and force logout
            localStorage.removeItem('token');
            // optional: could also clear any in-memory auth state via event
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth APIs
// registration endpoint is not used in demo builds
export const register = () => Promise.reject(new Error('Registration disabled in demo mode'));
export const login = (credentials) => api.post('/auth/login', credentials);
export const getMe = () => api.get('/auth/me');

// Hospital APIs
export const getAllHospitals = () => api.get('/hospitals');
export const getHospital = (id) => api.get(`/hospitals/${id}`);
export const createHospital = (data) => api.post('/hospitals', data);
export const updateHospital = (id, data) => api.put(`/hospitals/${id}`, data);
export const deleteHospital = (id) => api.delete(`/hospitals/${id}`);

// Request APIs
export const getRecommendations = (data) => api.post('/requests/recommend', data);
export const createRequest = (data) => api.post('/requests', data);
export const getRequest = (id) => api.get(`/requests/${id}`);
export const updateRequest = (id, data) => api.put(`/requests/${id}`, data);
export const getAllRequests = (params) => api.get('/requests', { params });

// Optimized Routing APIs (New Features)
export const calculateOptimalRoute = (data) => api.post('/optimized-routing/calculate', data);
export const confirmHospital = (data) => api.post('/optimized-routing/confirm', data);
export const updateLocation = (data) => api.put('/optimized-routing/track-location', data);
export const acknowledgeDeviation = (data) => api.post('/optimized-routing/deviation-acknowledge', data);
export const resolveDeviation = (data) => api.post('/optimized-routing/deviation-resolve', data);
export const completeTrip = (data) => api.put('/optimized-routing/complete', data);
export const getTrackingStatus = (requestId) => api.get(`/optimized-routing/status/${requestId}`);
export const getActiveTracked = () => api.get('/optimized-routing/active-tracked');
export const getAuditTrail = (requestId) => api.get(`/optimized-routing/audit/${requestId}`);

export default api;
