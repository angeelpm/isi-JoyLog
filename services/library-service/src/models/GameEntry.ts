import mongoose, { Document, Schema } from 'mongoose';

export type GameStatus = 'playing' | 'completed' | 'dropped' | 'wishlist';

export interface IReviewLog {
    text: string;
    rating?: number;
    hoursPlayed?: number;
    createdAt?: Date;
}

export interface IGameEntry extends Document {
    userId: string;
    rawgGameId: number;
    title: string;
    coverImage: string;
    status: GameStatus;
    rating?: number;
    review?: string;
    reviewLogs?: IReviewLog[];
    hoursPlayed?: number;
    platforms?: string[];
    genres?: string[];
    startedAt?: Date;
    completedAt?: Date;
}

const GameEntrySchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    rawgGameId: { type: Number, required: true },
    title: { type: String, required: true },
    coverImage: { type: String, default: '' },
    status: {
        type: String,
        enum: ['playing', 'completed', 'dropped', 'wishlist'],
        default: 'wishlist',
        required: true
    },
    rating: { type: Number, min: 1, max: 10 },
    review: { type: String, default: '' },
    reviewLogs: [{
        text: String,
        rating: Number,
        hoursPlayed: Number,
        createdAt: { type: Date, default: Date.now }
    }],
    hoursPlayed: { type: Number, default: 0, min: 0 },
    platforms: [{ type: String }],
    genres: [{ type: String }],
    startedAt: { type: Date },
    completedAt: { type: Date }
}, {
    timestamps: true
});

// Compound index: one entry per game per user
GameEntrySchema.index({ userId: 1, rawgGameId: 1 }, { unique: true });

export const GameEntry = mongoose.model<IGameEntry>('GameEntry', GameEntrySchema);