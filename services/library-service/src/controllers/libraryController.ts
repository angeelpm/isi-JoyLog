import { Request, Response } from 'express';
import { GameEntry } from '../models/GameEntry';
import { Like } from '../models/Like';
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
            username: req.username,
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

        // Always persist username so community reviews never show "Anonymous"
        if (req.username) {
            updateData.username = req.username;
        }

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

// GET /reviews/:rawgGameId - Get community reviews for a game (public)
export const getGameReviews = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rawgGameId } = req.params;

        const entries = await GameEntry.find({
            rawgGameId,
            userId: { $ne: req.userId },
            $or: [
                { 'reviewLogs.0': { $exists: true } },
                { review: { $ne: '', $exists: true } }
            ]
        });

        let allReviews: any[] = [];

        entries.forEach(entry => {
            const username = entry.username || 'Anonymous';

            if (entry.reviewLogs && entry.reviewLogs.length > 0) {
                entry.reviewLogs.forEach(log => {
                    allReviews.push({
                        username,
                        text: log.text,
                        rating: log.rating,
                        hoursPlayed: log.hoursPlayed,
                        createdAt: log.createdAt,
                        isCurrentUser: req.userId === entry.userId,
                        reviewLogId: (log as any)._id?.toString(),
                        likeCount: 0,
                        isLikedByMe: false,
                    });
                });
            } else if (entry.review) {
                allReviews.push({
                    username,
                    text: entry.review,
                    rating: entry.rating,
                    hoursPlayed: entry.hoursPlayed,
                    createdAt: (entry as any).updatedAt || (entry as any).createdAt,
                    isCurrentUser: req.userId === entry.userId,
                    reviewLogId: undefined,
                    likeCount: 0,
                    isLikedByMe: false,
                });
            }
        });

        allReviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        // Bulk-fetch like counts and current user's likes to avoid N+1
        const reviewLogIds = allReviews
            .filter(r => r.reviewLogId)
            .map(r => r.reviewLogId);

        if (reviewLogIds.length > 0) {
            const likeCounts = await Like.aggregate([
                { $match: { reviewLogId: { $in: reviewLogIds } } },
                { $group: { _id: '$reviewLogId', count: { $sum: 1 } } }
            ]);
            const likeCountMap = new Map(likeCounts.map((l: any) => [l._id, l.count]));

            let likedSet = new Set<string>();
            if (req.userId) {
                const myLikes = await Like.find({
                    likerId: req.userId,
                    reviewLogId: { $in: reviewLogIds }
                }).select('reviewLogId');
                likedSet = new Set(myLikes.map(l => l.reviewLogId));
            }

            allReviews = allReviews.map(r => ({
                ...r,
                likeCount: r.reviewLogId ? (likeCountMap.get(r.reviewLogId) ?? 0) : 0,
                isLikedByMe: r.reviewLogId ? likedSet.has(r.reviewLogId) : false,
            }));
        }

        res.json({ reviews: allReviews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching community reviews' });
    }
};

// GET /stats/public/:userId - Get public stats for any user (no auth)
export const getPublicStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

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

        const normalizedStats = stats
            ? { ...stats, avgRating: stats.avgRating ?? 0 }
            : { total: 0, playing: 0, completed: 0, backlog: 0, dropped: 0, wishlist: 0, totalHoursPlayed: 0, avgRating: 0 };

        res.json({ stats: normalizedStats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching public stats' });
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

        const normalizedStats = stats
            ? { ...stats, avgRating: stats.avgRating ?? 0 }
            : { total: 0, playing: 0, completed: 0, backlog: 0, dropped: 0, wishlist: 0, totalHoursPlayed: 0, avgRating: 0 };

        res.json({ stats: normalizedStats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

// POST /likes - Like a specific reviewLog entry
export const likeReviewLog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { gameEntryId, reviewLogId } = req.body;

        if (!gameEntryId || !reviewLogId) {
            res.status(400).json({ message: 'gameEntryId and reviewLogId are required' });
            return;
        }

        await Like.create({ likerId: req.userId, gameEntryId, reviewLogId });
        res.status(201).json({ message: 'Liked successfully' });
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(409).json({ message: 'Already liked' });
            return;
        }
        console.error(error);
        res.status(500).json({ message: 'Error liking review' });
    }
};

// DELETE /likes/:reviewLogId - Unlike a reviewLog entry
export const unlikeReviewLog = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reviewLogId } = req.params;
        const deleted = await Like.findOneAndDelete({ likerId: req.userId, reviewLogId });

        if (!deleted) {
            res.status(404).json({ message: 'Like not found' });
            return;
        }

        res.json({ message: 'Unliked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error unliking review' });
    }
};