// frontend/js/admin.js

// Кеширование DOM элементов
let cachedToursContainer = null;
let cachedBookingsContainer = null;

function validateTourData(tourData) {
    const errors = [];
    
    if (!tourData.title || tourData.title.length < 3) {
        errors.push('Название тура должно содержать минимум 3 символа');
    }
    if (!tourData.description || tourData.description.length < 10) {
        errors.push('Описание должно содержать минимум 10 символов');
    }
    if (!tourData.country) errors.push('Укажите страну');
    if (!tourData.city) errors.push('Укажите город');
    if (!tourData.duration_days || tourData.duration_days < 1) errors.push('Длительность должна быть больше 0');
    if (!tourData.price || tourData.price < 0) errors.push('Цена должна быть положительным числом');
    if (!tourData.max_participants || tourData.max_participants < 1) errors.push('Максимальное количество участников должно быть больше 0');
    if (tourData.available_seats === undefined || tourData.available_seats < 0) errors.push('Количество доступных мест должно быть неотрицательным');
    if (tourData.available_seats > tourData.max_participants) errors.push('Доступные места не могут превышать максимальное количество');
    
    return errors;
}

function showToast(message, type = 'success') {
    // Удаляем старые тосты
    const oldToasts = document.querySelectorAll('.toast');
    oldToasts.forEach(toast => toast.remove());
    
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

async function loadAdminTours() {
    try {
        const response = await TourAPI.getAll();
        if (response.success) {
            displayAdminTours(response.data);
        }
    } catch (error) {
        showToast('Ошибка загрузки туров: ' + error.message, 'error');
    }
}

function displayAdminTours(tours) {
    if (!cachedToursContainer) {
        cachedToursContainer = document.getElementById('admin-tours-list');
    }
    if (!cachedToursContainer) return;
    
    if (tours.length === 0) {
        cachedToursContainer.innerHTML = '<p>Туров пока нет</p>';
        return;
    }
    
    cachedToursContainer.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr><th>ID</th><th>Название</th><th>Страна</th><th>Цена</th><th>Доступно мест</th><th>Действия</th></tr>
            </thead>
            <tbody>
                ${tours.map(tour => `
                    <tr>
                        <td>${tour.id}</span></td>
                        <td>${escapeHtml(tour.title)}</span></td>
                        <td>${escapeHtml(tour.country)}</span></td>
                        <td>${Number(tour.price).toLocaleString()} ₽</span></td>
                        <td>${tour.available_seats}/${tour.max_participants}</span></td>
                        <td>
                            <button class="btn btn-secondary" onclick="editTour(${tour.id})">✏️ Ред.</button>
                            <button class="btn btn-danger" onclick="deleteTour(${tour.id})">🗑️ Удалить</button>
                        </span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadAdminBookings() {
    try {
        const response = await BookingAPI.getAllBookings();
        if (response.success) {
            displayAdminBookings(response.data);
        }
    } catch (error) {
        showToast('Ошибка загрузки бронирований: ' + error.message, 'error');
    }
}

function displayAdminBookings(bookings) {
    if (!cachedBookingsContainer) {
        cachedBookingsContainer = document.getElementById('admin-bookings-list');
    }
    if (!cachedBookingsContainer) return;
    
    if (bookings.length === 0) {
        cachedBookingsContainer.innerHTML = '<p>Бронирований пока нет</p>';
        return;
    }
    
    cachedBookingsContainer.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr><th>ID</th><th>Пользователь</th><th>Тур</th><th>Кол-во</th><th>Стоимость</th><th>Статус</th><th>Дата</th><th>Действия</th></tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>${booking.id}</span></td>
                        <td>${escapeHtml(booking.username)}</span></td>
                        <td>${escapeHtml(booking.title)}</span></td>
                        <td>${booking.participants_count}</span></td>
                        <td>${Number(booking.total_price).toLocaleString()} ₽</span></td>
                        <td>${booking.status === 'cancelled' ? '<span style="color: red;">❌ Отменено</span>' : '<span style="color: green;">✅ Подтверждено</span>'}</td>
                        <td>${new Date(booking.booking_date).toLocaleDateString()}</span></td>
                        <td>${booking.status !== 'cancelled' ? `<button class="btn btn-danger btn-small" onclick="adminCancelBooking(${booking.id}, ${booking.tour_id}, ${booking.participants_count})">Отменить</button>` : '—'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.adminCancelBooking = async function(bookingId, tourId, participantsCount) {
    if (!confirm(`Отменить бронирование #${bookingId} на ${participantsCount} мест(а)?\nМеста будут возвращены в тур.`)) {
        return;
    }
    
    try {
        const response = await BookingAPI.cancel(bookingId);
        
        if (response.success) {
            showToast(`✅ Бронирование #${bookingId} отменено! Возвращено ${participantsCount} мест(а).`);
            await Promise.all([loadAdminBookings(), loadAdminTours()]);
        } else {
            showToast(response.error || 'Ошибка при отмене', 'error');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
};

let currentModalSubmitHandler = null;

function openTourModal(tour = null) {
    const modal = document.getElementById('tour-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('tour-form');
    
    if (tour) {
        title.textContent = '✏️ Редактировать тур';
        document.getElementById('tour-id').value = tour.id;
        document.getElementById('title').value = tour.title;
        document.getElementById('description').value = tour.description;
        document.getElementById('country').value = tour.country;
        document.getElementById('city').value = tour.city;
        document.getElementById('duration_days').value = tour.duration_days;
        document.getElementById('price').value = tour.price;
        document.getElementById('max_participants').value = tour.max_participants;
        document.getElementById('available_seats').value = tour.available_seats;
        document.getElementById('image_url').value = tour.image_url || '';
    } else {
        title.textContent = '➕ Добавить тур';
        form.reset();
        document.getElementById('tour-id').value = '';
        document.getElementById('available_seats').value = '';
        document.getElementById('max_participants').value = '';
    }
    
    modal.style.display = 'block';
    
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    
    if (currentModalSubmitHandler) {
        form.removeEventListener('submit', currentModalSubmitHandler);
    }
    
    currentModalSubmitHandler = async (e) => {
        e.preventDefault();
        
        const tourData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            country: document.getElementById('country').value,
            city: document.getElementById('city').value,
            duration_days: parseInt(document.getElementById('duration_days').value),
            price: parseFloat(document.getElementById('price').value),
            max_participants: parseInt(document.getElementById('max_participants').value),
            available_seats: parseInt(document.getElementById('available_seats').value),
            image_url: document.getElementById('image_url').value
        };
        
        const errors = validateTourData(tourData);
        if (errors.length > 0) {
            showToast(errors.join('\n'), 'error');
            return;
        }
        
        try {
            const tourId = document.getElementById('tour-id').value;
            let response;
            
            if (tourId) {
                response = await TourAPI.update(tourId, tourData);
            } else {
                response = await TourAPI.create(tourData);
            }
            
            if (response.success) {
                showToast(tourId ? '✅ Тур обновлен' : '✅ Тур добавлен');
                modal.style.display = 'none';
                loadAdminTours();
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
    
    form.addEventListener('submit', currentModalSubmitHandler);
}

window.editTour = function(id) {
    TourAPI.getById(id).then(response => {
        if (response.success) openTourModal(response.data);
    }).catch(error => showToast(error.message, 'error'));
};

window.deleteTour = async function(id) {
    if (confirm('Вы уверены, что хотите удалить этот тур?')) {
        try {
            const response = await TourAPI.delete(id);
            if (response.success) {
                showToast('🗑️ Тур удален');
                loadAdminTours();
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', () => {
    if (!AuthManager.isAuthenticated() || !AuthManager.isAdmin()) {
        window.location.href = '/index.html';
        return;
    }
    
    loadAdminTours();
    loadAdminBookings();
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            if (tabId === 'bookings') loadAdminBookings();
        });
    });
    
    const addTourBtn = document.getElementById('add-tour-btn');
    if (addTourBtn) {
        addTourBtn.addEventListener('click', () => openTourModal(null));
    }
    
    const logoutAdmin = document.getElementById('logout-admin');
    if (logoutAdmin) {
        logoutAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            AuthManager.logout();
        });
    }
});