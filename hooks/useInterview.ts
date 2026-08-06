"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildIncompleteFeedback } from "@/lib/incompleteFeedback";
import type {
  AnswerEvaluation,
  InterviewConfig,
  InterviewFeedback,
  InterviewQuestion,
  InterviewState,
} from "@/types";

const API_BASE = "/api/interview";

interface ResumeInterviewQuestion {
  id?: string;
  question: string;
  type?: string;
  focus?: string;
}

const initialInterviewState: InterviewState = {
  config: null,
  status: "idle",
  currentQuestion: null,
  currentQuestionIndex: 0,
  questions: [],
  answers: [],
  transcript: [],
  duration: 0,
  score: 0,
  feedback: null,
};

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getApiError(payload: unknown, response: Response): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }

  return `Request failed with status ${response.status}`;
}

async function postInterviewApi<T>(
  payload: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let responseBody: unknown = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      throw new Error(
        `The interview API returned an invalid response (HTTP ${response.status}).`
      );
    }
  }

  if (!response.ok) {
    throw new Error(getApiError(responseBody, response));
  }

  return responseBody as T;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useInterview() {
const [state, setState] = useState<InterviewState>(initialInterviewState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const resumeInterviewQuestionsRef = useRef<ResumeInterviewQuestion[]>([]);
  const resumeInterviewIndexRef = useRef(0);
  const isFinishingRef = useRef(false);
  const isAdvancingRef = useRef(false);
  const interviewIdRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  const startedAtRef = useRef(startedAt);
  const loadingRef = useRef(loading);
  const errorRef = useRef<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Keep refs in sync with latest state to avoid stale closures in async handlers.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    interviewIdRef.current = interviewId;
  }, [interviewId]);

  useEffect(() => {
    if (state.status !== "in-progress" || startedAt === null) {
      return;
    }

    const updateDuration = () => {
      setState((previous) => ({
        ...previous,
        duration: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      }));
    };

    updateDuration();
    const interval = window.setInterval(updateDuration, 1000);

    return () => window.clearInterval(interval);
  }, [startedAt, state.status]);

  const requestQuestion = useCallback(
    async (
      config: InterviewConfig,
      questions: InterviewQuestion[],
      answers: AnswerEvaluation[],
      resumeQuestions?: ResumeInterviewQuestion[]
    ): Promise<InterviewQuestion> => {
      const previousQuestions = questions.map((question) => ({
        question: question.question,
        answer: answers.find((answer) => answer.questionId === question.id)?.answer,
      }));

      if (resumeQuestions && resumeQuestions.length > 0) {
        const nextResumeQuestion = resumeQuestions[resumeInterviewIndexRef.current];
        if (!nextResumeQuestion?.question?.trim()) {
          throw new Error("The resume-based interview does not contain a valid next question.");
        }

        resumeInterviewIndexRef.current += 1;
        const question: InterviewQuestion = {
          id: nextResumeQuestion.id ?? generateId(),
          question: nextResumeQuestion.question.trim(),
          type: config.interviewType,
          difficulty: config.difficulty,
          followUp: false,
        };

setState((previous) => ({
          ...previous,
          currentQuestion: question,
          currentQuestionIndex: previous.questions.length,
          questions: [...previous.questions, question],
        }));

        return question;
      }

      const data = await postInterviewApi<{ question?: unknown }>({
        action: "question",
        role: config.role,
        interviewType: config.interviewType,
        difficulty: config.difficulty,
        previousQuestions,
      });

      if (typeof data.question !== "string" || !data.question.trim()) {
        throw new Error("The interview API did not return a valid question.");
      }

      const question: InterviewQuestion = {
        id: generateId(),
        question: data.question.trim(),
        type: config.interviewType,
        difficulty: config.difficulty,
        followUp: previousQuestions.length > 0,
      };

setState((previous) => ({
        ...previous,
        currentQuestion: question,
        currentQuestionIndex: previous.questions.length,
        questions: [...previous.questions, question],
      }));

      return question;
    },
    []
  );

  const startInterview = useCallback(
    async (
      config: InterviewConfig,
      options?: { resumeQuestions?: ResumeInterviewQuestion[] }
    ): Promise<InterviewQuestion | null> => {
      if (loading) {
        return null;
      }

      setError(null);
      setStartedAt(Date.now());
      resumeInterviewQuestionsRef.current = options?.resumeQuestions ?? [];
resumeInterviewIndexRef.current = 0;
      isFinishingRef.current = false;
      setIsFinishing(false);
      isAdvancingRef.current = false;
      setIsAdvancing(false);
      setInterviewId(null);
      interviewIdRef.current = null;
      setState({
        ...initialInterviewState,
        config,
        status: "in-progress",
      });
      setLoading(true);

      try {
        return await requestQuestion(config, [], [], options?.resumeQuestions);
      } catch (requestError: unknown) {
        const message = getErrorMessage(
          requestError,
          "Failed to fetch the first interview question."
        );
        console.error("Initial interview question failed:", message);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loading, requestQuestion]
  );

  const fetchQuestion = useCallback(
    async (
      answersOverride?: AnswerEvaluation[],
      options?: { resumeQuestions?: ResumeInterviewQuestion[] }
    ): Promise<InterviewQuestion | null> => {
      if (!state.config || loading) {
        return null;
      }

      setError(null);
      setLoading(true);

      try {
        return await requestQuestion(
          state.config,
          state.questions,
          answersOverride ?? state.answers,
          options?.resumeQuestions ?? resumeInterviewQuestionsRef.current
        );
      } catch (requestError: unknown) {
        const message = getErrorMessage(
          requestError,
          "Failed to fetch the next interview question."
        );
        console.error("Interview question request failed:", message);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loading, requestQuestion, state.answers, state.config, state.questions]
  );

  const submitAnswer = useCallback(
    async (answer: string): Promise<AnswerEvaluation | null> => {
      if (!state.currentQuestion || !state.config || loading) {
        return null;
      }

      setError(null);
      setLoading(true);

      try {
const evaluationData = await postInterviewApi<{
          score?: unknown;
          strengths?: unknown;
          weaknesses?: unknown;
          improvementSuggestions?: unknown;
          modelAnswer?: unknown;
          coachingMessage?: unknown;
          followUp?: unknown;
        }>({
          action: "evaluate",
          question: state.currentQuestion.question,
          answer,
          role: state.config.role,
          interviewType: state.config.interviewType,
          difficulty: state.config.difficulty,
        });

        const evaluation: AnswerEvaluation = {
          questionId: state.currentQuestion.id,
          question: state.currentQuestion.question,
          answer,
          score:
            typeof evaluationData.score === "number" &&
            Number.isFinite(evaluationData.score)
              ? Math.max(0, Math.min(100, Math.round(evaluationData.score)))
              : 0,
          strengths: Array.isArray(evaluationData.strengths)
            ? evaluationData.strengths.filter(
                (strength): strength is string => typeof strength === "string"
              )
            : [],
          weaknesses: Array.isArray(evaluationData.weaknesses)
            ? evaluationData.weaknesses.filter(
                (weakness): weakness is string => typeof weakness === "string"
              )
            : [],
          improvementSuggestions: Array.isArray(evaluationData.improvementSuggestions)
            ? evaluationData.improvementSuggestions.filter(
                (suggestion): suggestion is string => typeof suggestion === "string"
              )
            : [],
          modelAnswer:
            typeof evaluationData.modelAnswer === "string"
              ? evaluationData.modelAnswer
              : undefined,
          coachingMessage:
            typeof evaluationData.coachingMessage === "string"
              ? evaluationData.coachingMessage
              : undefined,
          followUp:
            typeof evaluationData.followUp === "boolean"
              ? evaluationData.followUp
              : undefined,
        };

        setState((previous) => {
          const answers = [...previous.answers, evaluation];
          const score = Math.round(
            answers.reduce((total, item) => total + item.score, 0) /
              answers.length
          );

          return {
            ...previous,
            answers,
            transcript: [
              ...previous.transcript,
              `Q: ${previous.currentQuestion?.question ?? evaluation.question}`,
              `A: ${answer}`,
            ],
            score,
          };
        });

        return evaluation;
      } catch (requestError: unknown) {
        const message = getErrorMessage(
          requestError,
          "Failed to evaluate your answer."
        );
        console.error("Interview answer request failed:", message);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
},
    [loading, state.config, state.currentQuestion]
  );

  const generateFeedback = useCallback(async (): Promise<InterviewFeedback | null> => {
    const currentState = stateRef.current;
    if (!currentState.config) {
      return null;
    }

const answeredQuestions = currentState.answers.length;
    const totalQuestions =
      currentState.config.totalQuestions > 0
        ? currentState.config.totalQuestions
        : currentState.questions.length;

    // Client guard: a completely unattempted interview must NEVER reach the
    // AI. Return deterministic feedback immediately — no /api/interview call,
    // no Groq call, no waiting.
    if (answeredQuestions === 0) {
      const feedback = buildIncompleteFeedback(
        totalQuestions,
        answeredQuestions
      );
      setState((previous) => ({
        ...previous,
        feedback,
        status: "completed",
        currentQuestion: null,
      }));
      return feedback;
    }

    setError(null);
    setLoading(true);

    try {
      const feedback = await postInterviewApi<InterviewFeedback>({
        action: "feedback",
        role: currentState.config.role,
        interviewType: currentState.config.interviewType,
        difficulty: currentState.config.difficulty,
        evaluations: currentState.answers,
        totalQuestions,
        answeredQuestions,
      });

      setState((previous) => ({
        ...previous,
        feedback,
        status: "completed",
        currentQuestion: null,
      }));

      return feedback;
    } catch (requestError: unknown) {
      const message = getErrorMessage(
        requestError,
        "Failed to generate interview feedback."
      );
      console.error("Interview feedback request failed:", message);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveInterview = useCallback(
    async (feedbackOverride?: InterviewFeedback | null): Promise<boolean> => {
      // Accept an optional feedbackOverride parameter because state.feedback
      // may not be updated yet when this is called immediately after
      // generateFeedback() — React state updates are async, so the setState
      // in generateFeedback hasn't triggered a re-render yet and the
      // state.feedback closure value is still null.
const currentState = stateRef.current;
      const currentStartedAt = startedAtRef.current;
      const feedback = feedbackOverride ?? currentState.feedback;

      if (!currentState.config || !feedback) {
        console.error("[saveInterview] Aborted: missing config or feedback", {
          hasConfig: !!currentState.config,
          hasFeedback: !!feedback,
          usedOverride: feedbackOverride !== undefined,
        });
        return false;
      }

      const totalQuestions =
        currentState.config.totalQuestions > 0
          ? currentState.config.totalQuestions
          : currentState.questions.length;

      setError(null);
      setLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("[saveInterview] Session error:", {
            sessionError: sessionError?.message ?? null,
          });
          throw new Error("Your session has expired. Please sign in again.");
        }

const savePayload = {
          action: "save",
          role: currentState.config.role,
          interviewType: currentState.config.interviewType,
          difficulty: currentState.config.difficulty,
          answers: currentState.answers,
          score: feedback.overallScore,
          feedback: feedback,
          totalQuestions,
          durationSeconds: currentState.duration,
          startedAt: currentStartedAt ? new Date(currentStartedAt).toISOString() : null,
          interviewId: interviewIdRef.current,
        };

        console.log("[saveInterview] Sending save request:", {
          userId: session.user?.id ?? null,
          role: savePayload.role,
          interviewType: savePayload.interviewType,
          difficulty: savePayload.difficulty,
          overallScore: savePayload.score,
          answerCount: savePayload.answers.length,
          durationSeconds: savePayload.durationSeconds,
          startedAt: savePayload.startedAt,
        });

        const result = await postInterviewApi<{ success: boolean; interview?: { id: string } }>(
          savePayload,
          session.access_token
        );

        console.log("[saveInterview] Save API response:", {
          success: result.success,
          interviewId: result.interview?.id ?? null,
        });

        return true;
      } catch (requestError: unknown) {
        const message = getErrorMessage(
          requestError,
          "Failed to save this interview."
        );
        console.error("[saveInterview] Save request failed:", {
          message,
          error: requestError instanceof Error ? requestError.message : String(requestError),
        });
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const finishInterview = useCallback(async (): Promise<{
    success: boolean;
    feedback: InterviewFeedback | null;
    error: string | null;
  }> => {
    if (isFinishingRef.current) {
      return {
        success: false,
        feedback: null,
        error: "Interview is already finishing.",
      };
    }

    isFinishingRef.current = true;
    setIsFinishing(true);

    try {
      const feedback = await generateFeedback();
      if (!feedback) {
        return {
          success: false,
          feedback: null,
          error:
            errorRef.current || "Failed to generate feedback. Please try again.",
        };
      }

      const success = await saveInterview(feedback);
      if (!success) {
        return {
          success: false,
          feedback,
          error:
            errorRef.current || "Failed to save interview. Please try again.",
        };
      }

      return { success: true, feedback, error: null };
    } finally {
      isFinishingRef.current = false;
      setIsFinishing(false);
    }
  }, [generateFeedback, saveInterview]);

  const resetFinishing = useCallback(() => {
    isFinishingRef.current = false;
    setIsFinishing(false);
  }, []);

  const endInterview = useCallback(() => {
    setState((previous) => ({
      ...previous,
      status: "completed",
      currentQuestion: null,
    }));
  }, []);

const resetInterview = useCallback(() => {
    setError(null);
    setLoading(false);
    setStartedAt(null);
    isFinishingRef.current = false;
    setIsFinishing(false);
    isAdvancingRef.current = false;
    setIsAdvancing(false);
    setInterviewId(null);
    interviewIdRef.current = null;
    setState(initialInterviewState);
  }, []);

  const addToTranscript = useCallback((text: string) => {
    const transcriptLine = text.trim();
    if (!transcriptLine) {
      return;
    }

    setState((previous) => ({
      ...previous,
      transcript: [...previous.transcript, transcriptLine],
    }));
  }, []);

  const saveAnswerImmediately = useCallback(
    async (): Promise<boolean> => {
      const currentState = stateRef.current;
      if (!currentState.config || currentState.answers.length === 0) {
        return false;
      }

      setError(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("[saveAnswerImmediately] Session error:", {
            sessionError: sessionError?.message ?? null,
          });
          return false;
        }

        const payload = {
          action: "save-answer",
          role: currentState.config.role,
          interviewType: currentState.config.interviewType,
          difficulty: currentState.config.difficulty,
          answers: currentState.answers,
          totalQuestions:
            currentState.config.totalQuestions > 0
              ? currentState.config.totalQuestions
              : currentState.questions.length,
          durationSeconds: currentState.duration,
          startedAt: startedAtRef.current
            ? new Date(startedAtRef.current).toISOString()
            : null,
          interviewId: interviewIdRef.current,
        };

        const result = await postInterviewApi<{
          success: boolean;
          interview?: { id: string };
        }>(payload, session.access_token);

        if (result.interview?.id && !interviewIdRef.current) {
          interviewIdRef.current = result.interview.id;
          setInterviewId(result.interview.id);
        }

        return true;
      } catch (requestError: unknown) {
        const message = getErrorMessage(
          requestError,
          "Failed to save interview progress."
        );
        console.error("[saveAnswerImmediately] Save failed:", message);
        setError(message);
        return false;
      }
    },
    []
  );

  const advanceQuestion = useCallback(
    async (): Promise<boolean> => {
      if (isAdvancingRef.current || isFinishingRef.current) {
        return false;
      }

      isAdvancingRef.current = true;
      setIsAdvancing(true);

      try {
        const currentState = stateRef.current;
        if (!currentState.config) {
          return false;
        }

        const totalQuestions =
          currentState.config.totalQuestions > 0
            ? currentState.config.totalQuestions
            : currentState.questions.length;
        const currentIndex = currentState.currentQuestionIndex;
        const isLast = currentIndex >= totalQuestions - 1;

        if (isLast) {
          await finishInterview();
          return true;
        }

        await fetchQuestion();
        return true;
      } finally {
        isAdvancingRef.current = false;
        setIsAdvancing(false);
      }
    },
    [fetchQuestion, finishInterview]
  );

  return {
    state,
    startInterview,
    fetchQuestion,
    submitAnswer,
    generateFeedback,
    saveInterview,
    finishInterview,
    resetFinishing,
    endInterview,
    resetInterview,
    addToTranscript,
    saveAnswerImmediately,
    advanceQuestion,
    loading,
    error,
    isFinishing,
    isAdvancing,
    interviewId,
  };
}
