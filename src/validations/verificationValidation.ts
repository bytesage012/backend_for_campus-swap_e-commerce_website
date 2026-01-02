import { z } from 'zod';

export const uploadIdSchema = z.object({
    documentType: z.enum(['STUDENT_ID', 'ADMISSION_LETTER', 'COURSE_REGISTRATION']),
});

export const submitReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
    targetId: z.string().uuid(),
});
