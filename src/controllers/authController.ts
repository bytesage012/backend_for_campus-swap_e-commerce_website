import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validations/authValidation.js';
import { ZodError } from 'zod';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const handleControllerError = (res: Response, error: any, context: string) => {
    logger.error(`${context} Controller Error`, error);
    if (error instanceof ZodError) {
        return res.status(400).json({
            message: error.issues[0]?.message || 'Validation failed',
            errors: error.issues
        });
    }
    res.status(500).json({ message: 'Server error', error: error.message || error });
};

export const register = async (req: Request, res: Response) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const { email, password, fullName, faculty, phoneNumber } = validatedData;

        logger.info('User Registration Attempt', { email });

        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            logger.warn('Registration Failed: User exists', { email });
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                faculty,
                phoneNumber,
                wallet: {
                    create: {
                        balance: 0,
                    },
                },
            },
        });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

        logger.info('User Registered Successfully', { userId: user.id });
        res.status(201).json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            faculty: user.faculty,
            token,
        });
    } catch (error: any) {
        return handleControllerError(res, error, 'Register');
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const { email, password } = validatedData;

        logger.info('User Login Attempt', { email });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            logger.warn('Login Failed: Invalid email', { email });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Login Failed: Invalid password', { email });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

        logger.info('User Logged In Successfully', { userId: user.id });
        res.json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            faculty: user.faculty,
            token,
        });
    } catch (error: any) {
        return handleControllerError(res, error, 'Login');
    }
};

export const getProfile = async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                wallet: {
                    include: {
                        transactions: {
                            orderBy: { createdAt: 'desc' },
                            take: 10,
                        },
                    },
                },
            },
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        const { password, ...userData } = user;
        res.json(userData);
    } catch (error: any) {
        return handleControllerError(res, error, 'GetProfile');
    }
};

export const updateProfile = async (req: any, res: Response) => {
    try {
        const validatedData = updateProfileSchema.parse(req.body);

        const updateData: any = { ...validatedData };

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
        });

        const { password, ...userData } = user;
        logger.info('Profile Updated', { userId: req.user.id });
        res.json({ message: 'Profile updated successfully', user: userData });
    } catch (error: any) {
        return handleControllerError(res, error, 'UpdateProfile');
    }
};
