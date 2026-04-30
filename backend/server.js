const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем папку для логов
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Функция аудита
app.use((req, res, next) => {
    req.auditLog = (userId, action, details) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            userId: userId || 'anonymous',
            action: action,
            details: details,
            ip: req.ip || req.socket.remoteAddress,
            endpoint: req.originalUrl
        };
        fs.appendFileSync(path.join(logDir, 'audit.log'), JSON.stringify(logEntry) + '\n');
        console.log(`📝 [AUDIT] ${action} - ${details}`);
    };
    next();
});

// Логирование всех запросов (только в开发 режиме)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`📥 ${req.method} ${req.url}`);
        next();
    });
}

// Базовый роут для проверки
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'OK', message: 'Сервер турагентства работает', timestamp: new Date().toISOString() });
});

// Импорт роутов
console.log('📦 Загрузка роутов...');

let authRoutes, tourRoutes, bookingRoutes;

try {
    authRoutes = require('./routes/auth');
    tourRoutes = require('./routes/tours');
    bookingRoutes = require('./routes/bookings');
    console.log('✅ Роуты импортированы');
} catch (err) {
    console.error('❌ Ошибка импорта роутов:', err.message);
}

// Регистрация роутов
if (authRoutes) app.use('/api', authRoutes);
if (tourRoutes) app.use('/api/tours', tourRoutes);
if (bookingRoutes) app.use('/api/bookings', bookingRoutes);

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Test route works' });
});

// Раздача статических файлов (фронтенд)
const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    console.log(`✅ Статика раздается из: ${frontendPath}`);
} else {
    console.warn(`⚠️ Папка фронтенда не найдена: ${frontendPath}`);
}

// Главная страница
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Файл index.html не найден');
    }
});

// Обработка 404
app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, error: 'Маршрут не найден' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('❌ Ошибка сервера:', err);
    res.status(500).json({ success: false, error: err.message || 'Внутренняя ошибка сервера' });
});

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log(`
    Сервер запущен: http://localhost:${PORT}
    API доступен по адресу: http://localhost:${PORT}/api
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM, закрываем сервер...');
    server.close(() => {
        console.log('✅ Сервер закрыт');
        process.exit(0);
    });
});

module.exports = app;