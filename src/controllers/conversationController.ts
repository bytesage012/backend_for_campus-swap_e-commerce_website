import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import { startConversationSchema, sendMessageSchema } from '../validations/conversationValidation.js';
import logger from '../utils/logger.js';
import { getIO } from '../socket.js';

export const startConversation = async (req: any, res: Response) => {
    try {
        const validatedData = startConversationSchema.parse(req.body);
        const { contextType, listingId, topicId, recipientId } = validatedData;
        const userId = req.user.id; // Caller (Initiator/Buyer)

        let conversation;

        if (contextType === 'LISTING') {
            if (!listingId) return res.status(400).json({ message: 'listingId is required for LISTING context' });

            const listing = await prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) return res.status(404).json({ message: 'Listing not found' });
            if (listing.sellerId === userId) return res.status(400).json({ message: 'Cannot message yourself' });

            const sellerId = listing.sellerId;

            // Check for existing DIRECT conversation between these two users
            conversation = await (prisma.conversation as any).findFirst({
                where: {
                    contextType: 'DIRECT',
                    OR: [
                        { buyerId: userId, recipientId: sellerId },
                        { buyerId: sellerId, recipientId: userId },
                    ],
                },
            });

            if (!conversation) {
                // Create new unified DIRECT conversation
                conversation = await (prisma.conversation as any).create({
                    data: {
                        contextType: 'DIRECT',
                        buyerId: userId,
                        recipientId: sellerId,
                        metadata: {
                            initiatedFrom: 'LISTING',
                            firstListingId: listingId
                        },
                        messages: {
                            create: {
                                senderId: userId,
                                content: `Hi, I'm interested in ${listing.title}. Is it still available?`,
                                listingId: listingId, // Reference the listing
                                isRead: false,
                            }
                        }
                    },
                });
                logger.info('New Unified Conversation', { id: conversation.id, users: [userId, sellerId] });
            } else {
                // Conversation exists - add message with listing reference
                await (prisma.message as any).create({
                    data: {
                        conversationId: conversation.id,
                        senderId: userId,
                        content: `Hi, I'm also interested in ${listing.title}. Is it still available?`,
                        listingId: listingId,
                        isRead: false,
                    }
                });

                // Update conversation timestamp
                await (prisma.conversation as any).update({
                    where: { id: conversation.id },
                    data: { updatedAt: new Date() },
                });

                logger.info('Added message to existing conversation', { conversationId: conversation.id, listingId });
            }

            // Analytics: Increment message count
            await prisma.listingAnalytics.upsert({
                where: { listingId },
                update: { messages: { increment: 1 } },
                create: { listingId, messages: 1 }
            });

        } else if (contextType === 'FORUM') {
            if (!topicId) return res.status(400).json({ message: 'topicId is required for FORUM context' });

            // Check existing for topic (Public)
            conversation = await (prisma.conversation as any).findFirst({
                where: { contextType: 'FORUM', topicId },
            });

            if (!conversation) {
                conversation = await (prisma.conversation as any).create({
                    data: {
                        contextType: 'FORUM',
                        topicId,
                        isPublic: true,
                        buyerId: userId,
                    },
                });
            }
        } else if (contextType === 'DIRECT') {
            if (!recipientId) return res.status(400).json({ message: 'recipientId is required for DIRECT context' });
            if (recipientId === userId) return res.status(400).json({ message: 'Cannot message yourself' });

            // Bi-directional check for existing DM
            conversation = await (prisma.conversation as any).findFirst({
                where: {
                    contextType: 'DIRECT',
                    OR: [
                        { buyerId: userId, recipientId },
                        { buyerId: recipientId, recipientId: userId },
                    ],
                },
            });

            if (!conversation) {
                conversation = await (prisma.conversation as any).create({
                    data: {
                        contextType: 'DIRECT',
                        buyerId: userId,      // Initiator
                        recipientId,          // Target
                    },
                });
            }
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
                    { recipientId: userId },
                    { contextType: 'FORUM', messages: { some: { senderId: userId } } }
                ],
            },
            include: {
                buyer: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
                recipient: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        senderId: true,
                        isRead: true,
                        listingId: true,
                        listing: {
                            select: {
                                id: true,
                                title: true,
                                price: true,
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Transform to include lastMessage and unreadCount
        const conversationsWithMeta = await Promise.all(conversations.map(async (conv: any) => {
            const lastMessage = conv.messages[0] || null;

            // Count unread messages for this user (where they are NOT the sender)
            const unreadCount = await (prisma.message as any).count({
                where: {
                    conversationId: conv.id,
                    isRead: false,
                    senderId: { not: userId }
                }
            });

            return {
                ...conv,
                lastMessage,
                unreadCount,
                messages: undefined, // Remove messages array from response
            };
        }));

        res.json({ conversations: conversationsWithMeta });
    } catch (error) {
        return handleControllerError(res, error, 'ListConversations');
    }
};

export const sendMessage = async (req: any, res: Response) => {
    const { id: conversationId } = req.params;
    const senderId = req.user.id;

    try {
        const validatedData = sendMessageSchema.parse(req.body);
        const { content, parentId } = validatedData;

        const conversation = await (prisma.conversation as any).findUnique({
            where: { id: conversationId },
            include: { listing: true },
        });

        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        // Access Control
        const isParticipant =
            conversation.buyerId === senderId ||
            (conversation.listing && conversation.listing.sellerId === senderId) ||
            conversation.recipientId === senderId ||
            (conversation.contextType === 'FORUM' && conversation.isPublic);

        if (!isParticipant) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const message = await (prisma.message as any).create({
            data: {
                conversationId,
                senderId,
                content,
                parentId,
            },
        });

        // Update conversation updatedAt for sorting
        await (prisma.conversation as any).update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        // Determine recipient for notification
        let notifRecipientId = null;
        if (conversation.contextType === 'LISTING') {
            notifRecipientId = conversation.buyerId === senderId ? conversation.listing?.sellerId : conversation.buyerId;
        } else if (conversation.contextType === 'DIRECT') {
            notifRecipientId = conversation.buyerId === senderId ? conversation.recipientId : conversation.buyerId;
        }

        // Emit to the conversation room (for those actively in the chat)
        getIO().to(`conversation_${conversationId}`).emit('new_message', message);

        // Emit a general notification to the specific user (for the drawer/badge)
        if (notifRecipientId) {
            getIO().to(`user_${notifRecipientId}`).emit('message_notification', {
                conversationId,
                senderId,
                content: content.substring(0, 50),
                title: conversation.listing?.title || 'New Message'
            });
        }

        // Analytics: Increment message count if listing context
        if (conversation.contextType === 'LISTING' && conversation.listingId) {
            await prisma.listingAnalytics.upsert({
                where: { listingId: conversation.listingId },
                update: { messages: { increment: 1 } },
                create: { listingId: conversation.listingId, messages: 1 }
            });
        }

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

        const isParticipant =
            conversation.buyerId === userId ||
            (conversation.listing && conversation.listing.sellerId === userId) ||
            conversation.recipientId === userId ||
            (conversation.contextType === 'FORUM' && conversation.isPublic);

        if (!isParticipant) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const messages = await (prisma.message as any).findMany({
            where: { conversationId },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: {
                            take: 1,
                            where: { isPrimary: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ messages });
    } catch (error) {
        return handleControllerError(res, error, 'GetMessages');
    }
};

export const getConversationById = async (req: any, res: Response) => {
    const { id: conversationId } = req.params;
    const userId = req.user.id;

    try {
        const conversation = await (prisma.conversation as any).findUnique({
            where: { id: conversationId },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        sellerId: true,
                        seller: {
                            select: {
                                id: true,
                                fullName: true,
                                avatarUrl: true,
                            }
                        }
                    },
                },
                buyer: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
                recipient: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        if (conversation.contextType === 'LISTING') {
            if (conversation.buyerId !== userId && conversation.listing?.sellerId !== userId) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        } else if (conversation.contextType === 'DIRECT') {
            if (conversation.buyerId !== userId && conversation.recipientId !== userId) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        } else if (conversation.contextType === 'FORUM') {
            if (!conversation.isPublic) {
                // If private forum (future), check access. For now public allows all.
            }
        }

        res.json(conversation);
    } catch (error) {
        return handleControllerError(res, error, 'GetConversationById');
    }
};

export const markConversationAsRead = async (req: any, res: Response) => {
    const { id: conversationId } = req.params;
    const userId = req.user.id;

    try {
        const conversation = await (prisma.conversation as any).findUnique({
            where: { id: conversationId },
        });

        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        // Update all unread messages where this user is the recipient
        await (prisma.message as any).updateMany({
            where: {
                conversationId,
                isRead: false,
                senderId: { not: userId }
            },
            data: { isRead: true }
        });

        res.json({ message: 'Conversation marked as read' });
    } catch (error) {
        return handleControllerError(res, error, 'MarkConversationAsRead');
    }
};
