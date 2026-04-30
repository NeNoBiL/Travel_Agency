// frontend/js/api.js
const API_BASE_URL = 'http://localhost:3000/api';

class API {
    static async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Произошла ошибка');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    static get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    static post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    
    static put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    static delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Tour API
const TourAPI = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return API.get(`/tours${params ? `?${params}` : ''}`);
    },
    
    getById: (id) => API.get(`/tours/${id}`),
    
    create: (tourData) => API.post('/tours', tourData),
    
    update: (id, tourData) => API.put(`/tours/${id}`, tourData),
    
    delete: (id) => API.delete(`/tours/${id}`)
};

// Booking API
const BookingAPI = {
    create: (bookingData) => API.post('/bookings', bookingData),
    
    getMyBookings: () => API.get('/bookings/my'),
    
    getAllBookings: () => API.get('/bookings/all'),
    
    // ОТМЕНА БРОНИРОВАНИЯ
    cancel: (bookingId) => API.delete(`/bookings/${bookingId}`)
};

// frontend/js/api.js - ДОБАВЬТЕ ЭТИ МЕТОДЫ В КОНЕЦ ФАЙЛА

// Auth API (добавить в существующий файл)
const AuthAPI = {
    login: (credentials) => API.post('/login', credentials),
    
    register: (userData) => API.post('/register', userData),
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },
    
    isAdmin: () => {
        const user = AuthAPI.getCurrentUser();
        return user && user.role === 'admin';
    }
};