import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResumeUpload extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  publicId: string;
  fileSize?: number;
  mimeType?: string;
  extractedText?: string;
  analysis?: Record<string, any> | null;
  parsedData?: Record<string, any> | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeUploadSchema = new Schema<IResumeUpload>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
    },

    mimeType: {
      type: String,
      default: "application/pdf",
    },

    extractedText: {
      type: String,
      default: "",
    },

    analysis: {
      type: Schema.Types.Mixed,
      default: null,
    },

    parsedData: {
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

const ResumeUpload: Model<IResumeUpload> =
  mongoose.models.ResumeUpload ||
  mongoose.model<IResumeUpload>("ResumeUpload", ResumeUploadSchema);

export default ResumeUpload;