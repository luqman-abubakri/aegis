import { NextResponse } from "next/server";
import {
  evaluateAnswer,
  generateFinalFeedback,
  generateInterviewQuestion,
} from "@/lib/grok";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";
import { buildIncompleteFeedback } from "@/lib/incompleteFeedback";
import type {
  AnswerEvaluation,
  Difficulty,
  InterviewFeedback,
  InterviewType,
} from "@/types";

export const runtime = "nodejs";

type RequestBody = Record<string, unknown>;
type InterviewAction = "question" | "evaluate" | "feedback" | "save" | "save-answer";

const interviewTypes: InterviewType[] = [
  "technical",
  "behavioral",
  "system-design",
];
const difficulties: Difficulty[] = ["beginner", "intermediate", "advanced"];

function isRecord(value: unknown): value is RequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isInterviewType(value: string): value is InterviewType {
  return interviewTypes.includes(value as InterviewType);
}

function isDifficulty(value: string): value is Difficulty {
  return difficulties.includes(value as Difficulty);
}

function getInterviewConfig(body: RequestBody):
  | { role: string; interviewType: InterviewType; difficulty: Difficulty }
  | { error: string } {
  const role = getString(body.role);
  const interviewType = getString(body.interviewType);
  const difficulty = getString(body.difficulty);

  if (!role || !interviewType || !difficulty) {
    return {
      error: "Missing required fields: role, interviewType, difficulty",
    };
  }

  if (!isInterviewType(interviewType) || !isDifficulty(difficulty)) {
    return { error: "Invalid interviewType or difficulty" };
  }

  return { role, interviewType, difficulty };
}

function parsePreviousQuestions(
  value: unknown
): { question: string; answer?: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const question = getString(item.question);
    if (!question) {
      return [];
    }

    const answer = getString(item.answer);
    return [{ question, ...(answer ? { answer } : {}) }];
  });
}

function parseEvaluation(value: unknown): AnswerEvaluation | null {
  if (!isRecord(value)) {
    return null;
  }

  const questionId = getString(value.questionId);
  const question = getString(value.question);
  const answer = getString(value.answer);
  const score = typeof value.score === "number" ? value.score : Number(value.score);

  if (!questionId || !question || !answer || !Number.isFinite(score)) {
    return null;
  }

const modelAnswer = getString(value.modelAnswer);
  const coachingMessage = getString(value.coachingMessage);

  return {
    questionId,
    question,
    answer,
    score: Math.max(0, Math.min(100, Math.round(score))),
    strengths: getStringArray(value.strengths),
    weaknesses: getStringArray(value.weaknesses),
    improvementSuggestions: getStringArray(value.improvementSuggestions),
    ...(coachingMessage ? { coachingMessage } : {}),
    ...(typeof value.followUp === "boolean" ? { followUp: value.followUp } : {}),
    ...(modelAnswer ? { modelAnswer } : {}),
  };
}

function parseEvaluations(value: unknown): AnswerEvaluation[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const evaluations = value.map(parseEvaluation);
  return evaluations.every((evaluation) => evaluation !== null)
    ? (evaluations as AnswerEvaluation[])
    : null;
}

function parseFeedback(
  value: unknown,
  evaluations: AnswerEvaluation[]
): InterviewFeedback | null {
  if (!isRecord(value)) {
    return null;
  }

  const overallScore =
    typeof value.overallScore === "number"
      ? value.overallScore
      : Number(value.overallScore);
  const summary = getString(value.summary);

  if (!Number.isFinite(overallScore) || !summary) {
    return null;
  }

  return {
    overallScore: Math.max(0, Math.min(100, Math.round(overallScore))),
    totalQuestions:
      typeof value.totalQuestions === "number"
        ? value.totalQuestions
        : evaluations.length,
    answeredQuestions:
      typeof value.answeredQuestions === "number"
        ? value.answeredQuestions
        : evaluations.length,
    strengths: getStringArray(value.strengths),
    areasForImprovement: getStringArray(value.areasForImprovement),
    summary,
    questionEvaluations: evaluations,
  };
}

