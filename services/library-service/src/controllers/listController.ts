import { Request, Response } from 'express';
import { GameList } from '../models/GameList';
import { AuthRequest } from '../middleware/authMiddleware';

const isOwnerOrCollaborator = (list: any, userId: string) =>
    list.ownerId === userId || list.collaborators.some((c: any) => c.userId === userId);

// POST /lists
export const createGameList = async (req: AuthRequest, res: Response): Promise<void> => {
    const { title, description, isPublic } = req.body;
    if (!title) {
        res.status(400).json({ message: 'title is required' });
        return;
    }
    try {
        const list = await GameList.create({
            ownerId: req.userId,
            ownerUsername: req.username,
            title,
            description,
            isPublic: isPublic ?? false
        });
        res.status(201).json({ list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating list' });
    }
};

// GET /lists/mine
export const getMineGameLists = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const lists = await GameList.find({
            $or: [{ ownerId: req.userId }, { 'collaborators.userId': req.userId }]
        });
        res.json({ lists });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching lists' });
    }
};

// GET /lists/user/:userId — public lists owned by a given user (for their public profile)
export const getUserGameLists = async (req: Request, res: Response): Promise<void> => {
    try {
        const lists = await GameList.find({ ownerId: req.params.userId, isPublic: true });
        res.json({ lists });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching lists' });
    }
};

// GET /lists/:listId
export const getGameList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const list = await GameList.findById(req.params.listId);
        if (!list) {
            res.status(404).json({ message: 'List not found' });
            return;
        }
        if (!list.isPublic && (!req.userId || !isOwnerOrCollaborator(list, req.userId))) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        res.json({ list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching list' });
    }
};

// PUT /lists/:listId
export const updateGameList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const list = await GameList.findById(req.params.listId);
        if (!list) {
            res.status(404).json({ message: 'List not found' });
            return;
        }
        if (list.ownerId !== req.userId) {
            res.status(403).json({ message: 'Only the owner can edit this list' });
            return;
        }
        const { title, description, isPublic } = req.body;
        const updated = await GameList.findByIdAndUpdate(
            req.params.listId,
            { title, description, isPublic },
            { new: true }
        );
        res.json({ list: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating list' });
    }
};

// POST /lists/:listId/games
export const addGameToList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const list = await GameList.findById(req.params.listId);
        if (!list) {
            res.status(404).json({ message: 'List not found' });
            return;
        }
        if (!isOwnerOrCollaborator(list, req.userId!)) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        const { rawgGameId, title, coverImage } = req.body;
        if (rawgGameId === undefined || rawgGameId === null || !title) {
            res.status(400).json({ message: 'rawgGameId and title are required' });
            return;
        }
        const rawgGameIdStr = String(rawgGameId);
        const alreadyInList = list.games.some(g => g.rawgGameId === rawgGameIdStr);
        if (!alreadyInList) {
            list.games.push({ rawgGameId: rawgGameIdStr, title, coverImage: coverImage || '' });
            await list.save();
        }
        res.json({ list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding game to list' });
    }
};

// DELETE /lists/:listId/games/:rawgGameId
export const removeGameFromList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const list = await GameList.findById(req.params.listId);
        if (!list) {
            res.status(404).json({ message: 'List not found' });
            return;
        }
        if (!isOwnerOrCollaborator(list, req.userId!)) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        list.games = list.games.filter(g => g.rawgGameId !== req.params.rawgGameId);
        await list.save();
        res.json({ list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing game from list' });
    }
};

// POST /lists/:listId/collaborators
export const addCollaborator = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const list = await GameList.findById(req.params.listId);
        if (!list) {
            res.status(404).json({ message: 'List not found' });
            return;
        }
        if (list.ownerId !== req.userId) {
            res.status(403).json({ message: 'Only the owner can manage collaborators' });
            return;
        }
        const { userId, username } = req.body;
        if (!userId || !username) {
            res.status(400).json({ message: 'userId and username are required' });
            return;
        }
        if (userId === list.ownerId) {
            res.status(400).json({ message: 'Owner is already part of the list' });
            return;
        }
        const alreadyCollaborator = list.collaborators.some(c => c.userId === userId);
        if (!alreadyCollaborator) {
            list.collaborators.push({ userId, username });
            await list.save();
        }
        res.json({ list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding collaborator' });
    }
};

// DELETE /lists/:listId/collaborators/:userId
export const removeCollaborator = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const list = await GameList.findById(req.params.listId);
        if (!list) {
            res.status(404).json({ message: 'List not found' });
            return;
        }
        if (list.ownerId !== req.userId) {
            res.status(403).json({ message: 'Only the owner can manage collaborators' });
            return;
        }
        list.collaborators = list.collaborators.filter(c => c.userId !== req.params.userId);
        await list.save();
        res.json({ list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing collaborator' });
    }
};

// DELETE /lists/:listId
export const deleteGameList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const list = await GameList.findById(req.params.listId);
        if (!list) {
            res.status(404).json({ message: 'List not found' });
            return;
        }
        if (list.ownerId !== req.userId) {
            res.status(403).json({ message: 'Only the owner can delete this list' });
            return;
        }
        await list.deleteOne();
        res.json({ message: 'List deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting list' });
    }
};
