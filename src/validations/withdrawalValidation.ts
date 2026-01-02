import { z } from 'zod';

export const setupPinSchema = z.object({
    newPin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
    confirmPin: z.string().length(4),
    currentPin: z.string().length(4).optional(),
}).refine((data) => data.newPin === data.confirmPin, {
    message: "PINs don't match",
    path: ["confirmPin"],
});

export const verifyPinSchema = z.object({
    pin: z.string().length(4, 'PIN must be exactly 4 digits'),
});

export const withdrawalSchema = z.object({
    amount: z.number().positive('Amount must be positive').max(500000, 'Maximum withdrawal is ₦500,000'),
    bankCode: z.string().min(3, 'Invalid bank code'),
    accountNumber: z.string().length(10, 'Account number must be 10 digits'),
    accountName: z.string().min(3, 'Account name is required'),
    pin: z.string().length(4, 'PIN must be exactly 4 digits'),
});
