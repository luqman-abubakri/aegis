"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useInterview } from "@/hooks/useInterview";
import { useVapi } from "@/hooks/useVapi";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { InterviewChat } from "@/components/interview/InterviewChat";
import { VoiceControls } from "@/components/interview/VoiceControls";
import { FeedbackCard } from "@/components/interview/FeedbackCard";
import { Bot, ArrowLeft, Loader2, CheckCircle, AlertTriangle, Clock3 } from "lucide-react";
import type { InterviewConfig, Difficulty } from "@/types";

const RESUME_INTERVIEW_STORAGE_KEY = "aegis_resume_interview";

const FINISH_STAGE_LABELS: Record<string, string> = {
  saving: "Saving interview...",
  feedback: "Generating feedback...",
  "saving-feedback": "Saving feedback...",
  redirecting: "Redirecting...",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020817]">
      <Loader2 size={40} className="animate-spin text-blue-400" />
    </div>
  );
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SessionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SessionContent />
    </Suspense>
  );
}

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const interview = useInterview();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [vapiErrorMsg, setVapiErrorMsg] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(20);
  const [finishStage, setFinishStage] = useState<string | null>(null);
  const [resumeQuestions, setResumeQuestions] = useState<Array<{ id?: string; question: string; type?: string; focus?: string }>>([]);
  const MAX_QUESTIONS = 5;
  const finishInterviewRef = useRef<() => Promise<boolean>>(async () => false);
  const autoFinishTriggeredRef = useRef(false);
  const isFinishingRef = useRef(false);
  const finishCompletedRef = useRef(false);
  const endTimestampRef = useRef<number | null>(null);
  const redirectTimeoutRef = useRef<number | null>(null);

  const handleTranscriptUpdate = useCallback(
    (transcript: string) => {
      interview.addToTranscript(transcript);
    },
    [interview]
  );

  const vapi = useVapi({
    onTranscriptUpdate: handleTranscriptUpdate,
    onCallEnded: () => {
      void finishInterviewRef.current();
    },
    onError: (error) => {
      console.error("Vapi call error:", error);
      setVapiErrorMsg(error.message);
    },
  });

  const roleParam = searchParams.get("role") || "";
  const difficultyParam = searchParams.get("difficulty") || "";
  const interviewTypeParam = searchParams.get("interviewType") || "";
  const modeParam = searchParams.get("mode") || "";
  const durationParam = searchParams.get("duration") || "";
  const resumeInterviewParam = searchParams.get("resumeInterview") === "1" || searchParams.get("resumeInterview") === "true";
  const hasUrlConfig = !!(roleParam && difficultyParam && interviewTypeParam);
  const voiceMode = modeParam === "voice";

  const handleFinishInterview = useCallback(async (): Promise<boolean> => {
    if (isFinishingRef.current || finishCompletedRef.current) {
      return false;
    }
    isFinishingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setFinishStage("saving");

    try {
      // Stop the voice call if in voice mode (fire-and-forget, errors swallowed).
      if (voiceMode) {
        void vapi.endCall().catch(() => undefined);
      }

      const result = await interview.finishInterview();
      if (!result.success) {
        setSaveError(result.error || "Failed to complete the interview. Please try again.");
        setFinishStage(null);
        return false;
      }

      finishCompletedRef.current = true;
      setSaved(true);
      setFinishStage("redirecting");

      // Clean up any previously scheduled redirect then schedule a new one.
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
      redirectTimeoutRef.current = window.setTimeout(() => {
        router.refresh();
        router.push("/dashboard");
      }, 1500);

      return true;
    } catch (error: unknown) {
      // Any unexpected error must not leave the flow stuck. Surface it and
      // allow the user to retry safely.
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to complete the interview. Please try again.";
      console.error("Finish interview failed:", message);
      setSaveError(message);
      setFinishStage(null);
      return false;
    } finally {
      isFinishingRef.current = false;
      setSaving(false);
      setFinishStage(null);
    }
  }, [interview, router, voiceMode, vapi]);

  useEffect(() => {
    finishInterviewRef.current = handleFinishInterview;
  }, [handleFinishInterview]);

  // Cleanup redirect timeout on unmount.
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleStartInterview = useCallback(
    async (config: InterviewConfig) => {
      const normalizedDurationMinutes = Math.max(
        5,
        Math.min(120, Number(config.durationMinutes ?? (Number(durationParam) || 20)))
      );
      setSelectedDurationMinutes(normalizedDurationMinutes);
      endTimestampRef.current = Date.now() + normalizedDurationMinutes * 60 * 1000;
      setTimeRemaining(normalizedDurationMinutes * 60);
      autoFinishTriggeredRef.current = false;
      isFinishingRef.current = false;
      finishCompletedRef.current = false;
      setQuestionCount(0);
      setSaved(false);
      setSaveError(null);
      setFinishStage(null);
await interview.startInterview(
        {
          ...config,
          durationMinutes: normalizedDurationMinutes,
          totalQuestions: MAX_QUESTIONS,
        },
        resumeInterviewParam ? { resumeQuestions } : undefined
      );
    },
    [durationParam, interview, resumeInterviewParam, resumeQuestions]
  );

  const [startupConfig, setStartupConfig] = useState<InterviewConfig | null>(null);

  useEffect(() => {
    if (!resumeInterviewParam) {
      return;
    }

    const stored = window.localStorage.getItem(RESUME_INTERVIEW_STORAGE_KEY);
    if (!stored) {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(stored) as {
          questions?: Array<{ id?: string; question?: string; type?: string; focus?: string }>;
        };
        const nextQuestions = (parsed.questions ?? []).filter(
          (question): question is { id?: string; question: string; type?: string; focus?: string } =>
            typeof question?.question === "string" && question.question.trim().length > 0
        );
        setResumeQuestions(nextQuestions);
      } catch {
        setResumeQuestions([]);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [resumeInterviewParam]);

  useEffect(() => {
    if (!hasUrlConfig || !roleParam || !difficultyParam || !interviewTypeParam) {
      return;
    }

    const nextConfig: InterviewConfig = {
      role: roleParam,
      interviewType: interviewTypeParam as InterviewConfig["interviewType"],
      difficulty: difficultyParam as Difficulty,
      mode: modeParam === "voice" ? "voice" : "text",
      durationMinutes: Number(durationParam) || 20,
      totalQuestions: MAX_QUESTIONS,
    };

    setStartupConfig(nextConfig);
  }, [durationParam, difficultyParam, hasUrlConfig, interviewTypeParam, modeParam, roleParam]);

  useEffect(() => {
    if (!startupConfig) {
      return;
    }

    void handleStartInterview(startupConfig);
    setStartupConfig(null);
  }, [handleStartInterview, startupConfig]);

  // Timestamp-based countdown with drift resistance and visibility recalculation.
  useEffect(() => {
    if (interview.state.status !== "in-progress" || endTimestampRef.current === null) {
      return;
    }

    const updateTimer = () => {
      if (endTimestampRef.current === null) {
        return;
      }
      const remaining = Math.max(
        0,
        Math.round((endTimestampRef.current - Date.now()) / 1000)
      );
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [interview.state.status]);

  // Auto-finish when the timer reaches zero — executes only once, resets on failure.
  useEffect(() => {
    if (
      interview.state.status === "in-progress" &&
      timeRemaining <= 0 &&
      !autoFinishTriggeredRef.current
    ) {
      autoFinishTriggeredRef.current = true;
      void handleFinishInterview().then((completed) => {
        if (!completed) {
          autoFinishTriggeredRef.current = false;
        }
      });
    }
  }, [handleFinishInterview, interview.state.status, timeRemaining]);

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
      const evaluation = await interview.submitAnswer(answer);
      return evaluation;
    },
    [interview]
  );

  const handleNextQuestion = useCallback(async () => {
    if (isFinishingRef.current) {
      return;
    }
    const nextCount = questionCount + 1;
    setQuestionCount(nextCount);
    if (nextCount >= MAX_QUESTIONS) {
      await handleFinishInterview();
    } else {
      await interview.fetchQuestion(undefined, resumeInterviewParam ? { resumeQuestions } : undefined);
    }
  }, [questionCount, interview, handleFinishInterview, resumeInterviewParam, resumeQuestions]);

  const handleVoiceStartCall = useCallback(async () => {
    setVapiErrorMsg(null);
    await vapi.startCall();
    if (interview.state.config && !interview.state.currentQuestion) {
      await interview.fetchQuestion();
    }
  }, [vapi, interview]);

  const handleVoiceEndCall = useCallback(async () => {
    // vapi.endCall() will trigger the `call-end` event → onCallEnded → finishInterviewRef.current().
    // The isFinishingRef guard inside handleFinishInterview prevents double execution.
    await vapi.endCall();
    await handleFinishInterview();
  }, [vapi, handleFinishInterview]);

  const progressValue = ((questionCount + 1) / MAX_QUESTIONS) * 100;
  const timerPercent = (timeRemaining / (selectedDurationMinutes * 60)) * 100;
  const isFinishing = isFinishingRef.current || interview.isFinishing;

  if (interview.state.status === "completed" && interview.state.feedback) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen overflow-x-hidden bg-[#020817] px-4 pb-20 pt-28 text-white sm:px-6">
          <div className="mx-auto max-w-5xl">
            <button
              onClick={() => router.push("/interview")}
              className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Interviews
            </button>
            {saving && (
              <div className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Saving your interview...
              </div>
            )}
            {saved && (
              <div className="mb-6 flex items-center justify-center gap-2 text-sm text-emerald-400">
                <CheckCircle size={16} />
                Interview saved successfully! Redirecting to dashboard...
              </div>
            )}
            {saveError && !saved && (
              <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{saveError}</span>
                </div>
                <button
                  onClick={() => void handleFinishInterview()}
                  disabled={saving}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                >
                  {saving ? "Retrying..." : "Retry Save"}
                </button>
              </div>
            )}
            <FeedbackCard
              feedback={interview.state.feedback}
              role={interview.state.config?.role || ""}
              interviewType={interview.state.config?.interviewType || "technical"}
              difficulty={interview.state.config?.difficulty || "intermediate"}
            />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (interview.state.status === "idle" || interview.state.status === "setup") {
    return (
      <ProtectedRoute>
        <main className="min-h-screen overflow-x-hidden bg-[#020817] px-4 pb-20 pt-28 text-white sm:px-6">
          <button
            onClick={() => router.push("/interview")}
            className="mx-auto mb-8 flex max-w-5xl items-center gap-2 px-1 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Setup
          </button>
          <InterviewSetup onStart={handleStartInterview} initialRole={roleParam} />
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen overflow-x-hidden bg-[#020817] px-3 pb-20 pt-24 text-white sm:px-5 lg:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl flex-col">
          {isFinishing && finishStage && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-300">
              <Loader2 size={18} className="animate-spin" />
              <span>{FINISH_STAGE_LABELS[finishStage] ?? "Completing interview..."}</span>
            </div>
          )}
          {saveError && !saved && (
            <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{saveError}</span>
              </div>
              <button
                onClick={() => void handleFinishInterview()}
                disabled={saving}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
              >
                {saving ? "Retrying..." : "Retry"}
              </button>
            </div>
          )}
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/20 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                <Bot size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">AI Interviewer</p>
                <p className="truncate text-xs text-slate-400">
                  {interview.state.config?.role} • {interview.state.config?.interviewType} • {interview.state.config?.difficulty}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="min-w-[180px] rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <span>Time left</span>
                  <span>{formatTime(timeRemaining)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, timerPercent)}%` }}
                  />
                </div>
              </div>
              <div className="min-w-[160px] rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <span>Question</span>
                  <span>{questionCount + 1}/{MAX_QUESTIONS}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, progressValue)}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => void handleFinishInterview()}
                disabled={isFinishing}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFinishing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Clock3 size={16} />
                )}
                {isFinishing ? "Finishing..." : "Finish"}
              </button>
            </div>
          </div>

          {vapiErrorMsg && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>Voice Error: {vapiErrorMsg}</span>
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">
            {voiceMode && (
              <aside className="w-full shrink-0 lg:w-80">
                <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
                  <h3 className="mb-4 text-sm font-semibold text-slate-300">Voice Controls</h3>
                  <VoiceControls
                    callStatus={vapi.callStatus}
                    onStartCall={handleVoiceStartCall}
                    onEndCall={handleVoiceEndCall}
                    onToggleMute={vapi.toggleMute}
                    disabled={interview.state.status !== "in-progress" || isFinishing}
                  />
                  {vapi.callStatus.transcript && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Live Transcript</p>
                      <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-800/50 p-3">
                        <p className="whitespace-pre-wrap break-words text-sm text-slate-400">{vapi.callStatus.transcript}</p>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {!voiceMode && (
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
                <InterviewChat
                  currentQuestion={interview.state.currentQuestion}
                  onSubmitAnswer={handleSubmitAnswer}
                  onNextQuestion={handleNextQuestion}
                  isLastQuestion={questionCount >= MAX_QUESTIONS - 1}
                  loading={interview.loading}
                  transcript={interview.state.transcript}
                />
              </div>
            )}

            {voiceMode && (
              <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/20 backdrop-blur-xl sm:p-6">
                {interview.state.currentQuestion ? (
                  <div className="flex flex-1 flex-col">
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 sm:p-5">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-blue-400">Current Question</p>
                      <h2 className="text-lg font-semibold leading-relaxed text-white break-words sm:text-xl">
                        {interview.state.currentQuestion.question}
                      </h2>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
                      <p className="font-medium text-slate-300">Voice guidance</p>
                      <p className="mt-2 leading-relaxed">
                        Speak clearly and answer at a steady pace. Your transcript will appear here as you respond.
                      </p>
                    </div>
                    {interview.state.transcript.length > 0 && (
                      <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Conversation History</p>
                        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                          {interview.state.transcript.map((entry: string, index: number) => (
                            <p key={`${entry}-${index}`} className="rounded-lg bg-slate-800/60 p-3 text-sm text-slate-400 break-words">
                              {entry}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 size={36} className="mx-auto animate-spin text-blue-400" />
                      <p className="mt-4 text-slate-400">
                        {vapi.callStatus.status === "connected"
                          ? "Generating question..."
                          : "Start the voice call to begin"}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
