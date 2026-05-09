import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    getLibrary,
    addGame,
    updateGame,
    deleteGame,
    getStats
} from '../controllers/libraryController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getLibrary);
router.post('/', addGame);
router.get('/stats', getStats);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);

export default router;
