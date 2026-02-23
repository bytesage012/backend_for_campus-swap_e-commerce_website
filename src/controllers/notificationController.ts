import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';

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

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        return res.json({ notifications, unreadCount });
    } catch (error) {
        return handleControllerError(res, error, 'GetNotifications');
    }
};

export const getNotificationById = async (req: any, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const notification = await prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        if (notification.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });

        return res.json(notification);
    } catch (error) {
        return handleControllerError(res, error, 'GetNotificationById');
    }
};

export const markRead = async (req: any, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const notification = await prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        if (notification.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });

        await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });

        return res.json({ message: 'Notification marked as read' });
    } catch (error) {
        return handleControllerError(res, error, 'MarkNotificationRead');
    }
};

export const markAllRead = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        return res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        return handleControllerError(res, error, 'MarkAllNotificationsRead');
    }
};
