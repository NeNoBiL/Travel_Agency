// frontend/js/main.js
let currentUser = null;
let allTours = [];

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Кешируем DOM элементы
let cachedHeroSection = null;
let cachedToursContainer = null;

async function loadTours(showHero = true) {
    try {
        const response = await TourAPI.getAll();
        if (response.success) {
            allTours = response.data;
            displayTours(allTours, showHero);
        }
    } catch (error) {
        showToast('Ошибка загрузки туров: ' + error.message, 'error');
    }
}

function displayTours(tours, showHero = true) {
    const container = document.getElementById('tours-container');
    if (!container) return;
    
    // Получаем hero секцию один раз и кешируем
    if (!cachedHeroSection) {
        cachedHeroSection = document.querySelector('.hero-section');
    }
    
    // Плавно показываем/скрываем hero секцию
    if (cachedHeroSection) {
        if (showHero) {
            cachedHeroSection.style.display = 'block';
            setTimeout(() => {
                cachedHeroSection.style.opacity = '1';
            }, 10);
            cachedHeroSection.style.opacity = '1';
        } else {
            cachedHeroSection.style.opacity = '0';
            setTimeout(() => {
                cachedHeroSection.style.display = 'none';
                cachedHeroSection.style.opacity = '1';
            }, 300);
        }
    }
    
    if (tours.length === 0) {
        container.innerHTML = '<div class="container"><p>😔 Туров пока нет. Зайдите позже.</p></div>';
        return;
    }
    
    const scrollPosition = window.scrollY;
    
    container.innerHTML = `
        <div class="tours-grid">
            ${tours.map(tour => `
                <div class="tour-card">
                    <img src="${tour.image_url || 'https://via.placeholder.com/350x200?text=No+Image'}" alt="${tour.title}" class="tour-image" onerror="this.src='https://via.placeholder.com/350x200?text=Image+not+found'">
                    <div class="tour-content">
                        <h3 class="tour-title">${escapeHtml(tour.title)}</h3>
                        <div class="tour-location">📍 ${escapeHtml(tour.country)}, ${escapeHtml(tour.city)}</div>
                        <div class="tour-details">
                            <span>📅 ${tour.duration_days} дней</span>
                            <span>👥 ${tour.available_seats}/${tour.max_participants} мест</span>
                        </div>
                        <div class="tour-price">${tour.price.toLocaleString()} ₽</div>
                        ${AuthManager.isAuthenticated() && !AuthManager.isAdmin() ? 
                            `<button class="btn btn-primary" onclick="openBookingModal(${tour.id})">📅 Забронировать</button>` : 
                            (!AuthManager.isAuthenticated() ? 
                                `<button class="btn btn-secondary" onclick="window.location.href='login.html'">🔒 Войдите для бронирования</button>` : 
                                (AuthManager.isAdmin() ? `<button class="btn btn-secondary" disabled>👑 Админ</button>` : ''))
                        }
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    window.scrollTo(0, scrollPosition);
}

