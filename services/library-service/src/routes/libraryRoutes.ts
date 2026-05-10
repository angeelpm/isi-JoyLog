import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    getLibrary,
    addGame,
    updateGame,
    deleteGame,
    getStats,
    getGameReviews
} from '../controllers/libraryController';
import { getGamePrices } from '../controllers/priceController';

const router = Router();

// Public routes (no auth required)
router.get('/prices', getGamePrices);

// All routes below require authentication
router.use(authMiddleware);

router.get('/', getLibrary);
router.post('/', addGame);
router.get('/stats', getStats);
router.get('/reviews/:rawgGameId', getGameReviews);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);

export default router;
