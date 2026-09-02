import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILearningRoadmap extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  roadmapData?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const LearningRoadmapSchema = new Schema<ILearningRoadmap>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    roadmapData: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

LearningRoadmapSchema.index({ userId: 1 });

const LearningRoadmap: Model<ILearningRoadmap> =
  mongoose.models.LearningRoadmap ||
  mongoose.model<ILearningRoadmap>(
    "LearningRoadmap",
    LearningRoadmapSchema
  );

export default LearningRoadmap;