import { Response } from 'express';
import { GameEntryModel } from '../models/GameEntry';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const addGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { gameId, title, platform, status, rating, hoursPlayed } = req.body;

        const newGame = new GameEntryModel({
            userId,
            gameId,
            title,
            platform,
            status,
            rating,
            hoursPlayed
        });

        await newGame.save();
        res.status(201).json({ message: 'Game added to library', game: newGame });
    } catch (error: any) {
        console.error(error);
        if (error.code === 11000) {
            res.status(400).json({ message: 'Game already exists in your library' });
            return;
        }
        res.status(500).json({ message: 'Error adding game to library' });
    }
};

export const getUserLibrary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const library = await GameEntryModel.find({ userId });
        res.json(library);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching library' });
    }
};

export const updateGameStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params; // Mongo ObjectID
        const updateData = req.body;

        const game = await GameEntryModel.findOneAndUpdate(
            { _id: id, userId },
            { $set: updateData },
            { new: true }
        );

        if (!game) {
            res.status(404).json({ message: 'Game not found in your library' });
            return;
        }

        res.json({ message: 'Game updated', game });
    } catch (error) {
        res.status(500).json({ message: 'Error updating game entry' });
    }
};

export const removeGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const deletedGame = await GameEntryModel.findOneAndDelete({ _id: id, userId });
        
        if (!deletedGame) {
            res.status(404).json({ message: 'Game not found' });
            return;
        }

        res.json({ message: 'Game removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing game' });
    }
};
