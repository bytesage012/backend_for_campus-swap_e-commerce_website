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

    const onlineUsers = new Map<String, Set<String>>();

    io.on('connection', (socket) => {
        const user = (socket as any).user;

        if (user && user.id) {
            // Presence Logic
            if (!onlineUsers.has(user.id)) {
                onlineUsers.set(user.id, new Set());
                // First socket for this user -> Broadcast Online
                socket.broadcast.emit('user_online', user.id);
            }
            onlineUsers.get(user.id)?.add(socket.id);

            socket.join(`user_${user.id}`);
            console.log(`User connected: ${socket.id} (User ID: ${user.id})`);

            // Automatically join admin room if user is admin
            if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                socket.join('admin_room');
                console.log(`Admin joined admin_room: ${user.id}`);
            }

            // Send current online users to this socket
            socket.emit('online_users', Array.from(onlineUsers.keys()));
        }

        socket.on('join_conversation', (conversationId: string) => {
            socket.join(`conversation_${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId: string) => {
            socket.leave(`conversation_${conversationId}`);
        });

        // Typing indicators
        socket.on('typing_start', (conversationId) => {
            socket.to(`conversation_${conversationId}`).emit('typing_start', {
                conversationId,
                userId: user.id,
                name: user.fullName
            });
        });

        socket.on('typing_end', (conversationId) => {
            socket.to(`conversation_${conversationId}`).emit('typing_end', {
                conversationId,
                userId: user.id
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            if (user && user.id) {
                const userSockets = onlineUsers.get(user.id);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        onlineUsers.delete(user.id);
                        io.emit('user_offline', user.id);
                    }
                }
            }
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
