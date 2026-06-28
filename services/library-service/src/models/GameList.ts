import mongoose, { Document, Schema } from 'mongoose';

export interface IGameListGame {
    rawgGameId: string;
    title: string;
    coverImage?: string;
}

export interface IGameListCollaborator {
    userId: string;
    username: string;
}

export interface IGameList extends Document {
    ownerId: string;
    ownerUsername?: string;
    title: string;
    description?: string;
    isPublic: boolean;
    collaborators: IGameListCollaborator[];
    games: IGameListGame[];
    createdAt: Date;
    updatedAt: Date;
}

const GameListSchema: Schema = new Schema({
    ownerId:         { type: String, required: true },
    ownerUsername:   { type: String },
    title:           { type: String, required: true },
    description:     { type: String },
    isPublic:        { type: Boolean, default: false },
    collaborators: [{
        userId:   { type: String, required: true },
        username: { type: String, required: true }
    }],
    games: [{
        rawgGameId: { type: String, required: true },
        title:      { type: String, required: true },
        coverImage: { type: String, default: '' }
    }]
}, { timestamps: true });

export const GameList = mongoose.model<IGameList>('GameList', GameListSchema);
