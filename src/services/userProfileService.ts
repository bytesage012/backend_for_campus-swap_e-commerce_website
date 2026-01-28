import prisma from '../prisma.js';
import type { Prisma } from '@prisma/client';

/**
 * Utility service for securely fetching user profile data
 * Ensures sensitive fields (password, transactionPin) are never exposed
 */

/**
 * Secure select object for authenticated user profile
 * Includes all necessary fields but explicitly excludes transactionPin and password
 */
const getUserProfileSelect = (): Prisma.UserSelect => ({
    id: true,
    email: true,
    fullName: true,
    phoneNumber: true,
    faculty: true,
    department: true,
    academicLevel: true,
    residenceArea: true,
    isVerified: true,
    verificationLevel: true,
    verificationStatus: true,
    badge: true,
    avatarUrl: true,
    isAdmin: true,
    role: true,
    createdAt: true,
    updatedAt: true,
    trustScore: true,
    riskScore: true,
    lastLoginAt: true,
    // Include wallet data but exclude transactionPin
    wallet: {
        select: {
            id: true,
            balance: true,
            reservedBalance: true,
            pinSetAt: true, // Include this to determine if PIN exists
            createdAt: true,
            updatedAt: true,
            transactions: {
                orderBy: { createdAt: 'desc' as const },
                take: 10,
                select: {
                    id: true,
                    amount: true,
                    type: true,
                    status: true,
                    reference: true,
                    description: true,
                    platformFee: true,
                    escrowStatus: true,
                    escrowReleaseDate: true,
                    deliveredAt: true,
                    receivedAt: true,
                    createdAt: true,
                    updatedAt: true,
                }
            }
        }
    }
});

/**
 * Fetches user profile with secure field selection
 * Returns a mapped object with hasTransactionPin instead of the hash
 */
export const getUserProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: getUserProfileSelect()
    });

    if (!user) {
        return null;
    }

    // Map the response to add hasTransactionPin and remove sensitive data
    return mapUserProfileResponse(user);
};

/**
 * Maps raw user data to response format
 * Adds computed hasTransactionPin field based on pinSetAt
 */
export const mapUserProfileResponse = (user: any) => {
    const { wallet, ...userFields } = user;

    // Create the response object
    const response = {
        ...userFields,
        wallet: wallet ? {
            ...wallet,
            hasTransactionPin: wallet.pinSetAt !== null,
            // Ensure transactionPin is never included (double safety)
        } : null
    };

    return response;
};

/**
 * Fetches user profile with transactions
 * Secure version that includes wallet data but excludes transactionPin
 */
export const getUserProfileWithTransactions = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: getUserProfileSelect()
    });

    if (!user) {
        return null;
    }

    return mapUserProfileResponse(user);
};

/**
 * Secure select for public user profiles
 * Much more limited than authenticated profiles
 */
export const getPublicUserSelect = (): Prisma.UserSelect => ({
    id: true,
    fullName: true,
    faculty: true,
    avatarUrl: true,
    verificationStatus: true,
    badge: true,
    createdAt: true,
    trustScore: true,
    listings: {
        where: { status: 'ACTIVE' },
        select: {
            id: true,
            title: true,
            price: true,
            images: true,
            createdAt: true,
            condition: true
        },
        orderBy: { createdAt: 'desc' as const },
        take: 6,
    },
    reviewsReceived: {
        select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: {
                select: {
                    fullName: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: { createdAt: 'desc' as const },
        take: 5,
    },
    _count: {
        select: {
            listings: { where: { status: 'ACTIVE' } },
            reviewsReceived: true,
        }
    }
});

/**
 * Fetches public user profile
 */
export const getPublicUserProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: getPublicUserSelect()
    });

    return user;
};
