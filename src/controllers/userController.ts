import type { Request, Response } from 'express';
import { handleControllerError } from './authController.js';
import { getPublicUserProfile } from '../services/userProfileService.js';

export const getPublicProfile = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await getPublicUserProfile(id as string);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json(user);
    } catch (error) {
        return handleControllerError(res, error, 'GetPublicProfile');
    }
};
