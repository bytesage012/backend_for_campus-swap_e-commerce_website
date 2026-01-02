import { z } from 'zod';

export const createListingSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(1000),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(val => parseFloat(val)),
    category: z.string().min(2),
    condition: z.enum(['NEW', 'USED', 'FAIR']),
    faculty: z.string().optional(),
    department: z.string().optional(),
});

export const updateListingSchema = z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    category: z.string().optional(),
    condition: z.enum(['NEW', 'USED', 'FAIR']).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'ARCHIVED']).optional(),
});

export const purchaseSchema = z.object({
    paymentMethod: z.enum(['WALLET', 'PAYSTACK_DIRECT']),
    useEscrow: z.boolean().optional().default(true),
    meetupLocation: z.string().optional(),
    meetupTime: z.string().optional(),
});

export const updateStatusSchema = z.object({
    status: z.enum(['DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'ARCHIVED']),
    soldToUserId: z.string().optional(),
});
