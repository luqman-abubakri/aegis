import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterview extends Document {
  userId: mongoose.Types.ObjectId;
  role: string;
  difficulty: string;
  interviewType: string;
  status: string;
  score?: number | null;
  feedback?: Record<string, unknown> | null;
  durationSeconds: number;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    difficulty: {
      type: String,
      required: true,
      trim: true,
    },

    interviewType: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      required: true,
      default: "in_progress",
      index: true,
    },

    score: {
      type: Number,
      default: null,
    },

    feedback: {
      type: Schema.Types.Mixed,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

InterviewSchema.index({ userId: 1 });
InterviewSchema.index({ status: 1 });
InterviewSchema.index({ completedAt: 1 });

const Interview: Model<IInterview> =
  mongoose.models.Interview ||
  mongoose.model<IInterview>("Interview", InterviewSchema);

export default Interview;