function getDurationSeconds(value: unknown): number {
  const duration = typeof value === "number" ? value : Number(value);
  return Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0;
}

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function handleQuestion(body: RequestBody) {
  const config = getInterviewConfig(body);
  if ("error" in config) {
    return jsonError(config.error, 400);
  }

  try {
    const question = await generateInterviewQuestion(
      config.role,
      config.interviewType,
      config.difficulty,
      parsePreviousQuestions(body.previousQuestions)
    );

    return NextResponse.json({ question });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to generate question");
    console.error("Question generation failed:", message);
    return jsonError(message, 500);
  }
}

async function handleEvaluate(body: RequestBody) {
  const config = getInterviewConfig(body);
  const question = getString(body.question);
  const answer = getString(body.answer);

  if ("error" in config) {
    return jsonError(config.error, 400);
  }

  if (!question || !answer) {
    return jsonError("Missing required fields: question, answer", 400);
  }

  try {
    const evaluation = await evaluateAnswer({
      question,
      answer,
      ...config,
      ...(getString(body.context) ? { context: getString(body.context)! } : {}),
    });

    return NextResponse.json(evaluation);
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to evaluate answer");
    console.error("Answer evaluation failed:", message);
    return jsonError(message, 500);
  }
}

function getPositiveInt(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

async function handleFeedback(body: RequestBody) {
  const config = getInterviewConfig(body);
  const evaluations = parseEvaluations(body.evaluations);

  if ("error" in config) {
    return jsonError(config.error, 400);
  }

  if (!evaluations) {
    return jsonError("The evaluations payload must be an array", 400);
  }

  const answeredQuestions = evaluations.length;
  const totalQuestionsRaw = getPositiveInt(body.totalQuestions);
  const totalQuestions =
    totalQuestionsRaw > 0 ? totalQuestionsRaw : answeredQuestions;

  // Server guard: even if a malicious client bypasses the frontend, a
  // completely unattempted interview must NEVER reach the AI. Return the
  // deterministic feedback immediately — no Groq call, no fabricated data.
  if (answeredQuestions === 0 || evaluations.length === 0) {
    return NextResponse.json(
      buildIncompleteFeedback(totalQuestions, answeredQuestions)
    );
  }

  try {
    const feedback = await generateFinalFeedback({
      ...config,
      evaluations,
      totalQuestions,
      answeredQuestions,
    });
    return NextResponse.json(feedback);
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to generate feedback");
    console.error("Final feedback generation failed:", message);
    return jsonError(message, 500);
  }
}

async function handleSave(request: Request, body: RequestBody) {
  const config = getInterviewConfig(body);
  const evaluations = parseEvaluations(body.answers);

  if ("error" in config) {
    return jsonError(config.error, 400);
  }

  if (!evaluations) {
    return jsonError("The answers payload must be an array", 400);
  }

  const feedback = parseFeedback(body.feedback, evaluations);
  if (!feedback) {
    return jsonError("A complete interview feedback payload is required", 400);
  }

  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return jsonError("You must be signed in to save an interview", 401);
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    console.error("[handleSave] Auth failed:", {
      userError: userError?.message ?? null,
    });
    return jsonError("Your session has expired. Please sign in again.", 401);
  }

  console.log("[handleSave] Save request received:", {
    userId: user.id,
    role: config.role,
    interviewType: config.interviewType,
    difficulty: config.difficulty,
    overallScore: feedback.overallScore,
    answerCount: evaluations.length,
    durationSeconds: getDurationSeconds(body.durationSeconds),
  });

  const completedAt = new Date().toISOString();
  const durationSeconds = getDurationSeconds(body.durationSeconds);

  // Parse startedAt from the payload (ISO string from client) or fall back to now
  const startedAtRaw =
    typeof body.startedAt === "string" ? body.startedAt : null;
  const startedAt = startedAtRaw
    ? new Date(startedAtRaw).toISOString()
    : completedAt;

  const answeredQuestions = evaluations.length;
  const totalQuestionsRaw = getPositiveInt(body.totalQuestions);
  const totalQuestions =
    totalQuestionsRaw > 0 ? totalQuestionsRaw : feedback.totalQuestions;
  // The save action represents the explicit end of an interview session
  // (End Interview button, timer expiry, or reaching the last question).
  // A user-initiated finish always counts as "completed" — even if some
  // questions were skipped — so the dashboard (which aggregates only
  // completed interviews) updates correctly. Only a completely unattempted
  // interview (zero answers) is marked "incomplete" and excluded from the
  // dashboard, preserving the empty-interview scoring guard.
  const status =
    answeredQuestions === 0 && totalQuestions > 0
      ? "incomplete"
      : "completed";

  const existingInterviewId = getString(body.interviewId);

  let interview: { id: string } | null = null;

  if (existingInterviewId) {
    // Update the existing interview row (created incrementally via save-answer).
    const updatePayload = {
      status,
      score: feedback.overallScore,
      feedback,
      duration_seconds: durationSeconds,
      completed_at: completedAt,
    };

    console.log("[handleSave] Updating existing interview row:", {
      table: "interviews",
      interviewId: existingInterviewId,
      payload: updatePayload,
    });

    const { data: updated, error: updateError } = await supabase
      .from("interviews")
      .update(updatePayload)
      .eq("id", existingInterviewId)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (updateError) {
      console.error("[handleSave] Interview UPDATE failed:", {
        userId: user.id,
        interviewId: existingInterviewId,
        error: updateError.message,
        code: updateError.code,
      });
      return jsonError(
        `Failed to update interview: ${updateError.message}`,
        500
      );
    }

    interview = updated;
  } else {
    const insertPayload = {
      user_id: user.id,
      role: config.role,
      difficulty: config.difficulty,
      interview_type: config.interviewType,
      status,
      score: feedback.overallScore,
      feedback,
      duration_seconds: durationSeconds,
      started_at: startedAt,
      completed_at: completedAt,
    };

    console.log("[handleSave] Inserting interview row:", {
      table: "interviews",
      payload: insertPayload,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("interviews")
      .insert(insertPayload)
      .select("id")
      .single();

    console.log("[handleSave] Interview insert response:", {
      data: inserted,
      error: insertError
        ? { message: insertError.message, code: insertError.code, details: insertError.details }
        : null,
    });

    if (insertError) {
      console.error("[handleSave] Interview INSERT failed:", {
        userId: user.id,
        error: insertError.message,
        code: insertError.code,
      });
      return jsonError(
        `Failed to save interview: ${insertError.message}`,
        500
      );
    }

    interview = inserted;
  }

  if (!interview) {
    return jsonError("Failed to resolve the interview row", 500);
  }

  const questionScores = evaluations.reduce(
    (total, evaluation) => total + evaluation.score,
    0
  );
  const averageQuestionScore =
    evaluations.length > 0
      ? Math.round(questionScores / evaluations.length)
      : feedback.overallScore;

  const feedbackPayload = {
    interview_id: interview.id,
    user_id: user.id,
    overall_score: feedback.overallScore,
    technical_score: averageQuestionScore,
    communication_score: averageQuestionScore,
    strengths: feedback.strengths,
    improvements: feedback.areasForImprovement,
    summary: feedback.summary,
  };

  console.log("[handleSave] Inserting feedback row:", {
    table: "feedback",
    payload: feedbackPayload,
  });

  const { data: feedbackData, error: feedbackError } = await supabase
    .from("feedback")
    .insert(feedbackPayload)
    .select("id")
    .single();

  console.log("[handleSave] Feedback insert response:", {
    data: feedbackData,
    error: feedbackError
      ? { message: feedbackError.message, code: feedbackError.code, details: feedbackError.details }
      : null,
  });

  if (feedbackError) {
    console.error("[handleSave] Feedback INSERT failed:", {
      userId: user.id,
      interviewId: interview.id,
      error: feedbackError.message,
      code: feedbackError.code,
    });
    // Do NOT swallow this error. The feedback write failed, so the save
    // is incomplete. Return an error so the client knows it was not saved.
    return jsonError(
      `Failed to save feedback: ${feedbackError.message}`,
      500
    );
  }

  console.log("[handleSave] Save completed successfully:", {
    userId: user.id,
    interviewId: interview.id,
    feedbackId: feedbackData?.id,
  });

  return NextResponse.json({ success: true, interview });
}

async function handleSaveAnswer(request: Request, body: RequestBody) {
  const config = getInterviewConfig(body);
  const evaluations = parseEvaluations(body.answers);

  if ("error" in config) {
    return jsonError(config.error, 400);
  }

  if (!evaluations || evaluations.length === 0) {
    return jsonError(
      "The answers payload must be a non-empty array of evaluations",
      400
    );
  }

  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return jsonError("You must be signed in to save an interview", 401);
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    console.error("[handleSaveAnswer] Auth failed:", {
      userError: userError?.message ?? null,
    });
    return jsonError("Your session has expired. Please sign in again.", 401);
  }

  const startedAtRaw =
    typeof body.startedAt === "string" ? body.startedAt : null;
  const startedAt = startedAtRaw
    ? new Date(startedAtRaw).toISOString()
    : new Date().toISOString();
  const durationSeconds = getDurationSeconds(body.durationSeconds);
  const totalQuestionsRaw = getPositiveInt(body.totalQuestions);
  const totalQuestions = totalQuestionsRaw > 0 ? totalQuestionsRaw : evaluations.length;
  const runningScore = Math.round(
    evaluations.reduce((total, evaluation) => total + evaluation.score, 0) /
      evaluations.length
  );

  // Build a progressively-updated feedback blob so progress is never lost.
  const partialFeedback = {
    overallScore: runningScore,
    totalQuestions,
    answeredQuestions: evaluations.length,
    strengths: evaluations.flatMap((evaluation) => evaluation.strengths),
    areasForImprovement: evaluations.flatMap(
      (evaluation) => evaluation.improvementSuggestions
    ),
    summary: `Interview in progress — ${evaluations.length} of ${totalQuestions} questions answered so far.`,
    questionEvaluations: evaluations,
  };

  const existingInterviewId = getString(body.interviewId);

  let interview: { id: string } | null = null;

  if (existingInterviewId) {
    const updatePayload = {
      status: "in_progress",
      score: runningScore,
      feedback: partialFeedback,
      duration_seconds: durationSeconds,
    };

    const { data: updated, error: updateError } = await supabase
      .from("interviews")
      .update(updatePayload)
      .eq("id", existingInterviewId)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (updateError) {
      console.error("[handleSaveAnswer] Interview UPDATE failed:", {
        userId: user.id,
        interviewId: existingInterviewId,
        error: updateError.message,
        code: updateError.code,
      });
      return jsonError(
        `Failed to update interview progress: ${updateError.message}`,
        500
      );
    }

    interview = updated;
  } else {
    const insertPayload = {
      user_id: user.id,
      role: config.role,
      difficulty: config.difficulty,
      interview_type: config.interviewType,
      status: "in_progress",
      score: runningScore,
      feedback: partialFeedback,
      duration_seconds: durationSeconds,
      started_at: startedAt,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("interviews")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      console.error("[handleSaveAnswer] Interview INSERT failed:", {
        userId: user.id,
        error: insertError.message,
        code: insertError.code,
      });
      return jsonError(
        `Failed to save interview: ${insertError.message}`,
        500
      );
    }

    interview = inserted;
  }

  if (!interview) {
    return jsonError("Failed to resolve the interview row", 500);
  }

  return NextResponse.json({ success: true, interview });
}

async function parseRequestBody(request: Request): Promise<RequestBody | null> {
  try {
    const body: unknown = await request.json();
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

function isInterviewAction(value: string | null): value is InterviewAction {
  return (
    value === "question" ||
    value === "evaluate" ||
    value === "feedback" ||
    value === "save" ||
    value === "save-answer"
  );
}

export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  if (!body) {
    return jsonError("Request body must be a JSON object", 400);
  }

  const actionFromBody = getString(body.action);
  const action = actionFromBody ?? new URL(request.url).searchParams.get("action");

  if (!isInterviewAction(action)) {
    return jsonError(
      "Invalid action. Supported actions: question, evaluate, feedback, save, or save-answer",
      400
    );
  }

  switch (action) {
    case "question":
      return handleQuestion(body);
    case "evaluate":
      return handleEvaluate(body);
    case "feedback":
      return handleFeedback(body);
    case "save":
      return handleSave(request, body);
    case "save-answer":
      return handleSaveAnswer(request, body);
  }
}
