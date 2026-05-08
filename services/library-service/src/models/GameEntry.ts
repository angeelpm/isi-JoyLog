import mongoose, { Document, Schema } from 'mongoose';
import { GameEntry } from '../../../../shared/types/interfaces';

export interface IGameEntry extends Document, Omit<GameEntry, 'userId'> {
    userId: mongoose.Types.ObjectId;
}

const GameEntrySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gameId: { type: String, required: true },
    title: { type: String, required: true },
    platform: { type: String },
    status: { 
        type: String, 
        enum: ['playing', 'completed', 'backlog', 'dropped'], 
        default: 'backlog' 
    },
    rating: { type: Number, min: 0, max: 10 },
    hoursPlayed: { type: Number, default: 0 }
}, {
    timestamps: true
});

// A user shouldn't have duplicate games in their library
GameEntrySchema.index({ userId: 1, gameId: 1 }, { unique: true });

export const GameEntryModel = mongoose.model<IGameEntry>('GameEntry', GameEntrySchema);
