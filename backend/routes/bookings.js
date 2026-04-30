const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'touragency',
    password: '1111',
    port: 5432,
});

// СОЗДАТЬ БРОНИРОВАНИЕ
router.post('/', authenticateToken, async (req, res) => {
    const { tour_id, participants_count } = req.body;
    
    if (!tour_id || !participants_count) {
        return res.status(400).json({ success: false, error: 'Не указаны данные для бронирования' });
    }
    
    const count = parseInt(participants_count);
    if (isNaN(count) || count < 1) {
        return res.status(400).json({ success: false, error: 'Количество участников должно быть больше 0' });
    }
    
    if (count > 10) {
        return res.status(400).json({ success: false, error: 'Максимум можно забронировать 10 мест за раз' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const tour = await client.query('SELECT * FROM tours WHERE id = $1 FOR UPDATE', [tour_id]);
        if (tour.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Тур не найден' });
        }
        
        const tourData = tour.rows[0];
        
        if (tourData.available_seats < count) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                error: `Недостаточно мест. Доступно: ${tourData.available_seats}, запрошено: ${count}`
            });
        }
        
        const existing = await client.query(
            'SELECT id FROM bookings WHERE user_id = $1 AND tour_id = $2 AND status != $3',
            [req.user.id, tour_id, 'cancelled']
        );
        
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Вы уже бронировали этот тур' });
        }
        
        const total_price = parseFloat(tourData.price) * count;
        
        const booking = await client.query(
            `INSERT INTO bookings (user_id, tour_id, participants_count, total_price, status) 
             VALUES ($1, $2, $3, $4, 'confirmed') RETURNING *`,
            [req.user.id, tour_id, count, total_price]
        );
        
        await client.query('COMMIT');
        
        req.auditLog(req.user.id, 'CREATE_BOOKING', `Бронирование тура ID: ${tour_id} на ${count} чел.`);
        res.status(201).json({ success: true, data: booking.rows[0] });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Booking error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// МОИ БРОНИРОВАНИЯ - возвращаем ТОЛЬКО активные (не отменённые)
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.*, t.title, t.country, t.city, t.duration_days, t.price as tour_price, t.image_url 
             FROM bookings b 
             JOIN tours t ON b.tour_id = t.id 
             WHERE b.user_id = $1 AND b.status = 'confirmed'
             ORDER BY b.booking_date DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('GET /my error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ВСЕ БРОНИРОВАНИЯ (только админ)
router.get('/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.*, u.username, u.email, t.title 
             FROM bookings b 
             JOIN users u ON b.user_id = u.id 
             JOIN tours t ON b.tour_id = t.id 
             ORDER BY b.booking_date DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('GET /all error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


router.delete('/:id', authenticateToken, async (req, res) => {
    const bookingId = req.params.id;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Получаем бронирование для возврата мест
        const booking = await client.query(
            'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
            [bookingId]
        );
        
        if (booking.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Бронирование не найдено' });
        }
        
        const bookingData = booking.rows[0];
        
        // Проверка прав
        if (req.user.role !== 'admin' && bookingData.user_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, error: 'Нет прав' });
        }
        
        // Возвращаем места туру
        await client.query(
            'UPDATE tours SET available_seats = available_seats + $1 WHERE id = $2',
            [bookingData.participants_count, bookingData.tour_id]
        );
        
        // Удаляем бронирование
        await client.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
        
        await client.query('COMMIT');
        
        req.auditLog(req.user.id, 'CANCEL_BOOKING', `Удалено бронирование ID: ${bookingId}, возвращено мест: ${bookingData.participants_count}`);
        res.json({ success: true, message: `Бронирование удалено, возвращено ${bookingData.participants_count} мест` });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Cancel booking error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

module.exports = router;