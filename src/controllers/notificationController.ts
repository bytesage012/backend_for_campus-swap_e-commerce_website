import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import logger from '../utils/logger.js';

export const getNotifications = async (req: any, res: Response) => {
    const userId = req.user.id;
    const { unreadOnly, type } = req.query;

    try {
        const where: any = { userId };

        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        if (type) {
            where.type = type as any;
        }

        const notifications = await (prisma as any).notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await (prisma as any).notification.count({
            where: { userId, isRead: false },
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        return handleControllerError(res, error, 'GetNotifications');
    }
};

export const markRead = async (req: any, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const notification = await (prisma as any).notification.findUnique({
            where: { id },
        });

        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        if (notification.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });

        await (prisma as any).notification.update({
            where: { id },
            data: { isRead: true },
        });

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        return handleControllerError(res, error, 'MarkNotificationRead');
    }
};

export const markAllRead = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        await (prisma as any).notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        return handleControllerError(res, error, 'MarkAllNotificationsRead');
    }
};
