const mysql = require('mysql2/promise');
const { errorDetails } = require('../utils/http-errors');

const requiredDatabaseVariables = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingDatabaseVariables = requiredDatabaseVariables.filter((name) => !process.env[name]);

if (missingDatabaseVariables.length > 0) {
    throw new Error(`Missing required database configuration: ${missingDatabaseVariables.join(", ")}`);
}

// Database configuration using a connection pool for high performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
            console.error('[DB Error]:', errorDetails(error));
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
