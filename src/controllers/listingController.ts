import type { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createListingSchema, updateListingSchema, purchaseSchema, updateStatusSchema } from '../validations/marketplaceValidation.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger.js';
import { createNotification } from '../services/notificationService.js';

const handleControllerError = (res: Response, error: any, context: string) => {
    logger.error(`${context} Controller Error`, error);
    if (error instanceof ZodError) {
        return res.status(400).json({
            message: error.issues[0]?.message || 'Validation failed',
            errors: error.issues
        });
    }
    return res.status(500).json({ message: 'Server error', error: error.message || error });
};

export const createListing = async (req: any, res: Response) => {
    /*  #swagger.tags = ['Listings']
        #swagger.description = 'Create a new marketplace listing. Requires multipart/form-data for images.'
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Listing details',
            required: true,
            schema: { $ref: '#/definitions/CreateListingRequest' }
        }
        #swagger.security = [{ "bearerAuth": [] }]
    */

    try {
        const validatedData = createListingSchema.parse(req.body);
        const { title, description, price, category, condition, faculty, department } = validatedData;
        const sellerId = req.user.id as string;
        const files = req.files as Express.Multer.File[];

        logger.info('Creating Listing', { sellerId, title });

        const listing = await prisma.listing.create({
            data: {
                title,
                description,
                price: new Prisma.Decimal(price),
                category,
                condition,
                quantity: validatedData.quantity || 1, // Added quantity support
                faculty: faculty || null,
                department: department || null,
                location: validatedData.location || null,
                isNegotiable: validatedData.isNegotiable || false,
                sellerId,
                images: {
                    create: files?.map((file) => ({
                        url: `/uploads/listings/${file.filename}`,
                    })) || [],
                },
            },
            include: { images: true },
        });

        logger.info('Listing Created Successfully', { listingId: listing.id });
        return res.status(201).json(listing);
    } catch (error: any) {
        return handleControllerError(res, error, 'CreateListing');
    }
};

