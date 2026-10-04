const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ArticleRoutes = require('./routes/article.routes');
const AIRoutes = require('./routes/ai.routes');
const PublicRoutes = require('./routes/public.routes');
const PublishingRoutes = require('./routes/publishing.routes');
const AutomationRoutes = require('./routes/automation.routes');
const CategoryRoutes = require('./routes/category.routes');
const SchedulerService = require('./services/scheduler.service');
require('dotenv').config();

const app = express();
// Admin (Vite) and public site (Astro)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4321').split(',');
const server = http.createServer(app);

app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/articles', ArticleRoutes);
app.use('/api/ai', AIRoutes);
app.use('/blog', PublicRoutes);
app.use('/api/public', PublicRoutes);
app.use('/api/articles', PublishingRoutes);
app.use('/api/automation', AutomationRoutes);
app.use('/api/categories', CategoryRoutes);

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id} Reason: ${reason}`);
    });
});

SchedulerService.start();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (Listening on 0.0.0.0)`);
});

module.exports = { app, io };
