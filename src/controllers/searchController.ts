import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';

export const searchListings = async (req: Request, res: Response) => {
    const { q, category, minPrice, maxPrice, condition, faculty } = req.query;

    try {
        const where: any = {
            status: 'ACTIVE',
        };

        if (q) {
            where.OR = [
                { title: { contains: q as string, mode: 'insensitive' } },
                { description: { contains: q as string, mode: 'insensitive' } },
            ];
        }

        if (category) {
            where.category = category as string;
        }

        if (condition) {
            where.condition = condition as any;
        }

        if (faculty) {
            where.seller = {
                faculty: faculty as string,
            };
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = Number(minPrice);
            if (maxPrice) where.price.lte = Number(maxPrice);
        }

        const results = await prisma.listing.findMany({
            where,
            include: {
                images: true,
                seller: {
                    select: {
                        fullName: true,
                        faculty: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ results });
    } catch (error) {
        return handleControllerError(res, error, 'SearchListings');
    }
};
