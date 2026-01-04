import prisma from '../prisma.js';
import { getIO } from '../socket.js';

export const createNotification = async (data: {
    userId: string;
    type: 'MESSAGE' | 'TRANSACTION' | 'SYSTEM' | 'PRICE_ALERT';
    title: string;
    body: string;
    metadata?: any;
}) => {
    try {
        const notification = await (prisma as any).notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                body: data.body,
                data: data.metadata || null,
            },
        });

        // Emit via socket to the specific user's room
        getIO().to(`user_${data.userId}`).emit('new_notification', notification);

        return notification;
    } catch (error) {
        console.error('Failed to create/emit notification:', error);
        // We don't throw so the main action doesn't fail if notification fails
    }
};
