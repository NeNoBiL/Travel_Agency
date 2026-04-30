const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-key-2024-for-touragency';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Недействительный или просроченный токен' });
        }
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Доступ запрещен. Требуются права администратора.' });
    }
    next();
};

module.exports = { authenticateToken, isAdmin };