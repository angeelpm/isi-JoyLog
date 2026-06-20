import { Request, Response } from 'express';
import { GameList } from '../models/GameList';
import { AuthRequest } from '../middleware/authMiddleware';

const isOwnerOrCollaborator = (list: any, userId: string) =>
    list.ownerId === userId || list.collaboratorIds.includes(userId);

// POST /lists
export const createGameList = async (req: AuthRequest, res: Response): Promise<void> => {
    const { title, description, isPublic } = req.body;
    if (!title) {
        res.status(400).json({ message: 'title is required' });
        return;
    }
    try {
        const list = await GameList.create({ ownerId: req.userId, title, description, isPublic: isPublic ?? false });
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
            $or: [{ ownerId: req.userId }, { collaboratorIds: req.userId }]
        });
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
        const updated = await GameList.findByIdAndUpdate(
            req.params.listId,
            { $addToSet: { rawgGameIds: String(req.body.rawgGameId) } },
            { new: true }
        );
        res.json({ list: updated });
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
        const updated = await GameList.findByIdAndUpdate(
            req.params.listId,
            { $pull: { rawgGameIds: req.params.rawgGameId } },
            { new: true }
        );
        res.json({ list: updated });
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
        const updated = await GameList.findByIdAndUpdate(
            req.params.listId,
            { $addToSet: { collaboratorIds: req.body.userId } },
            { new: true }
        );
        res.json({ list: updated });
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
        const updated = await GameList.findByIdAndUpdate(
            req.params.listId,
            { $pull: { collaboratorIds: req.params.userId } },
            { new: true }
        );
        res.json({ list: updated });
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
