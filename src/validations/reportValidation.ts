import { z } from 'zod';

export const createReportSchema = z.object({
    reportedUserId: z.string().uuid().optional(),
    reportedListingId: z.string().uuid().optional(),
    reason: z.enum([
        'PROHIBITED_ITEM',
        'MISLEADING',
        'SCAM',
        'HARASSMENT',
        'INAPPROPRIATE_BEHAVIOR'
    ]),
    description: z.string().min(10).max(1000),
    evidenceUrls: z.array(z.string().url()).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
}).refine(data => data.reportedUserId || data.reportedListingId, {
    message: "Either reportedUserId or reportedListingId must be provided",
    path: ["reportedUserId", "reportedListingId"]
});
