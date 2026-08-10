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
  durationMinutes?: number;
  totalQuestions: number;
}

export interface ResumeExperience {
  role?: string;
  organization?: string;
  dates?: string;
  description?: string;
}

export interface ResumeEducation {
  degree?: string;
  institution?: string;
  dates?: string;
}

export interface ResumeProject {
  name?: string;
  description?: string;
  technologies?: string[];
}

export interface ResumeAnalysis {
  candidateName?: string;
  professionalTitle?: string;
  careerDomain?: string;
  careerLevel?: string;
  summary?: string;
  
  overallScore: number;
  atsScore: number;
  interviewReadiness: number;
  
  technicalSkills: string[];
  softSkills: string[];
  missingSkills: string[];
  
  strengths: string[];
  weaknesses: string[];
  
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  projects?: ResumeProject[];
  certifications?: string[];
  achievements?: string[];

  grammarIssues: string[];
  formattingIssues: string[];
  recommendations: string[];
  suggestedProjects: string[];
  suggestedCertifications: string[];
  suggestedTechnologies: string[];
  
  missingKeywords?: string[];
  interviewFocus?: string[];
}

export interface ResumeGeneratedInterview {
  title: string;
  description: string;
  questions: Array<{
    id: string;
    type: "technical" | "behavioral" | "project" | "problem-solving" | "follow-up";
    question: string;
    focus: string;
  }>;
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
  coachingMessage?: string;
  followUp?: boolean;
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
  currentQuestionIndex: number;
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
