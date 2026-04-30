// frontend/js/tests/tests.js
// Тестирование фронтэнда (Unit, Mock тестирование)

describe('Tour Validation Tests', () => {
    test('should validate correct tour data', () => {
        const validTour = {
            title: 'Test Tour',
            description: 'This is a valid tour description',
            country: 'France',
            city: 'Paris',
            duration_days: 7,
            price: 1000,
            max_participants: 20,
            available_seats: 15
        };
        
        const errors = validateTourData(validTour);
        expect(errors.length).toBe(0);
    });
    
    test('should reject tour with invalid title', () => {
        const invalidTour = {
            title: 'Te',
            description: 'Valid description',
            country: 'France',
            city: 'Paris',
            duration_days: 7,
            price: 1000,
            max_participants: 20,
            available_seats: 15
        };
        
        const errors = validateTourData(invalidTour);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('минимум 3 символа');
    });
});

describe('Booking Validation Tests', () => {
    test('should validate correct booking data', () => {
        const testStrategy = new BookingValidationStrategy();
        const errors = testStrategy.validate({ participants_count: 2 });
        expect(errors.length).toBe(0);
    });
    
    test('should reject booking with too many participants', () => {
        const testStrategy = new BookingValidationStrategy();
        const errors = testStrategy.validate({ participants_count: 15 });
        expect(errors.length).toBeGreaterThan(0);
    });
});

describe('Auth Manager Tests', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    
    test('should store token after login', () => {
        const token = 'test-token';
        AuthManager.setToken(token);
        expect(localStorage.getItem('token')).toBe(token);
    });
    
    test('should correctly identify authenticated user', () => {
        expect(AuthManager.isAuthenticated()).toBe(false);
        AuthManager.setToken('token');
        expect(AuthManager.isAuthenticated()).toBe(true);
    });
    
    test('should clear storage on logout', () => {
        AuthManager.setToken('token');
        AuthManager.setUser({ username: 'test' });
        AuthManager.logout();
        expect(AuthManager.isAuthenticated()).toBe(false);
        expect(AuthManager.getUser()).toBeNull();
    });
});

// Mock API тесты
jest.mock('../../api.js');

describe('API Integration Tests', () => {
    test('should fetch tours successfully', async () => {
        const mockTours = [
            { id: 1, title: 'Tour 1', price: 1000 },
            { id: 2, title: 'Tour 2', price: 2000 }
        ];
        
        TourAPI.getAll.mockResolvedValue({ success: true, data: mockTours });
        
        const response = await TourAPI.getAll();
        expect(response.success).toBe(true);
        expect(response.data.length).toBe(2);
    });
    
    test('should handle API error gracefully', async () => {
        TourAPI.getAll.mockRejectedValue(new Error('Network error'));
        
        await expect(TourAPI.getAll()).rejects.toThrow('Network error');
    });
});