const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDB } = require('./db');
const { ensureStorageDirs } = require('./services/storageService');
const { auditLogMiddleware } = require('./middlewares/auditLogMiddleware');
const { metricsMiddleware } = require('./middlewares/metricsMiddleware');
const { trackProcessError, maybeAlert } = require('./services/metricsService');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const fileRoutes = require('./routes/fileRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const videoRoutes = require('./routes/videoRoutes');
const userRoutes = require('./routes/userRoutes');
const systemRoutes = require('./routes/systemRoutes');

const createApp = () => {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '15mb' }));
    app.use(metricsMiddleware);
    app.use(auditLogMiddleware);

    app.use('/api/auth', authRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/lessons', lessonRoutes);
    app.use('/api/assignments', assignmentRoutes);
    app.use('/api/files', fileRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/videos', videoRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/system', systemRoutes);

    app.use((req, res) => {
        res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
    });

    app.use((error, _req, res, _next) => {
        trackProcessError('express-error', error);
        maybeAlert().catch(() => {});
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
};

const startServer = async (port = process.env.PORT || 5000) => {
    await ensureStorageDirs();
    await initDB();
    const app = createApp();
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            resolve({ app, server });
        });
    });
};

process.on('uncaughtException', (error) => {
    trackProcessError('uncaughtException', error);
    maybeAlert().catch(() => {});
});

process.on('unhandledRejection', (error) => {
    trackProcessError('unhandledRejection', error);
    maybeAlert().catch(() => {});
});

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    });
}

module.exports = {
    createApp,
    startServer
};
