const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Достаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Токен отсутствует. Пожалуйста, авторизуйтесь." });
    }

    try {
        // Декодируем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Записываем данные пользователя в объект запроса
        // Токен содержит id, role_id и role
        req.user = {
            id: decoded.id,
            role_id: decoded.role_id,
            role: decoded.role
        };
        
        next();
    } catch (err) {
        console.error("JWT Verify Error:", err.message);
        return res.status(401).json({ error: "Сессия истекла или токен невалиден." });
    }
};

// Мидлвар для проверки прав администратора
const adminMiddleware = (req, res, next) => {
    // Роль admin проверяем через role_id и role
    if (!req.user || (req.user.role !== 'admin' && req.user.role_id !== 1)) {
        return res.status(403).json({ error: "Доступ запрещен. Требуются права администратора." });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };