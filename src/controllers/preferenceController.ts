import type { Response } from 'express';
import prisma from '../prisma.js';
import { updateThemeSchema } from '../validations/preferenceValidation.js';
import { handleControllerError } from './authController.js';
import logger from '../utils/logger.js';

export const getTheme = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        let preference = await (prisma as any).preference.findUnique({
            where: { userId },
        });

        // Create default preference if doesn't exist
        if (!preference) {
            preference = await (prisma as any).preference.create({
                data: {
                    userId,
                    themeMode: 'AUTO',
                    facultyThemeEnabled: true,
                },
            });
        }

        res.json({
            mode: preference.themeMode,
            facultyThemeEnabled: preference.facultyThemeEnabled,
            accentColor: preference.accentColor,
            primaryColor: preference.primaryColor,
            lastUpdated: preference.updatedAt,
        });
    } catch (error) {
        return handleControllerError(res, error, 'GetTheme');
    }
};

export const updateTheme = async (req: any, res: Response) => {
    const userId = req.user.id;

    try {
        const validatedData = updateThemeSchema.parse(req.body);

        const preference = await (prisma as any).preference.upsert({
            where: { userId },
            update: validatedData,
            create: {
                userId,
                ...validatedData,
            },
        });

        logger.info('Theme Preferences Updated', { userId, themeMode: preference.themeMode });
        res.json({ message: 'Theme preferences updated' });
    } catch (error) {
        return handleControllerError(res, error, 'UpdateTheme');
    }
};

export const getFacultyColors = async (req: any, res: Response) => {
    try {
        // Faculty color palettes - this could be stored in DB or config
        const facultyColors = [
            {
                faculty: 'Engineering',
                primary: '#2E5A88',
                secondary: '#E63946',
                accent: '#F4A261',
                darkBackground: '#1A1A2E',
            },
            {
                faculty: 'Sciences',
                primary: '#06A77D',
                secondary: '#F77F00',
                accent: '#D62828',
                darkBackground: '#1B263B',
            },
            {
                faculty: 'Arts',
                primary: '#7209B7',
                secondary: '#F72585',
                accent: '#4CC9F0',
                darkBackground: '#240046',
            },
            {
                faculty: 'Medicine',
                primary: '#C1121F',
                secondary: '#003049',
                accent: '#FDF0D5',
                darkBackground: '#780000',
            },
            {
                faculty: 'Law',
                primary: '#003049',
                secondary: '#D62828',
                accent: '#F77F00',
                darkBackground: '#001219',
            },
            {
                faculty: 'Education',
                primary: '#0077B6',
                secondary: '#00B4D8',
                accent: '#90E0EF',
                darkBackground: '#03045E',
            },
        ];

        res.json(facultyColors);
    } catch (error) {
        return handleControllerError(res, error, 'GetFacultyColors');
    }
};
