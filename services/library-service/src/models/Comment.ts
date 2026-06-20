import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
    commenterId: string;
    gameEntryId: string;
    reviewLogId: string;
    text: string;
    createdAt: Date;
}

const CommentSchema: Schema = new Schema({
    commenterId:  { type: String, required: true },
    gameEntryId:  { type: String, required: true },
    reviewLogId:  { type: String, required: true },
    text:         { type: String, required: true },
    createdAt:    { type: Date, default: Date.now }
});

CommentSchema.index({ reviewLogId: 1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