export const getListings = async (req: Request, res: Response) => {
    /*  #swagger.tags = ['Listings']
        #swagger.description = 'Retrieve all listings with optional filtering.'
        #swagger.parameters['faculty'] = { in: 'query', description: 'Filter by faculty' }
        #swagger.parameters['category'] = { in: 'query', description: 'Filter by category' }
        #swagger.parameters['condition'] = { in: 'query', description: 'Filter by condition (NEW, USED, FAIR)' }
        #swagger.parameters['search'] = { in: 'query', description: 'Search title and description' }
        #swagger.parameters['sellerId'] = { in: 'query', description: 'Filter by seller' }
        #swagger.parameters['status'] = { in: 'query', description: 'Filter by status (e.g., ACTIVE, SOLD)' }
        #swagger.responses[200] = {
            description: 'Successful retrieval',
            schema: [{ $ref: '#/definitions/Listing' }]
        }
    */

    const { faculty, category, condition, search, sellerId, status, sort } = req.query;

    try {
        const where: any = {};

        // Default to ACTIVE if no specific status is requested, unless looking for specific seller
        if (status) {
            where.status = status as string;
        } else if (!sellerId) {
            where.status = 'ACTIVE';
        }

        if (sellerId) where.sellerId = sellerId as string;
        if (faculty && faculty !== 'All') where.faculty = faculty as string;
        if (category) where.category = category as string;
        if (condition) where.condition = condition as string;
        if (search) {
            where.OR = [
                { title: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'price_asc') orderBy = { price: 'asc' };
        if (sort === 'price_desc') orderBy = { price: 'desc' };
        if (sort === 'newest') orderBy = { createdAt: 'desc' };

        const listings = await prisma.listing.findMany({
            where,
            include: { images: true, seller: { select: { fullName: true, faculty: true, avatarUrl: true } } },
            orderBy,
        });
        return res.json(listings);
    } catch (error) {
        return handleControllerError(res, error, 'GetListings');
    }
};

export const getListingById = async (req: Request, res: Response) => {
    /*  #swagger.tags = ['Listings']
        #swagger.description = 'Retrieve full details for a specific listing.'
        #swagger.parameters['id'] = { in: 'path', description: 'Listing ID' }
        #swagger.responses[200] = {
            description: 'Listing details',
            schema: { $ref: '#/definitions/Listing' }
        }
    */

    const { id } = req.params;
    try {
        const listing = await prisma.listing.findUnique({
            where: { id: id as string },
            include: { images: true, seller: { select: { fullName: true, faculty: true, verificationStatus: true, avatarUrl: true } } },
        });
        if (!listing) return res.status(404).json({ message: 'Listing not found' });
        return res.json(listing);
    } catch (error) {
        return handleControllerError(res, error, 'GetListingById');
    }
};

export const updateListing = async (req: any, res: Response) => {
    /*  #swagger.tags = ['Listings']
        #swagger.description = 'Update an existing listing. Only the seller can update.'
        #swagger.parameters['id'] = { in: 'path', description: 'Listing ID' }
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Fields to update',
            schema: { $ref: '#/definitions/Listing' }
        }
        #swagger.security = [{ "bearerAuth": [] }]
    */

    const { id } = req.params;
    try {
        // Parse FormData fields (they come as strings)
        const bodyData: any = { ...req.body };

        // Convert string booleans and numbers
        if (bodyData.negotiable !== undefined) {
            bodyData.isNegotiable = bodyData.negotiable === 'true' || bodyData.negotiable === true;
            delete bodyData.negotiable;
        }
        if (bodyData.price) bodyData.price = parseFloat(bodyData.price);
        if (bodyData.quantity) bodyData.quantity = parseInt(bodyData.quantity);

        const validatedData = updateListingSchema.parse(bodyData);
        const listing = await prisma.listing.findUnique({ where: { id: id as string } });

        if (!listing) return res.status(404).json({ message: 'Listing not found' });
        if (listing.sellerId !== req.user.id) {
            logger.warn('Unauthorized update attempt', { listingId: id, userId: req.user.id });
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updateData: any = { ...validatedData };
        const oldPrice = listing.price;
        const newPrice = validatedData.price ? new Prisma.Decimal(validatedData.price) : oldPrice;
        if (validatedData.price) updateData.price = newPrice;

        // Handle image updates
        if (req.files && req.files.length > 0) {
            console.log('[Listings] -> updateListing: Processing', req.files.length, 'new images');

            // Delete images marked for removal
            const removeImageIds = req.body.removeImageIds
                ? JSON.parse(req.body.removeImageIds)
                : [];

            if (removeImageIds.length > 0) {
                await prisma.listingImage.deleteMany({
                    where: { id: { in: removeImageIds } }
                });
                console.log('[Listings] -> updateListing: Deleted', removeImageIds.length, 'images');
            }

            // Add new images
            const newImages = req.files.map((file: any) => ({
                url: `/uploads/listings/${file.filename}`,
                listingId: id as string,
            }));

            await prisma.listingImage.createMany({
                data: newImages,
            });
            console.log('[Listings] -> updateListing: Added', newImages.length, 'new images');
        }

        const updated = await prisma.listing.update({
            where: { id: id as string },
            data: {
                ...updateData,
                price: newPrice
            },
            include: { images: true },
        });

        // Price Drop Notification
        if (newPrice.lt(oldPrice)) {
            const savers = await prisma.savedItem.findMany({
                where: { listingId: id as string },
                select: { userId: true }
            });

            for (const saver of savers) {
                await createNotification({
                    userId: saver.userId,
                    type: 'PRICE_ALERT',
                    title: 'Price Drop Alert!',
                    body: `The price for "${updated.title}" has dropped to ${newPrice}! Check it out now.`,
                    metadata: { listingId: id, oldPrice: oldPrice.toString(), newPrice: newPrice.toString() }
                });
            }
        }

        logger.info('Listing Updated Successfully', { listingId: id });
        return res.json(updated);
    } catch (error) {
        return handleControllerError(res, error, 'UpdateListing');
    }
};

export const deleteListing = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const listing = await prisma.listing.findUnique({ where: { id: id as string } });

        if (!listing) return res.status(404).json({ message: 'Listing not found' });
        if (listing.sellerId !== req.user.id) {
            logger.warn('Unauthorized delete attempt', { listingId: id, userId: req.user.id });
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await prisma.$transaction([
            prisma.listingImage.deleteMany({ where: { listingId: id as string } }),
            prisma.listing.delete({ where: { id: id as string } }),
        ]);

        logger.info('Listing Deleted Successfully', { listingId: id });
        return res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
        return handleControllerError(res, error, 'DeleteListing');
    }
};

export const purchaseListing = async (req: any, res: Response) => {
    /*  #swagger.tags = ['Transactions']
        #swagger.description = 'Initiate a purchase for a listing.'
        #swagger.parameters['id'] = { in: 'path', description: 'Listing ID' }
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Purchase options',
            schema: {
                paymentMethod: 'WALLET',
                useEscrow: true
            }
        }
        #swagger.security = [{ "bearerAuth": [] }]
    */

    const { id } = req.params;
    const buyerId = req.user.id;

    try {
        const validatedData = purchaseSchema.parse(req.body);
        const { paymentMethod, useEscrow } = validatedData;

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: { seller: true },
        });

        if (!listing) return res.status(404).json({ message: 'Listing not found' });
        if (listing.status !== 'ACTIVE') return res.status(400).json({ message: 'Item is no longer available' });
        if (listing.sellerId === buyerId) return res.status(400).json({ message: 'You cannot buy your own item' });

        if (paymentMethod === 'WALLET') {
            const buyerWallet = await prisma.wallet.findUnique({ where: { userId: buyerId } });
            if (!buyerWallet || buyerWallet.balance.lt(listing.price)) {
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            const transaction = await prisma.$transaction(async (tx) => {
                // 1. Deduct from buyer
                const updatedBuyerWallet = await tx.wallet.update({
                    where: { userId: buyerId },
                    data: { balance: { decrement: listing.price } },
                });

                // 2. Create transaction record for buyer
                const buyerTx = await tx.transaction.create({
                    data: {
                        walletId: updatedBuyerWallet.id,
                        amount: listing.price,
                        type: 'PURCHASE',
                        status: 'SUCCESS',
                        description: `Purchase of ${listing.title}`,
                    },
                });

                // 3. Mark listing as SOLD (or RESERVED if using escrow, but for now SOLD)
                await tx.listing.update({
                    where: { id },
                    data: { status: 'SOLD' },
                });

                // 4. If not using escrow, credit seller immediately
                // (Escrow logic: funds would stay in a platform account until confirmed)
                // For basic implementation, we'll credit seller but ideally we hold it
                if (!useEscrow) {
                    const sellerWallet = await tx.wallet.update({
                        where: { userId: listing.sellerId },
                        data: { balance: { increment: listing.price } },
                    });
                    await tx.transaction.create({
                        data: {
                            walletId: sellerWallet.id,
                            amount: listing.price,
                            type: 'SALE',
                            status: 'SUCCESS',
                            description: `Sale of ${listing.title}`,
                        },
                    });
                }

                return buyerTx;
            });

            // 5. Notify parties
            await createNotification({
                userId: listing.sellerId,
                type: 'TRANSACTION',
                title: 'Item Sold!',
                body: `Your item "${listing.title}" has been purchased by ${req.user.fullName || 'a student'}.`,
                metadata: { listingId: id, transactionId: transaction.id }
            });

            await createNotification({
                userId: buyerId,
                type: 'TRANSACTION',
                title: 'Purchase Successful',
                body: `You have successfully purchased "${listing.title}".`,
                metadata: { listingId: id, transactionId: transaction.id }
            });

            logger.info('Purchase Successful', { listingId: id, buyerId });
            return res.json({
                message: 'Purchase successful',
                transactionId: transaction.id,
                escrowEnabled: useEscrow,
            });
        }

        return res.status(400).json({ message: 'Payment method not yet supported' });
    } catch (error) {
        return handleControllerError(res, error, 'PurchaseListing');
    }
};

export const updateStatus = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const validatedData = updateStatusSchema.parse(req.body);
        const { status } = validatedData;

        const listing = await prisma.listing.findUnique({ where: { id } });
        if (!listing) return res.status(404).json({ message: 'Listing not found' });

        if (listing.sellerId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updated = await prisma.listing.update({
            where: { id },
            data: { status },
        });

        logger.info('Listing Status Updated', { listingId: id, status });
        return res.json({ message: `Listing status updated to ${status}`, listing: updated });
    } catch (error) {
        return handleControllerError(res, error, 'UpdateStatus');
    }
};

export const reserveListing = async (req: any, res: Response) => {
    // Basic reservation logic
    const { id } = req.params;
    try {
        const listing = await prisma.listing.findUnique({ where: { id } });
        if (!listing) return res.status(404).json({ message: 'Listing not found' });

        if (listing.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Item already reserved or sold' });
        }

        await prisma.listing.update({
            where: { id },
            data: { status: 'RESERVED' },
        });

        logger.info('Listing Reserved', { listingId: id, reservedBy: req.user.id });
        return res.json({ message: 'Listing reserved successfully' });
    } catch (error) {
        return handleControllerError(res, error, 'ReserveListing');
    }
};
