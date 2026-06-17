import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';
import {
    getLibrary,
    addGame,
    updateGame,
    deleteGame,
    getStats,
    getGameReviews,
    getPublicStats,
    likeReviewLog,
    unlikeReviewLog
} from '../controllers/libraryController';
import { getGamePrices } from '../controllers/priceController';

const router = Router();

// Public routes (no auth required)
router.get('/prices', getGamePrices);
router.get('/reviews/:rawgGameId', optionalAuthMiddleware, getGameReviews);
router.get('/stats/public/:userId', getPublicStats);

// All routes below require authentication
router.use(authMiddleware);

router.get('/', getLibrary);
router.post('/', addGame);
router.get('/stats', getStats);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);
router.post('/likes', likeReviewLog);
router.delete('/likes/:reviewLogId', unlikeReviewLog);

export default router;
