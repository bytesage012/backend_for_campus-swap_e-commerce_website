import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import { startConversationSchema, sendMessageSchema } from '../validations/conversationValidation.js';
import logger from '../utils/logger.js';
import { getIO } from '../socket.js';

export const startConversation = async (req: any, res: Response) => {
    try {
        const validatedData = startConversationSchema.parse(req.body);
        const { listingId } = validatedData;
        const buyerId = req.user.id;

        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        if (!listing) return res.status(404).json({ message: 'Listing not found' });

        if (listing.sellerId === buyerId) {
            return res.status(400).json({ message: 'You cannot start a conversation with yourself' });
        }

        // Find or create conversation
        let conversation = await (prisma.conversation as any).findUnique({
            where: {
                listingId_buyerId: {
                    listingId,
                    buyerId,
                },
            },
        });

        if (!conversation) {
            conversation = await (prisma.conversation as any).create({
                data: {
                    listingId,
                    buyerId,
                },
            });
            logger.info('New Conversation Started', { conversationId: conversation.id, buyerId, listingId });
            return res.status(201).json({ conversationId: conversation.id });
        }

        res.status(200).json({ conversationId: conversation.id });
    } catch (error) {
        return handleControllerError(res, error, 'StartConversation');
    }
};

export const listConversations = async (req: any, res: Response) => {
    const userId = req.user.id;
    try {
        const conversations = await (prisma.conversation as any).findMany({
            where: {
                OR: [
                    { buyerId: userId },
                    { listing: { sellerId: userId } },
                ],
            },
            include: {
                listing: {
                    select: {
                        title: true,
                        price: true,
                        sellerId: true,
                    },
                },
                buyer: {
                    select: {
                        fullName: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json({ conversations });
    } catch (error) {
        return handleControllerError(res, error, 'ListConversations');
    }
};

export const sendMessage = async (req: any, res: Response) => {
    const { id: conversationId } = req.params;
    const senderId = req.user.id;

    try {
        const validatedData = sendMessageSchema.parse(req.body);
        const { content } = validatedData;

        const conversation = await (prisma.conversation as any).findUnique({
            where: { id: conversationId },
            include: { listing: true },
        });

        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        // Check if sender is part of conversation
        if (conversation.buyerId !== senderId && conversation.listing.sellerId !== senderId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const message = await (prisma.message as any).create({
            data: {
                conversationId,
                senderId,
                content,
            },
        });

        // Update conversation updatedAt for sorting
        await (prisma.conversation as any).update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        // Determine recipient
        const recipientId = conversation.buyerId === senderId ? conversation.listing.sellerId : conversation.buyerId;

        // Emit to the conversation room (for those actively in the chat)
        getIO().to(`conversation_${conversationId}`).emit('new_message', message);

        // Emit a general notification to the specific user (for the drawer/badge)
        getIO().to(`user_${recipientId}`).emit('message_notification', {
            conversationId,
            senderId,
            content: content.substring(0, 50),
            title: conversation.listing.title
        });

        logger.info('Message Sent', { conversationId, senderId, messageId: message.id });
        res.status(201).json({ messageId: message.id, message });
    } catch (error) {
        return handleControllerError(res, error, 'SendMessage');
    }
};

export const getMessages = async (req: any, res: Response) => {
    const { id: conversationId } = req.params;
    const userId = req.user.id;

    try {
        const conversation = await (prisma.conversation as any).findUnique({
            where: { id: conversationId },
            include: { listing: true },
        });

        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        if (conversation.buyerId !== userId && conversation.listing.sellerId !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const messages = await (prisma.message as any).findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ messages });
    } catch (error) {
        return handleControllerError(res, error, 'GetMessages');
    }
};
