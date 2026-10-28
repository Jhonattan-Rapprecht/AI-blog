require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const AuthRoutes = require('./routes/auth.routes');
const ArticleRoutes = require('./routes/article.routes');
const AIRoutes = require('./routes/ai.routes');
const PublicRoutes = require('./routes/public.routes');
const PublishingRoutes = require('./routes/publishing.routes');
const AutomationRoutes = require('./routes/automation.routes');
const CategoryRoutes = require('./routes/category.routes');
const SettingsRoutes = require('./routes/settings.routes');
const AnalyticsRoutes = require('./routes/analytics.routes');
const MediaRoutes = require('./routes/media.routes');
const ActivityLogRoutes = require('./routes/activity-log.routes');
const ArticleDesignRoutes = require('./routes/article-design.routes');
const authMiddleware = require('./middleware/auth.middleware');
const activityLogMiddleware = require('./middleware/activity-log.middleware');
const publicErrorLogMiddleware = require('./middleware/public-error-log.middleware');
const SchedulerService = require('./services/scheduler.service');

const app = express();
// Admin (Vite) and public site (Astro)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4321').split(',');
const server = http.createServer(app);

app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true
    },
    allowEIO3: true
});

app.use(express.json());

app.use('/uploads/media', express.static(require('path').resolve(__dirname, '../uploads/media'), {
    fallthrough: false,
    maxAge: '7d',
    immutable: true,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}));

app.use('/api/auth', AuthRoutes);

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Public (read-only) routes
app.use('/blog', publicErrorLogMiddleware, PublicRoutes);
app.use('/api/public', publicErrorLogMiddleware, PublicRoutes);

// Admin routes require a valid JWT
app.use('/api/articles', authMiddleware, activityLogMiddleware, ArticleRoutes);
app.use('/api/ai', authMiddleware, activityLogMiddleware, AIRoutes);
app.use('/api/articles', authMiddleware, activityLogMiddleware, PublishingRoutes);
app.use('/api/automation', authMiddleware, activityLogMiddleware, AutomationRoutes);
app.use('/api/categories', authMiddleware, activityLogMiddleware, CategoryRoutes);
app.use('/api/settings', authMiddleware, activityLogMiddleware, SettingsRoutes);
app.use('/api/analytics', authMiddleware, activityLogMiddleware, AnalyticsRoutes);
app.use('/api/media', authMiddleware, activityLogMiddleware, MediaRoutes);
app.use('/api/activity-logs', authMiddleware, ActivityLogRoutes);
app.use('/api/article-design', authMiddleware, activityLogMiddleware, ArticleDesignRoutes);
// Record authenticated calls to unknown admin API paths as rejected activity too.
app.use('/api', authMiddleware, activityLogMiddleware);

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const statusCode = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    req.activityErrorRecorded = true;
    const ActivityLog = require('./models/activity-log.model');
    void ActivityLog.record({
        category: 'errors',
        eventType: 'system.request_exception',
        severity: statusCode >= 500 ? 'error' : 'warning',
        outcome: statusCode >= 500 ? 'failure' : 'rejected',
        actorType: req.user?.username ? 'administrator' : 'anonymous',
        actor: req.user?.username || null,
        source: 'express',
        action: 'Unhandled HTTP request error',
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { errorName: error.name, errorCode: error.code || null }
    });
    return res.status(statusCode).json({ error: statusCode >= 500 ? 'Internal server error.' : String(error.message || 'Request failed.').slice(0, 300) });
});

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id} Reason: ${reason}`);
    });
});

io.engine.on('connection_error', (error) => {
    const ActivityLog = require('./models/activity-log.model');
    void ActivityLog.record({ category: 'errors', eventType: 'system.socket_connection_error', severity: 'error', outcome: 'failure', actorType: 'anonymous', source: 'socket.io', action: 'Realtime connection failed', details: { code: error.code, message: String(error.message || '').slice(0, 300) } });
});

SchedulerService.start();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (Listening on 0.0.0.0)`);
    const ActivityLog = require('./models/activity-log.model');
    void ActivityLog.record({ category: 'system', eventType: 'system.server_started', severity: 'info', outcome: 'success', actorType: 'system', source: 'server', action: 'API server started', details: { port: Number(PORT) || PORT, nodeVersion: process.version } });
});

module.exports = { app, io };
