const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration using a connection pool for high performance
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ai_blog',
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections in pool
    maxIdle: 10, // Max idle connections, the pool will retire them
    idleTimeout: 60000, // Idle connections timeout, in milliseconds
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

/**
 * Database utility class to handle queries efficiently
 */
const db = {
    /**
     * Execute a query using the connection pool
     * @param {string} sql - The SQL query
     * @param {Array} params - The parameters for the parameterized query
     */
    async query(sql, params) {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('[DB Error]:', error);
            throw error;
        }
    },

    /**
     * Start a transaction
     */
    async transaction() {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }
};

module.exports = db;
