const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'touragency',
    password: '1111',
    port: 5432,
});

async function fixPasswords() {
    try {
        // Генерируем правильные хэши для паролей
        const adminHash = await bcrypt.hash('admin', 10);
        const userHash = await bcrypt.hash('user123', 10);
        
        console.log('Admin hash:', adminHash);
        console.log('User hash:', userHash);
        
        // Обновляем пароли
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2',
            [adminHash, 'admin']
        );
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2',
            [userHash, 'user1']
        );
        
        console.log('✅ Пароли обновлены!');
        
        // Проверяем
        const result = await pool.query('SELECT username, role FROM users');
        console.log('Пользователи:', result.rows);
        
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await pool.end();
    }
}

fixPasswords();