import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import {
  evaluateAnswer,
  generateFinalFeedback,
  generateInterviewQuestion,
} from "@/lib/grok";

import { dbConnect } from "@/lib/dbConnect";

import User from "@/lib/models/User";
import Interview from "@/lib/models/Interview";
import Feedback from "@/lib/models/Feedback";

import { buildIncompleteFeedback } from "@/lib/incompleteFeedback";

import type {
  AnswerEvaluation,
  Difficulty,
  InterviewFeedback,
  InterviewType,
} from "@/types";

export const runtime = "nodejs";

type RequestBody = Record<string, unknown>;

type InterviewAction =
  | "question"
  | "evaluate"
  | "feedback"
  | "save"
  | "save-answer";

const interviewTypes: InterviewType[] = [
  "technical",
  "behavioral",
  "system-design",
];

const difficulties: Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const JWT_SECRET =
  process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "Missing environment variable: JWT_SECRET"
  );
}

const jwtSecret =
  new TextEncoder().encode(
    JWT_SECRET
  );

/*
 * ========================================
 * HELPERS
 * ========================================
 */

function isRecord(
  value: unknown
): value is RequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function getStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item === "string"
  );
}

function isInterviewType(
  value: string
): value is InterviewType {
  return interviewTypes.includes(
    value as InterviewType
  );
}

function isDifficulty(
  value: string
): value is Difficulty {
  return difficulties.includes(
    value as Difficulty
  );
}

function getInterviewConfig(
  body: RequestBody
):
  | {
      role: string;
      interviewType: InterviewType;
      difficulty: Difficulty;
    }
  | {
      error: string;
    } {
  const role =
    getString(body.role);

  const interviewType =
    getString(
      body.interviewType
    );

  const difficulty =
    getString(
      body.difficulty
    );

  if (
    !role ||
    !interviewType ||
    !difficulty
  ) {
    return {
      error:
        "Missing required fields: role, interviewType, difficulty",
    };
  }

  if (
    !isInterviewType(
      interviewType
    ) ||
    !isDifficulty(
      difficulty
    )
  ) {
    return {
      error:
        "Invalid interviewType or difficulty",
    };
  }

  return {
    role,
    interviewType,
    difficulty,
  };
}

function parsePreviousQuestions(
  value: unknown
): {
  question: string;
  answer?: string;
}[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (item) => {
      if (!isRecord(item)) {
        return [];
      }

      const question =
        getString(
          item.question
        );

      if (!question) {
        return [];
      }

      const answer =
        getString(item.answer);

      return [
        {
          question,
          ...(answer
            ? { answer }
            : {}),
        },
      ];
    }
  );
}

function parseEvaluation(
  value: unknown
): AnswerEvaluation | null {
  if (!isRecord(value)) {
    return null;
  }

  const questionId =
    getString(
      value.questionId
    );

  const question =
    getString(value.question);

  const answer =
    getString(value.answer);

  const score =
    typeof value.score ===
    "number"
      ? value.score
      : Number(value.score);

  if (
    !questionId ||
    !question ||
    !answer ||
    !Number.isFinite(score)
  ) {
    return null;
  }

  const modelAnswer =
    getString(
      value.modelAnswer
    );

  const coachingMessage =
    getString(
      value.coachingMessage
    );

  return {
    questionId,
    question,
    answer,

    score: Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    ),

    strengths:
      getStringArray(
        value.strengths
      ),

    weaknesses:
      getStringArray(
        value.weaknesses
      ),

    improvementSuggestions:
      getStringArray(
        value.improvementSuggestions
      ),

    ...(coachingMessage
      ? { coachingMessage }
      : {}),

    ...(typeof value.followUp ===
    "boolean"
      ? {
          followUp:
            value.followUp,
        }
      : {}),

    ...(modelAnswer
      ? { modelAnswer }
      : {}),
  };
}

function parseEvaluations(
  value: unknown
): AnswerEvaluation[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const evaluations =
    value.map(
      parseEvaluation
    );

  return evaluations.every(
    (evaluation) =>
      evaluation !== null
  )
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
    typeof value.overallScore ===
    "number"
      ? value.overallScore
      : Number(
          value.overallScore
        );

  const summary =
    getString(
      value.summary
    );

  if (
    !Number.isFinite(
      overallScore
    ) ||
    !summary
  ) {
    return null;
  }

  return {
    overallScore:
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            overallScore
          )
        )
      ),

    totalQuestions:
      typeof value.totalQuestions ===
      "number"
        ? value.totalQuestions
        : evaluations.length,

    answeredQuestions:
      typeof value.answeredQuestions ===
      "number"
        ? value.answeredQuestions
        : evaluations.length,

    strengths:
      getStringArray(
        value.strengths
      ),

    areasForImprovement:
      getStringArray(
        value.areasForImprovement
      ),

    summary,

    questionEvaluations:
      evaluations,
  };
}

