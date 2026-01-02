import { z } from 'zod';

export const confirmReceiptSchema = z.object({
    received: z.boolean(),
    conditionMet: z.boolean(),
    notes: z.string().optional(),
});

export const disputeSchema = z.object({
    reason: z.string().min(10, 'Please provide a detailed reason'),
    evidence: z.string().optional(),
});
