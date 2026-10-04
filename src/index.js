const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ArticleRoutes = require('./routes/article.routes');
const AIRoutes = require('./routes/ai.routes');
const PublicRoutes = require('./routes/public.routes');
const PublishingRoutes = require('./routes/publishing.routes');
const AutomationRoutes = require('./routes/automation.routes');
const SchedulerService = require('./services/scheduler.service');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 1. Use CORS middleware BEFORE any routes
// This is critical: it must be the first middleware
app.use(cors({
    origin: 'http://localhost:5173', // Explicitly allow the Vite frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Explicitly allow the Vite frontend
        methods: ['GET', 'POST']
    }
});

app.use(express.json());

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/articles', ArticleRoutes);
app.use('/api/ai', AIRoutes);
app.use('/blog', PublicRoutes);
app.use('/api/articles', PublishingRoutes);
app.use('/api/automation', AutomationRoutes);

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

SchedulerService.start();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };
