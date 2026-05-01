import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  viewedBy: {
    userId: mongoose.Types.ObjectId;
    viewedAt: Date;
  }[];
  expiresAt: Date;
  createdAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "User ID is required"],
      ref: "User",
      index: true,
    },
    mediaUrl: {
      type: String,
      required: [true, "Media URL is required"],
    },
    mediaType: {
      type: String,
      required: [true, "Media type is required"],
      enum: ['image', 'video'],
    },
    caption: {
      type: String,
      maxlength: [500, "Caption cannot exceed 500 characters"],
    },
    viewedBy: {
      type: [
        {
          userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          viewedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

StorySchema.statics.getActiveStories = function(userId: string) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.Story;
}

const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);

export default Story;
