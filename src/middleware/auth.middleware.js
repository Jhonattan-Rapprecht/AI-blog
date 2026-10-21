const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Extract token from Authorization header
        // Expected format: "Bearer <token>"
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required. Please provide a valid token.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token using the secret from .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded user info to the request object
        req.user = decoded;

        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        return res.status(401).json({
            message: 'Invalid or expired token. Please log in again.'
        });
    }
};
