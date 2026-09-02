import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  parsedData?: Record<string, unknown> | null;
  analysis?: Record<string, unknown> | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    filePath: {
      type: String,
      default: "",
    },

    fileName: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    parsedData: {
      type: Schema.Types.Mixed,
      default: null,
    },

    analysis: {
      type: Schema.Types.Mixed,
      default: null,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ResumeSchema.index({ userId: 1 });

const Resume: Model<IResume> =
  mongoose.models.Resume ||
  mongoose.model<IResume>("Resume", ResumeSchema);

export default Resume;