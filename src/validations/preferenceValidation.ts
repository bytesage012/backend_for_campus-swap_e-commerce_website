import { z } from 'zod';

export const updateThemeSchema = z.object({
    themeMode: z.enum(['LIGHT', 'DARK', 'AUTO']).optional(),
    facultyThemeEnabled: z.boolean().optional(),
    accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
});
