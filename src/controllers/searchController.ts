import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';
import { handleControllerError } from './authController.js';

export const searchListings = async (req: Request, res: Response) => {
    const { q, category, minPrice, maxPrice, condition, faculty, sortBy, page = '1', limit = '20' } = req.query;

    try {
        const where: any = {
            status: 'ACTIVE',
        };

        // Search by title and description
        if (q) {
            where.OR = [
                { title: { contains: q as string, mode: 'insensitive' } },
                { description: { contains: q as string, mode: 'insensitive' } },
            ];
        }

        // Filter by category
        if (category) {
            where.category = category as string;
        }

        // Filter by condition
        if (condition) {
            where.condition = condition as any;
        }

        // Filter by faculty (through seller)
        if (faculty) {
            where.seller = {
                faculty: faculty as string,
            };
        }

        // Filter by price range (use Prisma.Decimal for comparison)
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) {
                where.price.gte = new Prisma.Decimal(minPrice as string);
            }
            if (maxPrice) {
                where.price.lte = new Prisma.Decimal(maxPrice as string);
            }
        }

        // Determine sort order
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sortBy === 'price_desc') {
            orderBy = { price: 'desc' };
        } else if (sortBy === 'newest') {
            orderBy = { createdAt: 'desc' };
        } else if (sortBy === 'oldest') {
            orderBy = { createdAt: 'asc' };
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
        const skip = (pageNum - 1) * limitNum;

        // Get total count for pagination
        const total = await prisma.listing.count({ where });

        // Fetch listings with pagination
        const results = await prisma.listing.findMany({
            where,
            include: {
                images: true,
                seller: {
                    select: {
                        id: true,
                        fullName: true,
                        faculty: true,
                        avatar: true,
                        avatarUrl: true,
                        isVerified: true,
                        verificationStatus: true,
                        trustScore: true,
                        riskScore: true,
                    },
                },
            },
            orderBy,
            skip,
            take: limitNum,
        });

        const totalPages = Math.ceil(total / limitNum);

        res.json({
            results,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
        });
    } catch (error) {
        return handleControllerError(res, error, 'SearchListings');
    }
};
