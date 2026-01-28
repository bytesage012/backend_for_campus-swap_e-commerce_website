import { z } from 'zod';

export const startConversationSchema = z.object({
    contextType: z.enum(['LISTING', 'FORUM', 'DIRECT']).optional().default('LISTING'),
    listingId: z.string().uuid().optional(),
    topicId: z.string().optional(),
    recipientId: z.string().uuid().optional(),
});

export const sendMessageSchema = z.object({
    content: z.string().min(1).max(1000),
    parentId: z.string().uuid().optional(),
});
