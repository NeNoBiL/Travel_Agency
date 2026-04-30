const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'touragency',
    password: '1111',
    port: 5432,
});

// GET все туры (убрали created_at)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tours ORDER BY id');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('GET /tours error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET тур по ID
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tours WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Тур не найден' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('GET /tours/:id error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST создать тур
router.post('/', async (req, res) => {
    const { title, description, country, city, duration_days, price, max_participants, available_seats, image_url } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO tours (title, description, country, city, duration_days, price, max_participants, available_seats, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [title, description, country, city, duration_days, price, max_participants, available_seats, image_url]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('POST /tours error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT обновить тур
router.put('/:id', async (req, res) => {
    const { title, description, country, city, duration_days, price, max_participants, available_seats, image_url } = req.body;
    try {
        const result = await pool.query(
            `UPDATE tours SET title=$1, description=$2, country=$3, city=$4, duration_days=$5, price=$6, 
             max_participants=$7, available_seats=$8, image_url=$9 WHERE id=$10 RETURNING *`,
            [title, description, country, city, duration_days, price, max_participants, available_seats, image_url, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Тур не найден' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('PUT /tours/:id error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE удалить тур
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM tours WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Тур не найден' });
        }
        res.json({ success: true, message: 'Тур удален' });
    } catch (error) {
        console.error('DELETE /tours/:id error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;