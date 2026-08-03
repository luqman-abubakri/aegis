export interface UserType {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Interview Types
export type InterviewType = "technical" | "behavioral" | "system-design";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type InterviewMode = "text" | "voice";

export interface InterviewConfig {
  role: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  mode: InterviewMode;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: InterviewType;
  difficulty: Difficulty;
  followUp?: boolean;
}

export interface AnswerEvaluation {
  questionId: string;
  question: string;
  answer: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  modelAnswer?: string;
}

export interface InterviewFeedback {
  overallScore: number;
  totalQuestions: number;
  answeredQuestions: number;
  strengths: string[];
  areasForImprovement: string[];
  summary: string;
  questionEvaluations: AnswerEvaluation[];
}

export interface InterviewState {
  config: InterviewConfig | null;
  status: "idle" | "setup" | "in-progress" | "paused" | "completed";
  currentQuestion: InterviewQuestion | null;
  questions: InterviewQuestion[];
  answers: AnswerEvaluation[];
  transcript: string[];
  duration: number;
  score: number;
  feedback: InterviewFeedback | null;
}

export interface VapiCallStatus {
  status: "disconnected" | "connecting" | "connected" | "ended";
  isSpeaking: boolean;
  isMuted: boolean;
  transcript: string;
  error: string | null;
}
