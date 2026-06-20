import mongoose, { Document, Schema } from 'mongoose';

export interface IGameList extends Document {
    ownerId: string;
    title: string;
    description?: string;
    isPublic: boolean;
    collaboratorIds: string[];
    rawgGameIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

const GameListSchema: Schema = new Schema({
    ownerId:         { type: String, required: true },
    title:           { type: String, required: true },
    description:     { type: String },
    isPublic:        { type: Boolean, default: false },
    collaboratorIds: { type: [String], default: [] },
    rawgGameIds:     { type: [String], default: [] }
}, { timestamps: true });

export const GameList = mongoose.model<IGameList>('GameList', GameListSchema);