function displayUserBookings(bookings) {
    const container = document.getElementById('tours-container');
    if (!container) return;
    
    // Скрываем hero секцию
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) heroSection.style.display = 'none';
    
    // Фильтруем ТОЛЬКО активные бронирования (не отмененные)
    const activeBookings = bookings.filter(booking => booking.status !== 'cancelled');
    
    if (activeBookings.length === 0) {
        container.innerHTML = `
            <div class="container">
                <div style="text-align: center; padding: 3rem;">
                    <h2>📋 Мои бронирования</h2>
                    <p>😔 У вас пока нет активных бронирований</p>
                    <button class="btn btn-primary" onclick="showTours()">Посмотреть туры</button>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="container">
            <h2>📋 Мои бронирования</h2>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Тур</th>
                        <th>Страна</th>
                        <th>Длительность</th>
                        <th>Кол-во участников</th>
                        <th>Общая стоимость</th>
                        <th>Статус</th>
                        <th>Дата бронирования</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${activeBookings.map(booking => `
                        <tr>
                            <td><strong>${escapeHtml(booking.title)}</strong></td>
                            <td>${escapeHtml(booking.country)}</span></td>
                            <td>${booking.duration_days || '—'} дней</span></td>
                            <td>${booking.participants_count}</span></td>
                            <td>${parseFloat(booking.total_price).toLocaleString()} ₽</span></td>
                            <td>${booking.status === 'cancelled' ? 
                                '<span style="color: red;">❌ Отменено</span>' : 
                                '<span style="color: green;">✅ Подтверждено</span>'}
                            </td>
                            <td>${new Date(booking.booking_date).toLocaleDateString()}</span></td>
                            <td>
                                ${booking.status !== 'cancelled' ? 
                                    `<button class="btn btn-danger btn-small" onclick="cancelBooking(${booking.id}, ${booking.tour_id}, ${booking.participants_count})">🗑️ Отменить</button>` : 
                                    '<span style="color: gray;">Отменено</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <button class="btn btn-primary" onclick="showTours()" style="margin-top: 1rem;">← Вернуться к турам</button>
        </div>
    `;
}

// Функция отмены бронирования (исправленная)
window.cancelBooking = async function(bookingId, tourId, participantsCount) {
    if (!confirm(`Вы уверены, что хотите отменить бронирование на ${participantsCount} мест(а)?\nМеста будут возвращены в тур.`)) {
        return;
    }
    
    try {
        const response = await BookingAPI.cancel(bookingId);
        
        if (response.success) {
            showToast(`✅ Бронирование отменено! Возвращено ${participantsCount} мест(а).`);
            // Принудительно сбрасываем кэш туров и бронирований
            allTours = [];
            await loadTours(true);
            await loadUserBookings();
        } else {
            showToast(response.error || 'Ошибка при отмене', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Функция загрузки бронирований (с принудительным сбросом)
async function loadUserBookings() {
    if (!AuthManager.isAuthenticated()) {
        showToast('Войдите в систему, чтобы увидеть свои бронирования', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const scrollPosition = window.scrollY;
    
    try {
        // Добавляем заголовок, чтобы избежать кэширования
        const response = await BookingAPI.getMyBookings();
        if (response.success) {
            // Сервер возвращает только активные (status = 'confirmed')
            displayUserBookings(response.data);
            window.scrollTo(0, scrollPosition);
        } else {
            showToast('Ошибка загрузки бронирований', 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
        showToast('Ошибка загрузки бронирований: ' + error.message, 'error');
    }
}

// Глобальные функции для навигации
window.showTours = function() {
    loadTours(true);
    setTimeout(() => {
        const toursContainer = document.getElementById('tours-container');
        if (toursContainer) {
            toursContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
};

window.showHome = function() {
    loadTours(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.openBookingModal = function(tourId) {
    // Обновляем данные тура перед открытием модального окна
    const tour = allTours.find(t => t.id === tourId);
    if (!tour) return;
    
    const modal = document.getElementById('booking-modal');
    const tourInfo = document.getElementById('booking-tour-info');
    const participantsInput = document.getElementById('participants');
    const totalPriceSpan = document.getElementById('total-price');
    
    tourInfo.innerHTML = `
        <h3>${escapeHtml(tour.title)}</h3>
        <p>💰 Стоимость за человека: ${tour.price.toLocaleString()} ₽</p>
        <p>✅ Доступно мест: ${tour.available_seats}</p>
    `;
    
    const maxSeats = Math.min(10, tour.available_seats);
    participantsInput.value = 1;
    participantsInput.max = maxSeats;
    totalPriceSpan.textContent = tour.price.toLocaleString();
    
    participantsInput.oninput = () => {
        let count = parseInt(participantsInput.value) || 0;
        if (count > maxSeats) {
            participantsInput.value = maxSeats;
            count = maxSeats;
        }
        if (count < 1) {
            participantsInput.value = 1;
            count = 1;
        }
        totalPriceSpan.textContent = (tour.price * count).toLocaleString();
    };
    
    modal.style.display = 'block';
    
    const form = document.getElementById('booking-form');
    const submitHandler = async (e) => {
        e.preventDefault();
        const participants = parseInt(participantsInput.value);
        
        if (participants < 1 || participants > tour.available_seats) {
            showToast('Некорректное количество участников', 'error');
            return;
        }
        
        try {
            const response = await BookingAPI.create({
                tour_id: tourId,
                participants_count: participants
            });
            
            if (response.success) {
                showToast('✅ Бронирование успешно создано!');
                modal.style.display = 'none';
                // ОБЯЗАТЕЛЬНО обновляем список туров
                await loadTours(true);
            } else {
                showToast(response.error || 'Ошибка бронирования', 'error');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
    
    form.removeEventListener('submit', submitHandler);
    form.addEventListener('submit', submitHandler);
    
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
};

async function loadUserBookings() {
    if (!AuthManager.isAuthenticated()) {
        showToast('Войдите в систему, чтобы увидеть свои бронирования', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const scrollPosition = window.scrollY;
    
    try {
        const response = await BookingAPI.getMyBookings();
        if (response.success) {
            displayUserBookings(response.data);
            window.scrollTo(0, scrollPosition);
        } else {
            showToast('Ошибка загрузки бронирований', 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
        showToast('Ошибка загрузки бронирований: ' + error.message, 'error');
    }
}

function updateUIForUser() {
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const logoutLink = document.getElementById('logout-link');
    const myBookingsLink = document.getElementById('my-bookings-link');
    const adminLink = document.getElementById('admin-link');
    const userInfo = document.getElementById('user-info');
    
    if (AuthManager.isAuthenticated()) {
        const user = AuthManager.getUser();
        currentUser = user;
        
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        if (myBookingsLink) myBookingsLink.style.display = 'block';
        if (userInfo) userInfo.innerHTML = `👋 ${escapeHtml(user.username)}`;
        
        if (AuthManager.isAdmin() && adminLink) adminLink.style.display = 'block';
    } else {
        currentUser = null;
        if (loginLink) loginLink.style.display = 'block';
        if (registerLink) registerLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
        if (myBookingsLink) myBookingsLink.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (userInfo) userInfo.innerHTML = '';
    }
}

function initNavigation() {
    const homeLink = document.getElementById('home-link');
    if (homeLink) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.showHome();
        });
    }
    
    const toursLink = document.getElementById('tours-link');
    if (toursLink) {
        toursLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.showTours();
        });
    }
    
    const bookingsLink = document.getElementById('bookings-link');
    if (bookingsLink) {
        bookingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadUserBookings();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateUIForUser();
    loadTours(true);
    initNavigation();
    
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthManager.logout();
    });
});