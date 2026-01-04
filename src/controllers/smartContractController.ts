import type { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma.js';
import { handleControllerError } from './authController.js';
import crypto from 'crypto';
import { getIO } from '../socket.js';
import { createNotification } from '../services/notificationService.js';

// Zod Schemas
const createContractSchema = z.object({
    buyerId: z.string().uuid(),
    sellerId: z.string().uuid(),
    listingId: z.string().uuid(),
    terms: z.object({
        price: z.number().positive(),
        escrowFee: z.number().min(0),
        releaseConditions: z.array(z.string()),
        disputeResolution: z.object({
            arbitrationFee: z.number(),
            timeout: z.string(),
            thirdPartyArbitration: z.boolean(),
        }),
    }),
});

const signContractSchema = z.object({
    signature: z.string(), // Mock signature
});

// Helper to generate hash for audit
const generateHash = (data: any) => {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

export const createSmartContract = async (req: Request, res: Response) => {
    try {
        const validated = createContractSchema.parse(req.body);
        const { buyerId, sellerId, listingId, terms } = validated;

        // Ensure Listing exists and is active
        const listing = await prisma.listing.findUnique({ where: { id: listingId } });
        if (!listing) return res.status(404).json({ message: 'Listing not found' });

        const contract = await (prisma as any).smartContract.create({
            data: {
                buyerId,
                sellerId,
                listingId,
                terms,
                state: {
                    buyer_signed: false,
                    seller_signed: false,
                    created_at: new Date().toISOString()
                },
                status: 'CREATED'
            }
        });

        // Audit Log
        await (prisma as any).contractAudit.create({
            data: {
                contractId: contract.id,
                action: 'CREATED',
                actorId: (req as any).user.id, // Creator (could be buyer or seller)
                payload: validated,
                hash: generateHash(validated)
            }
        });

        // Notify the parties
        await createNotification({
            userId: buyerId === (req as any).user.id ? sellerId : buyerId,
            type: 'TRANSACTION',
            title: 'New Smart Contract Created',
            body: ` A new contract has been created for ${listing.title}. Please review and sign.`,
            metadata: { contractId: contract.id, listingId }
        });

        res.status(201).json(contract);
    } catch (error) {
        handleControllerError(res, error, 'CreateSmartContract');
    }
};

export const signContract = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;
        const { signature } = signContractSchema.parse(req.body);

        const contract = await (prisma as any).smartContract.findUnique({ where: { id } });
        if (!contract) return res.status(404).json({ message: 'Contract not found' });

        const state: any = contract.state || {};
        let updatedState = { ...state };
        let action = '';

        if (userId === contract.buyerId) {
            if (state.buyer_signed) return res.status(400).json({ message: 'Already signed by buyer' });
            updatedState.buyer_signed = true;
            updatedState.buyer_signature = signature;
            action = 'BUYER_SIGNED';
        } else if (userId === contract.sellerId) {
            if (state.seller_signed) return res.status(400).json({ message: 'Already signed by seller' });
            updatedState.seller_signed = true;
            updatedState.seller_signature = signature;
            action = 'SELLER_SIGNED';
        } else {
            return res.status(403).json({ message: 'Not a party to this contract' });
        }

        let newStatus = contract.status;
        if (updatedState.buyer_signed && updatedState.seller_signed) {
            newStatus = 'SIGNED';
        }

        const updatedContract = await (prisma as any).smartContract.update({
            where: { id },
            data: {
                state: updatedState,
                status: newStatus
            }
        });

        // Audit Log
        await prisma.contractAudit.create({
            data: {
                contractId: contract.id,
                action: action,
                actorId: userId,
                payload: { signature },
                hash: generateHash({ signature, timestamp: new Date() })
            }
        });

        // Notify the other party
        const otherPartyId = userId === contract.buyerId ? contract.sellerId : contract.buyerId;

        getIO().to(`user_${otherPartyId}`).emit('contract_updated', updatedContract);

        await createNotification({
            userId: otherPartyId,
            type: 'TRANSACTION',
            title: 'Contract Signed',
            body: `The other party has signed the contract for your transaction. Status: ${newStatus}`,
            metadata: { contractId: contract.id, status: newStatus }
        });

        res.json(updatedContract);

    } catch (error) {
        handleControllerError(res, error, 'SignSmartContract');
    }
};

export const getContract = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const contract = await (prisma as any).smartContract.findUnique({
            where: { id },
            include: {
                audits: true,
                evidence: true
            }
        });
        if (!contract) return res.status(404).json({ message: 'Contract not found' });
        res.json(contract);
    } catch (error) {
        handleControllerError(res, error, 'GetSmartContract');
    }
}

export const releaseFunds = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        // Mock release logic: 
        // 1. Check if contract exists and is in correct state (SIGNED or DISPUTED)
        // 2. Verify release conditions (e.g. buyer confirmed, or admin override)
        // 3. Update status to COMPLETED
        // 4. Move funds (update Wallet balances) - Mocked here as we just update contract status 

        const contract = await (prisma as any).smartContract.findUnique({ where: { id } });
        if (!contract) return res.status(404).json({ message: 'Contract not found' });

        if (contract.status !== 'SIGNED' && contract.status !== 'DISPUTED') {
            return res.status(400).json({ message: 'Contract not ready for release' });
        }

        // Simple authorized release: Buyer or Seller (if agreed) or Admin
        // For simulation, let's say only Buyer can release to Seller, or Admin can force it.
        // Assuming req.user has isAdmin for override (mocked check)

        const isBuyer = userId === contract.buyerId;
        const isAdmin = (req as any).user.isAdmin; // Assuming middleware populates this

        if (!isBuyer && !isAdmin) {
            return res.status(403).json({ message: 'Only buyer or admin can release funds' });
        }

        // Logic to transfer funds would go here (Debit Buyer, Credit Seller)
        // prisma.wallet.update(...)

        const updatedContract = await (prisma as any).smartContract.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                state: {
                    ...contract.state as object,
                    released_at: new Date().toISOString(),
                    released_by: userId
                }
            }
        });

        // Audit Log
        await (prisma as any).contractAudit.create({
            data: {
                contractId: contract.id,
                action: 'FUNDS_RELEASED',
                actorId: userId,
                payload: { method: isAdmin ? 'ADMIN_OVERRIDE' : 'BUYER_CONFIRMATION' },
                hash: generateHash({ action: 'RELEASE', timestamp: new Date() })
            }
        });

        // Notify both parties
        getIO().to(`user_${contract.buyerId}`).emit('contract_updated', updatedContract);
        getIO().to(`user_${contract.sellerId}`).emit('contract_updated', updatedContract);

        await createNotification({
            userId: contract.sellerId,
            type: 'TRANSACTION',
            title: 'Funds Released',
            body: `Funds for contract ${contract.id} have been released to your wallet.`,
            metadata: { contractId: contract.id, action: 'RELEASED' }
        });

        await createNotification({
            userId: contract.buyerId,
            type: 'TRANSACTION',
            title: 'Transaction Completed',
            body: `Transaction for contract ${contract.id} is now complete.`,
            metadata: { contractId: contract.id, action: 'COMPLETED' }
        });

        res.json(updatedContract);

    } catch (error) {
        handleControllerError(res, error, 'ReleaseFunds');
    }
};
