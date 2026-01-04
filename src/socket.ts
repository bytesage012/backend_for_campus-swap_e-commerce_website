import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const initializeSocket = (httpServer: HttpServer) => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"]
        }
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'secret';

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            (socket as any).user = decoded;
            next();
        } catch (e) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        const user = (socket as any).user;

        if (user && user.id) {
            socket.join(`user_${user.id}`);
            console.log(`User connected: ${socket.id} (User ID: ${user.id})`);

            // Automatically join admin room if user is admin
            if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                socket.join('admin_room');
                console.log(`Admin joined admin_room: ${user.id}`);
            }
        }

        socket.on('join_conversation', (conversationId: string) => {
            socket.join(`conversation_${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId: string) => {
            socket.leave(`conversation_${conversationId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
export const closeSocket = () => {
    if (io) {
        io.close();
    }
};