function getDurationSeconds(
  value: unknown
): number {
  const duration =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    duration
  )
    ? Math.max(
        0,
        Math.round(duration)
      )
    : 0;
}

function getPositiveInt(
  value: unknown
): number {
  const parsed =
    typeof value ===
    "number"
      ? value
      : Number(value);

  return Number.isFinite(
    parsed
  )
    ? Math.max(
        0,
        Math.round(parsed)
      )
    : 0;
}

/*
 * ========================================
 * JWT AUTHENTICATION
 * ========================================
 *
 * The session is stored in:
 *
 * aegis_session
 *
 */
async function getAuthenticatedUserId(): Promise<
  string | null
> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "aegis_session"
    )?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } =
      await jwtVerify(
        token,
        jwtSecret
      );

    if (
      typeof payload.userId !==
      "string"
    ) {
      return null;
    }

    return payload.userId;
  } catch (error) {
    console.error(
      "[Interview API] JWT verification failed:",
      error
    );

    return null;
  }
}

/*
 * ========================================
 * ERROR HELPERS
 * ========================================
 */

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

function jsonError(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
    }
  );
}

/*
 * ========================================
 * QUESTION
 * ========================================
 */

async function handleQuestion(
  body: RequestBody
) {
  const config =
    getInterviewConfig(body);

  if ("error" in config) {
    return jsonError(
      config.error,
      400
    );
  }

  try {
    const question =
      await generateInterviewQuestion(
        config.role,
        config.interviewType,
        config.difficulty,
        parsePreviousQuestions(
          body.previousQuestions
        )
      );

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (
    error: unknown
  ) {
    const message =
      getErrorMessage(
        error,
        "Failed to generate question"
      );

    console.error(
      "[Interview API] Question generation failed:",
      message
    );

    return jsonError(
      message,
      500
    );
  }
}

/*
 * ========================================
 * EVALUATE ANSWER
 * ========================================
 */

async function handleEvaluate(
  body: RequestBody
) {
  const config =
    getInterviewConfig(body);

  const question =
    getString(
      body.question
    );

  const answer =
    getString(body.answer);

  if ("error" in config) {
    return jsonError(
      config.error,
      400
    );
  }

  if (!question || !answer) {
    return jsonError(
      "Missing required fields: question, answer",
      400
    );
  }

  try {
    const evaluation =
      await evaluateAnswer({
        question,
        answer,
        ...config,
      });

    return NextResponse.json(
      evaluation
    );
  } catch (
    error: unknown
  ) {
    const message =
      getErrorMessage(
        error,
        "Failed to evaluate answer"
      );

    console.error(
      "[Interview API] Answer evaluation failed:",
      message
    );

    return jsonError(
      message,
      500
    );
  }
}

/*
 * ========================================
 * FINAL FEEDBACK
 * ========================================
 */

async function handleFeedback(
  body: RequestBody
) {
  const config =
    getInterviewConfig(body);

  const evaluations =
    parseEvaluations(
      body.evaluations
    );

  if ("error" in config) {
    return jsonError(
      config.error,
      400
    );
  }

  if (!evaluations) {
    return jsonError(
      "The evaluations payload must be an array",
      400
    );
  }

  const answeredQuestions =
    evaluations.length;

  const totalQuestionsRaw =
    getPositiveInt(
      body.totalQuestions
    );

  const totalQuestions =
    totalQuestionsRaw > 0
      ? totalQuestionsRaw
      : answeredQuestions;

  /*
   * Completely unanswered interview.
   */
  if (
    answeredQuestions ===
      0 ||
    evaluations.length === 0
  ) {
    return NextResponse.json(
      buildIncompleteFeedback(
        totalQuestions,
        answeredQuestions
      )
    );
  }

  try {
    const feedback =
      await generateFinalFeedback(
        {
          ...config,

          evaluations,

          totalQuestions,

          answeredQuestions,
        }
      );

    return NextResponse.json(
      feedback
    );
  } catch (
    error: unknown
  ) {
    const message =
      getErrorMessage(
        error,
        "Failed to generate feedback"
      );

    console.error(
      "[Interview API] Final feedback generation failed:",
      message
    );

    return jsonError(
      message,
      500
    );
  }
}

/*
 * ========================================
 * SAVE COMPLETE INTERVIEW
 * ========================================
 */

async function handleSave(
  body: RequestBody
) {
  /*
   * 1. Authenticate through JWT.
   */
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    return jsonError(
      "Your session has expired. Please sign in again.",
      401
    );
  }

  /*
   * 2. Validate configuration.
   */
  const config =
    getInterviewConfig(body);

  if ("error" in config) {
    return jsonError(
      config.error,
      400
    );
  }

  /*
   * 3. Validate answers.
   */
  const evaluations =
    parseEvaluations(
      body.answers
    );

  if (!evaluations) {
    return jsonError(
      "The answers payload must be an array",
      400
    );
  }

  /*
   * 4. Validate feedback.
   */
  const feedback =
    parseFeedback(
      body.feedback,
      evaluations
    );

  if (!feedback) {
    return jsonError(
      "A complete interview feedback payload is required",
      400
    );
  }

  /*
   * 5. Connect MongoDB.
   */
  await dbConnect();

  /*
   * Make sure the authenticated user
   * still exists.
   */
  const user =
    await User.findById(
      userId
    ).select("_id");

  if (!user) {
    return jsonError(
      "User not found.",
      404
    );
  }

  const durationSeconds =
    getDurationSeconds(
      body.durationSeconds
    );

  const completedAt =
    new Date();

  const startedAtRaw =
    typeof body.startedAt ===
    "string"
      ? body.startedAt
      : null;

  const parsedStartedAt =
    startedAtRaw
      ? new Date(
          startedAtRaw
        )
      : completedAt;

  const startedAt =
    Number.isNaN(
      parsedStartedAt.getTime()
    )
      ? completedAt
      : parsedStartedAt;

  const answeredQuestions =
    evaluations.length;

  const totalQuestionsRaw =
    getPositiveInt(
      body.totalQuestions
    );

  const totalQuestions =
    totalQuestionsRaw > 0
      ? totalQuestionsRaw
      : feedback.totalQuestions;

  const status =
    answeredQuestions === 0 &&
    totalQuestions > 0
      ? "incomplete"
      : "completed";

  const existingInterviewId =
    getString(
      body.interviewId
    );

  let interview:
    | any
    | null = null;

  /*
   * ======================================
   * UPDATE EXISTING INTERVIEW
   * ======================================
   */

  if (existingInterviewId) {
    console.log(
      "[handleSave] Updating existing MongoDB interview:",
      existingInterviewId
    );

    interview =
      await Interview.findOneAndUpdate(
        {
          _id:
            existingInterviewId,

          userId:
            userId,
        },
        {
          $set: {
            status,

            score:
              feedback.overallScore,

            feedback,

            durationSeconds,

            completedAt,
          },
        },
        {
          new: true,

          runValidators:
            true,
        }
      );
  }

  /*
   * ======================================
   * CREATE NEW INTERVIEW
   * ======================================
   */

  if (!interview) {
    console.log(
      "[handleSave] Creating MongoDB interview"
    );

    interview =
      await Interview.create({
        userId,

        role:
          config.role,

        difficulty:
          config.difficulty,

        interviewType:
          config.interviewType,

        status,

        score:
          feedback.overallScore,

        // feedback,

        durationSeconds,

        startedAt,

        completedAt,
      });
  }

  if (!interview) {
    return jsonError(
      "Failed to save interview.",
      500
    );
  }

  /*
   * ======================================
   * FEEDBACK
   * ======================================
   */

  const questionScores =
    evaluations.reduce(
      (
        total,
        evaluation
      ) =>
        total +
        evaluation.score,
      0
    );

  const averageQuestionScore =
    evaluations.length > 0
      ? Math.round(
          questionScores /
            evaluations.length
        )
      : feedback.overallScore;

  const feedbackData =
    {
      interviewId:
        interview._id,

      userId,

      overallScore:
        feedback.overallScore,

      technicalScore:
        averageQuestionScore,

      communicationScore:
        averageQuestionScore,

      strengths:
        feedback.strengths,

      improvements:
        feedback.areasForImprovement,

      summary:
        feedback.summary,
    };

  /*
   * Update existing feedback or
   * create a new one.
   */
  await Feedback.findOneAndUpdate(
    {
      interviewId:
        interview._id,

      userId,
    },
    {
      $set:
        feedbackData,
    },
    {
      new: true,

      upsert: true,

      runValidators:
        true,

      setDefaultsOnInsert:
        true,
    }
  );

  console.log(
    "[handleSave] Interview and feedback saved successfully:",
    {
      userId,

      interviewId:
        interview._id.toString(),
    }
  );

  return NextResponse.json({
    success: true,

    interview: {
      id: interview._id.toString(),
    },
  });
}

