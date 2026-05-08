import { Router } from 'express';
import { addGame, getUserLibrary, updateGameStatus, removeGame } from '../controllers/libraryController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// Todas estas rutas requieren un token válido
router.use(verifyToken);

router.get('/', getUserLibrary);
router.post('/', addGame);
router.patch('/:id', updateGameStatus);
router.delete('/:id', removeGame);

export default router;
