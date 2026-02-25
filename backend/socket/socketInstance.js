// This module initializes and provides the Socket.io instance
// to avoid circular dependencies and make it accessible across the application.

let io = null;

const corsConfig = {
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = [
                process.env.FRONTEND_URL,
                "http://localhost:3000",
                "http://localhost:3001"
            ].filter(Boolean);

            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error('CORS policy violation'));
        },
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
};

module.exports = {
    init: (httpServer) => {
        io = require('socket.io')(httpServer, corsConfig);
        console.log('Socket.io initialized.');
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
