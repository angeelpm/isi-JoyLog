import mongoose, { Document, Schema } from 'mongoose';

export interface ILike extends Document {
    likerId: string;
    gameEntryId: string;
    reviewLogId: string;
    createdAt: Date;
}

const LikeSchema: Schema = new Schema({
    likerId:     { type: String, required: true },
    gameEntryId: { type: String, required: true },
    reviewLogId: { type: String, required: true },
    createdAt:   { type: Date, default: Date.now }
});

LikeSchema.index({ likerId: 1, reviewLogId: 1 }, { unique: true });

export const Like = mongoose.model<ILike>('Like', LikeSchema);
