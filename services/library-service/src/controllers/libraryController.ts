import { Response } from 'express';
import { GameEntry } from '../models/GameEntry';
import { AuthRequest } from '../middleware/authMiddleware';

// GET / - Get user's library (optional status filter)
export const getLibrary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, sort } = req.query;
        const filter: any = { userId: req.userId };
        if (status && status !== 'all') {
            filter.status = status;
        }

        let sortOption: any = { updatedAt: -1 };
        if (sort === 'title') sortOption = { title: 1 };
        if (sort === 'rating') sortOption = { rating: -1 };
        if (sort === 'recent') sortOption = { createdAt: -1 };

        const entries = await GameEntry.find(filter).sort(sortOption);
        res.json({ entries, total: entries.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching library' });
    }
};

// POST / - Add game to library
export const addGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rawgGameId, title, coverImage, status, rating, review, reviewLogs, hoursPlayed, platforms, genres } = req.body;

        // Check if game already in library
        const existing = await GameEntry.findOne({ userId: req.userId, rawgGameId });
        if (existing) {
            res.status(400).json({ message: 'Game already in your library' });
            return;
        }

        const entry = new GameEntry({
            userId: req.userId,
            rawgGameId,
            title,
            coverImage,
            status: status || 'backlog',
            rating,
            review,
            reviewLogs,
            hoursPlayed,
            platforms,
            genres,
            startedAt: status === 'playing' ? new Date() : undefined
        });

        await entry.save();
        res.status(201).json({ message: 'Game added to library', entry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding game' });
    }
};

// PUT /:id - Update game entry
export const updateGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Auto-set date fields based on status changes
        if (updateData.status === 'completed' && !updateData.completedAt) {
            updateData.completedAt = new Date();
        }
        if (updateData.status === 'playing' && !updateData.startedAt) {
            updateData.startedAt = new Date();
        }

        const entry = await GameEntry.findOneAndUpdate(
            { _id: id, userId: req.userId },
            updateData,
            { new: true }
        );

        if (!entry) {
            res.status(404).json({ message: 'Game entry not found' });
            return;
        }

        res.json({ message: 'Game updated', entry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating game' });
    }
};

// DELETE /:id - Remove game from library
export const deleteGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const entry = await GameEntry.findOneAndDelete({ _id: id, userId: req.userId });

        if (!entry) {
            res.status(404).json({ message: 'Game entry not found' });
            return;
        }

        res.json({ message: 'Game removed from library' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting game' });
    }
};

// GET /stats - Get user stats
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;

        const [stats] = await GameEntry.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    playing: { $sum: { $cond: [{ $eq: ['$status', 'playing'] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    backlog: { $sum: { $cond: [{ $eq: ['$status', 'backlog'] }, 1, 0] } },
                    dropped: { $sum: { $cond: [{ $eq: ['$status', 'dropped'] }, 1, 0] } },
                    wishlist: { $sum: { $cond: [{ $eq: ['$status', 'wishlist'] }, 1, 0] } },
                    totalHoursPlayed: { $sum: { $ifNull: ['$hoursPlayed', 0] } },
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

        res.json({
            stats: stats || {
                total: 0, playing: 0, completed: 0, backlog: 0,
                dropped: 0, wishlist: 0, totalHoursPlayed: 0, avgRating: 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};