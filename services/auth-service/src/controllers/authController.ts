import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(400).json({ message: 'User with that email or username already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, passwordHash });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: newUser._id, username: newUser.username, email: newUser.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { usernameOrEmail, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }]
        });
        
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.userId).select('-passwordHash');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                bio: user.bio,
                favoriteGames: user.favoriteGames,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const isFollowing = req.userId
            ? user.followers.some(id => id.toString() === req.userId)
            : false;
        res.json({
            _id: user._id,
            username: user.username,
            bio: user.bio,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            isFollowing,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching user profile' });
    }
};

export const followUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId!;

        if (userId === currentUserId) {
            res.status(400).json({ message: 'Cannot follow yourself' });
            return;
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        await User.findByIdAndUpdate(userId, { $addToSet: { followers: currentUserId } });
        await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: userId } });

        res.json({ message: 'Followed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error following user' });
    }
};

export const unfollowUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId!;

        await User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } });
        await User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } });

        res.json({ message: 'Unfollowed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error unfollowing user' });
    }
};

export const getFollowers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId)
            .populate<{ followers: { _id: string; username: string }[] }>('followers', '_id username');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user.followers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching followers' });
    }
};

export const getFollowing = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId)
            .populate<{ following: { _id: string; username: string }[] }>('following', '_id username');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user.following);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching following' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { avatarUrl, bio, favoriteGames } = req.body;
        const user = await User.findByIdAndUpdate(
            req.userId,
            { avatarUrl, bio, favoriteGames },
            { new: true }
        ).select('-passwordHash');

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            message: 'Profile updated',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                bio: user.bio,
                favoriteGames: user.favoriteGames
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};
