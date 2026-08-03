"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  AnswerEvaluation,
  InterviewConfig,
  InterviewFeedback,
  InterviewQuestion,
  InterviewState,
} from "@/types";

const API_BASE = "/api/interview";

const initialInterviewState: InterviewState = {
  config: null,
  status: "idle",
  currentQuestion: null,
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
      answers: AnswerEvaluation[]
    ): Promise<InterviewQuestion> => {
      const previousQuestions = questions.map((question) => ({
        question: question.question,
        answer: answers.find((answer) => answer.questionId === question.id)?.answer,
      }));
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
        questions: [...previous.questions, question],
      }));

      return question;
    },
    []
  );

  const startInterview = useCallback(
    async (config: InterviewConfig): Promise<InterviewQuestion | null> => {
      if (loading) {
        return null;
      }

      setError(null);
      setStartedAt(Date.now());
      setState({
        ...initialInterviewState,
        config,
        status: "in-progress",
      });
      setLoading(true);

      try {
        return await requestQuestion(config, [], []);
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
      answersOverride?: AnswerEvaluation[]
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
          answersOverride ?? state.answers
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
    if (!state.config || state.answers.length === 0 || loading) {
      return null;
    }

    setError(null);
    setLoading(true);

    try {
      const feedback = await postInterviewApi<InterviewFeedback>({
        action: "feedback",
        role: state.config.role,
        interviewType: state.config.interviewType,
        difficulty: state.config.difficulty,
        evaluations: state.answers,
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
  }, [loading, state.answers, state.config]);

  const saveInterview = useCallback(async (): Promise<boolean> => {
    if (!state.config || !state.feedback) {
      return false;
    }

    setError(null);
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      await postInterviewApi<{ success: boolean }>(
        {
          action: "save",
          role: state.config.role,
          interviewType: state.config.interviewType,
          difficulty: state.config.difficulty,
          answers: state.answers,
          score: state.feedback.overallScore,
          feedback: state.feedback,
          durationSeconds: state.duration,
        },
        session.access_token
      );

      return true;
    } catch (requestError: unknown) {
      const message = getErrorMessage(
        requestError,
        "Failed to save this interview."
      );
      console.error("Interview save request failed:", message);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [state.answers, state.config, state.duration, state.feedback]);

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

  return {
    state,
    startInterview,
    fetchQuestion,
    submitAnswer,
    generateFeedback,
    saveInterview,
    endInterview,
    resetInterview,
    addToTranscript,
    loading,
    error,
  };
}
