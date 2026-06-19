import { Router } from 'express';
import {
    registerUser, loginUser, getProfile, updateProfile,
    getUserProfile, followUser, unfollowUser, getFollowers, getFollowing
} from '../controllers/authController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);

router.get('/users/:username', optionalAuthMiddleware, getUserProfile);
router.post('/users/:userId/follow', authMiddleware, followUser);
router.delete('/users/:userId/follow', authMiddleware, unfollowUser);
router.get('/users/:userId/followers', authMiddleware, getFollowers);
router.get('/users/:userId/following', authMiddleware, getFollowing);

export default router;
