import { z } from 'zod';

export const startConversationSchema = z.object({
    listingId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
    content: z.string().min(1).max(1000),
});
