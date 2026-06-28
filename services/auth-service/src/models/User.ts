import mongoose, { Document, Schema } from 'mongoose';

export interface IFavoriteGame {
    rawgGameId: string;
    title: string;
    coverImage: string;
}

export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string;
    bio?: string;
    favoriteGames?: IFavoriteGame[];
    followers: mongoose.Types.ObjectId[];
    following: mongoose.Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    favoriteGames: [{
        rawgGameId: { type: String, required: true },
        title: { type: String, required: true },
        coverImage: { type: String, default: '' }
    }],
    followers: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    following: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] }
}, {
    timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
