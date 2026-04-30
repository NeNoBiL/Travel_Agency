// frontend/js/auth.js
const AuthManager = {
    isAuthenticated: function() {
        return !!localStorage.getItem('token');
    },
    
    getUser: function() {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },
    
    getToken: function() {
        return localStorage.getItem('token');
    },
    
    setToken: function(token) {
        localStorage.setItem('token', token);
    },
    
    setUser: function(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    
    isAdmin: function() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },
    
    logout: function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    },
    
    // Функция для обработки ответа от сервера при логине
    handleLoginResponse: function(response) {
        if (response.success && response.data) {
            this.setToken(response.data.token);
            this.setUser(response.data.user);
            return true;
        }
        return false;
    }
};

// Обработчики форм на страницах логина и регистрации
document.addEventListener('DOMContentLoaded', function() {
    // Форма входа
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error-message');
            
            try {
                const response = await AuthAPI.login({ username, password });
                if (response.success) {
                    AuthManager.handleLoginResponse(response);
                    window.location.href = '/index.html';
                } else {
                    errorDiv.textContent = response.error || 'Ошибка входа';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        });
    }
    
    // Форма регистрации
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorDiv = document.getElementById('error-message');
            
            if (password !== confirmPassword) {
                errorDiv.textContent = 'Пароли не совпадают';
                errorDiv.style.display = 'block';
                return;
            }
            
            try {
                const response = await AuthAPI.register({ username, email, password });
                if (response.success) {
                    window.location.href = '/login.html?registered=true';
                } else {
                    errorDiv.textContent = response.error || 'Ошибка регистрации';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        });
    }
});