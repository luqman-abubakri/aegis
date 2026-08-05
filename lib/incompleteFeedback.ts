import type { InterviewFeedback } from "@/types";

/**
 * Deterministic fallback feedback for interviews that were never attempted.
 *
 * This module contains NO AI, NO randomness, and NO network calls. It exists
 * so that a user pressing "Finish" without answering a single question can
 * never receive fabricated, AI-generated praise or an inflated score.
 */

export const INCOMPLETE_SUMMARY =
  "No meaningful assessment could be generated because no interview questions were answered.";

export const INCOMPLETE_IMPROVEMENTS = [
  "Complete the interview before requesting feedback",
  "Answer every interview question",
  "Explain your reasoning clearly",
  "Practice technical communication",
];

export const INCOMPLETE_STRENGTHS: string[] = [];

/** True when the candidate submitted zero answers. */
export function isIncompleteInterview(
  answeredQuestions: number,
  totalQuestions: number
): boolean {
  return answeredQuestions <= 0 && totalQuestions > 0;
}

/** True when some-but-not-all questions were answered. */
export function isPartialInterview(
  answeredQuestions: number,
  totalQuestions: number
): boolean {
  return answeredQuestions > 0 && answeredQuestions < totalQuestions;
}

/** Resolve the persistence status for an interview save. */
export function resolveInterviewStatus(
  answeredQuestions: number,
  totalQuestions: number
): "incomplete" | "partial" | "completed" {
  if (isIncompleteInterview(answeredQuestions, totalQuestions)) {
    return "incomplete";
  }

  if (isPartialInterview(answeredQuestions, totalQuestions)) {
    return "partial";
  }

  return "completed";
}

/**
 * Build the deterministic feedback for a completely unattempted interview.
 * Score is always exactly 0 and there are never any fabricated strengths.
 */
export function buildIncompleteFeedback(
  totalQuestions: number,
  answeredQuestions = 0
): InterviewFeedback {
  return {
    overallScore: 0,
    totalQuestions: Math.max(0, Math.round(totalQuestions)),
    answeredQuestions: Math.max(0, Math.round(answeredQuestions)),
    strengths: [],
    areasForImprovement: INCOMPLETE_IMPROVEMENTS,
    summary: INCOMPLETE_SUMMARY,
    questionEvaluations: [],
  };
}

