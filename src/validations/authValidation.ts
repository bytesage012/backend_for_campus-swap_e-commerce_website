import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    phoneNumber: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
    faculty: z.string().min(1, 'Faculty is required'),
    department: z.string().optional().or(z.literal('')),
    academicLevel: z.string().optional().or(z.literal('')),
    transactionPin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only numbers'),
    avatarUrl: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
    phoneNumber: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number').optional(),
    academicLevel: z.string().optional(),
    residenceArea: z.string().optional(),
    department: z.string().optional(),
});
