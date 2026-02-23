import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validations/authValidation.js';
import { ZodError } from 'zod';
import logger from '../utils/logger.js';
import { getUserProfile, getUserProfileWithTransactions, mapUserProfileResponse } from '../services/userProfileService.js';

const JWT_SECRET = process.env['JWT_SECRET'] || 'secret';

export const handleControllerError = (res: Response, error: any, context: string) => {
    if (error instanceof ZodError) {
        logger.warn(`${context} Validation Error`, error.issues);
        return res.status(400).json({
            message: error.issues[0]?.message || 'Validation failed',
            errors: error.issues
        });
    }

    // Handle known domain errors with 400 Bad Request
    const knownErrors = [
        'Insufficient funds',
        'Listing not available',
        'Cannot buy your own listing',
        'Cannot buy your own items',
        'Insufficient stock',
        'Transaction PIN not set',
        'Invalid transaction PIN'
    ];

    const errorMessage = error.message || String(error);

    if (knownErrors.some(msg => errorMessage.includes(msg))) {
        logger.warn(`${context} Domain Error: ${errorMessage}`);
        return res.status(400).json({ message: errorMessage });
    }

    logger.error(`${context} Controller Error`, error);
    res.status(500).json({ message: 'Server error', error: errorMessage });
};

export const register = async (req: Request, res: Response) => {
    /*  #swagger.tags = ['Auth']
        #swagger.description = 'Register a new user and create a wallet.'
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'User registration data',
            required: true,
            schema: { $ref: '#/definitions/RegisterRequest' }
        }
    */

    try {
        const validatedData = registerSchema.parse(req.body);
        const { email, password, fullName, faculty, phoneNumber, transactionPin, department, academicLevel } = validatedData;

        let avatarUrl = null;
        if (req.file) {
            avatarUrl = `/uploads/avatars/${req.file.filename}`;
        }

        logger.info('User Registration Attempt', { email });

        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            logger.warn('Registration Failed: User exists', { email });
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedPin = await bcrypt.hash(transactionPin, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                faculty,
                phoneNumber,
                department,
                academicLevel,
                avatarUrl,
                wallet: {
                    create: {
                        balance: 0,
                        transactionPin: hashedPin,
                        pinSetAt: new Date()
                    },
                },
            },
        });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

        // Audit Log
        await prisma.adminLog.create({
            data: {
                action: 'USER_REGISTER',
                actorId: user.id,
                ipAddress: req.ip || null,
                details: { faculty }
            }
        });

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
    /*  #swagger.tags = ['Auth']
        #swagger.description = 'Login with email and password.'
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Login credentials',
            required: true,
            schema: { $ref: '#/definitions/LoginRequest' }
        }
    */

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

        // Audit Log
        await prisma.adminLog.create({
            data: {
                action: 'USER_LOGIN',
                actorId: user.id,
                ipAddress: req.ip || null,
                details: { method: 'email' }
            }
        });

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
        const user = await getUserProfileWithTransactions(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error: any) {
        return handleControllerError(res, error, 'GetProfile');
    }
};

export const updateProfile = async (req: any, res: Response) => {
    try {
        const validatedData = updateProfileSchema.parse(req.body);

        const updateData: any = { ...validatedData };

        if (req.file) {
            updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
        });

        // Fetch the updated user with secure selection
        const updatedUser = await getUserProfile(req.user.id);
        
        logger.info('Profile Updated', { userId: req.user.id });
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error: any) {
        return handleControllerError(res, error, 'UpdateProfile');
    }
};