/*
 * ========================================
 * SAVE ANSWER / INTERVIEW PROGRESS
 * ========================================
 */

async function handleSaveAnswer(
  body: RequestBody
) {
  /*
   * Authenticate through JWT.
   */
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    return jsonError(
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const config =
    getInterviewConfig(body);

  if ("error" in config) {
    return jsonError(
      config.error,
      400
    );
  }

  const evaluations =
    parseEvaluations(
      body.answers
    );

  if (
    !evaluations ||
    evaluations.length ===
      0
  ) {
    return jsonError(
      "The answers payload must be a non-empty array of evaluations",
      400
    );
  }

  await dbConnect();

  /*
   * Calculate running score.
   */
  const runningScore =
    Math.round(
      evaluations.reduce(
        (
          total,
          evaluation
        ) =>
          total +
          evaluation.score,
        0
      ) /
        evaluations.length
    );

  const totalQuestionsRaw =
    getPositiveInt(
      body.totalQuestions
    );

  const totalQuestions =
    totalQuestionsRaw > 0
      ? totalQuestionsRaw
      : evaluations.length;

  const partialFeedback =
    {
      overallScore:
        runningScore,

      totalQuestions,

      answeredQuestions:
        evaluations.length,

      strengths:
        evaluations.flatMap(
          (evaluation) =>
            evaluation.strengths
        ),

      areasForImprovement:
        evaluations.flatMap(
          (evaluation) =>
            evaluation.improvementSuggestions
        ),

      summary:
        `Interview in progress — ${evaluations.length} of ${totalQuestions} questions answered so far.`,

      questionEvaluations:
        evaluations,
    };

  const durationSeconds =
    getDurationSeconds(
      body.durationSeconds
    );

  const startedAtRaw =
    typeof body.startedAt ===
    "string"
      ? body.startedAt
      : null;

  const parsedStartedAt =
    startedAtRaw
      ? new Date(
          startedAtRaw
        )
      : new Date();

  const startedAt =
    Number.isNaN(
      parsedStartedAt.getTime()
    )
      ? new Date()
      : parsedStartedAt;

  const existingInterviewId =
    getString(
      body.interviewId
    );

  let interview:
    | any
    | null = null;

  /*
   * ======================================
   * UPDATE EXISTING
   * ======================================
   */

  if (existingInterviewId) {
    interview =
      await Interview.findOneAndUpdate(
        {
          _id:
            existingInterviewId,

          userId,
        },
        {
          $set: {
            status:
              "in_progress",

            score:
              runningScore,

            feedback:
              partialFeedback,

            durationSeconds,
          },
        },
        {
          new: true,

          runValidators:
            true,
        }
      );
  }

  /*
   * ======================================
   * CREATE NEW
   * ======================================
   */

  if (!interview) {
    interview =
      await Interview.create({
        userId,

        role:
          config.role,

        difficulty:
          config.difficulty,

        interviewType:
          config.interviewType,

        status:
          "in_progress",

        score:
          runningScore,

        feedback:
          partialFeedback,

        durationSeconds,

        startedAt,
      });
  }

  if (!interview) {
    return jsonError(
      "Failed to save interview progress.",
      500
    );
  }

  console.log(
    "[handleSaveAnswer] Progress saved:",
    {
      userId,

      interviewId:
        interview._id.toString(),

      answerCount:
        evaluations.length,

      runningScore,
    }
  );

  return NextResponse.json({
    success: true,

    interview: {
      id: interview._id.toString(),
    },
  });
}

/*
 * ========================================
 * REQUEST BODY
 * ========================================
 */

async function parseRequestBody(
  request: Request
): Promise<RequestBody | null> {
  try {
    const body: unknown =
      await request.json();

    return isRecord(body)
      ? body
      : null;
  } catch {
    return null;
  }
}

/*
 * ========================================
 * ACTION VALIDATION
 * ========================================
 */

function isInterviewAction(
  value: string | null
): value is InterviewAction {
  return (
    value === "question" ||
    value === "evaluate" ||
    value === "feedback" ||
    value === "save" ||
    value === "save-answer"
  );
}

/*
 * ========================================
 * POST
 * ========================================
 */

export async function POST(
  request: Request
) {
  const body =
    await parseRequestBody(
      request
    );

  if (!body) {
    return jsonError(
      "Request body must be a JSON object",
      400
    );
  }

  const actionFromBody =
    getString(
      body.action
    );

  const action =
    actionFromBody ??
    new URL(request.url)
      .searchParams
      .get("action");

  if (
    !isInterviewAction(
      action
    )
  ) {
    return jsonError(
      "Invalid action. Supported actions: question, evaluate, feedback, save, or save-answer",
      400
    );
  }

  switch (action) {
    case "question":
      return handleQuestion(
        body
      );

    case "evaluate":
      return handleEvaluate(
        body
      );

    case "feedback":
      return handleFeedback(
        body
      );

    case "save":
      return handleSave(
        body
      );

    case "save-answer":
      return handleSaveAnswer(
        body
      );
  }
}