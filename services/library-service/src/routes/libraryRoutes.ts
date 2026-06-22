import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';
import {
    getLibrary,
    addGame,
    updateGame,
    deleteGame,
    getStats,
    getGameReviews,
    getGameEntryByRawgId,
    getPublicStats,
    likeReviewLog,
    unlikeReviewLog,
    createComment,
    getComments,
    deleteComment,
    getActivityFeed,
    getCommonGames
} from '../controllers/libraryController';
import { getGamePrices } from '../controllers/priceController';
import {
    createGameList,
    getMineGameLists,
    getUserGameLists,
    getGameList,
    updateGameList,
    addGameToList,
    removeGameFromList,
    addCollaborator,
    removeCollaborator,
    deleteGameList
} from '../controllers/listController';

const router = Router();

// Public routes (no auth required)
router.get('/prices', getGamePrices);
router.get('/reviews/:rawgGameId', optionalAuthMiddleware, getGameReviews);
router.get('/stats/public/:userId', getPublicStats);
router.get('/comments/:reviewLogId', getComments);

// List routes: /mine and /user/:userId must be defined before /:listId (order matters)
router.get('/lists/mine', authMiddleware, getMineGameLists);
router.get('/lists/user/:userId', getUserGameLists);
router.get('/lists/:listId', optionalAuthMiddleware, getGameList);

// All routes below require authentication
router.use(authMiddleware);

router.get('/', getLibrary);
router.get('/by-rawg/:rawgGameId', getGameEntryByRawgId);
router.post('/', addGame);
router.get('/stats', getStats);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);
router.post('/likes', likeReviewLog);
router.delete('/likes/:reviewLogId', unlikeReviewLog);
router.post('/comments', createComment);
router.delete('/comments/:commentId', deleteComment);
router.get('/feed', getActivityFeed);
router.get('/common/:otherUserId', getCommonGames);
router.post('/lists', createGameList);
router.put('/lists/:listId', updateGameList);
router.post('/lists/:listId/games', addGameToList);
router.delete('/lists/:listId/games/:rawgGameId', removeGameFromList);
router.post('/lists/:listId/collaborators', addCollaborator);
router.delete('/lists/:listId/collaborators/:userId', removeCollaborator);
router.delete('/lists/:listId', deleteGameList);

export default router;
