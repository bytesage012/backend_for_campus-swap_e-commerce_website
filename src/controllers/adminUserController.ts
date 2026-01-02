import type { Response } from 'express';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import { getIO } from '../socket.js';
import { Parser } from 'json2csv';

export const getUsers = async (req: any, res: Response) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            status, // VERIFIED, PENDING, etc.
            faculty,
            role,
            minTrustScore,
            maxRiskScore,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            cursor, // For cursor-based pagination (optional implementation)
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: String(search), mode: 'insensitive' } },
                { fullName: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        if (status) where.verificationStatus = status;
        if (faculty) where.faculty = faculty;
        if (role) where.role = role;
        if (minTrustScore) where.trustScore = { gte: Number(minTrustScore) };
        if (maxRiskScore) where.riskScore = { lte: Number(maxRiskScore) };

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: { [String(sortBy)]: String(sortOrder) },
                include: {
                    _count: {
                        select: {
                            listings: true,
                            reportsReceived: true,
                        }
                    }
                }
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            data: users,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        handleControllerError(res, error, 'GetUsers');
    }
};

export const bulkUserAction = async (req: any, res: Response) => {
    try {
        const { userIds, action, data } = req.body;
        const adminId = req.user.id;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'No users selected' });
        }

        let result;

        switch (action) {
            case 'UPDATE_STATUS':
                result = await prisma.user.updateMany({
                    where: { id: { in: userIds } },
                    data: { verificationStatus: data.status },
                });
                break;
            case 'BAN':
                // Custom logic for banning (e.g., set isActive: false if exists, or high risk score)
                result = await prisma.user.updateMany({
                    where: { id: { in: userIds } },
                    data: { riskScore: 100 },
                });
                break;
            default:
                return res.status(400).json({ message: 'Invalid action' });
        }

        // Log action
        await prisma.adminLog.create({
            data: {
                action: `BULK_${action}`,
                actorId: adminId,
                details: { userIds, data },
                ipAddress: req.ip
            }
        });

        // Notify via Websocket
        getIO().to('admin_room').emit('users_updated', {
            action,
            count: result.count,
            userIds
        });

        res.json({ message: 'Bulk action completed', count: result.count });

    } catch (error) {
        handleControllerError(res, error, 'BulkUserAction');
    }
};

export const exportUsers = async (req: any, res: Response) => {
    try {
        // Similar filters to getUsers but without pagination
        const where: any = {};
        // ... (filtering logic same as above)

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                verificationStatus: true,
                trustScore: true,
                createdAt: true,
            }
        });

        const parser = new Parser();
        const csv = parser.parse(users);

        res.header('Content-Type', 'text/csv');
        res.attachment('users-export.csv');
        return res.send(csv);

    } catch (error) {
        handleControllerError(res, error, 'ExportUsers');
    }
};
