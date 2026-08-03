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
import { Bot, ArrowLeft, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import type { InterviewConfig, Difficulty } from "@/types";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020817]">
      <Loader2 size={40} className="animate-spin text-blue-400" />
    </div>
  );
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
  const [questionCount, setQuestionCount] = useState(0);
  const [vapiErrorMsg, setVapiErrorMsg] = useState<string | null>(null);
  const MAX_QUESTIONS = 5;
  const finishInterviewRef = useRef<() => void>(() => {});

  const handleTranscriptUpdate = useCallback(
    (transcript: string) => {
      interview.addToTranscript(transcript);
    },
    [interview]
  );

  const vapi = useVapi({
    onTranscriptUpdate: handleTranscriptUpdate,
    onCallEnded: () => {
      finishInterviewRef.current();
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
  const hasUrlConfig = !!(roleParam && difficultyParam && interviewTypeParam);
  const voiceMode = modeParam === "voice";

  const handleFinishInterview = useCallback(async () => {
    if (interview.state.status === "completed") {
      return;
    }
    interview.endInterview();
    const feedback = await interview.generateFeedback();
    if (feedback) {
      setSaving(true);
      const success = await interview.saveInterview();
      if (success) {
        setSaved(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
      setSaving(false);
    }
  }, [interview, router]);

  useEffect(() => {
    finishInterviewRef.current = handleFinishInterview;
  }, [handleFinishInterview]);

  const handleStartInterview = useCallback(
    (config: InterviewConfig) => {
      interview.startInterview(config);
      setTimeout(() => {
        interview.fetchQuestion();
      }, 300);
    },
    [interview]
  );

  useEffect(() => {
    if (hasUrlConfig && roleParam && difficultyParam && interviewTypeParam) {
      const config: InterviewConfig = {
        role: roleParam,
        interviewType: interviewTypeParam as InterviewConfig["interviewType"],
        difficulty: difficultyParam as Difficulty,
        mode: modeParam === "voice" ? "voice" : "text",
      };
      handleStartInterview(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUrlConfig]);

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
      const evaluation = await interview.submitAnswer(answer);
      return evaluation;
    },
    [interview]
  );

  const handleNextQuestion = useCallback(async () => {
    const newCount = questionCount + 1;
    setQuestionCount(newCount);
    if (newCount >= MAX_QUESTIONS) {
      await handleFinishInterview();
    } else {
      await interview.fetchQuestion();
    }
  }, [questionCount, interview, handleFinishInterview]);

  const handleVoiceStartCall = useCallback(async () => {
    setVapiErrorMsg(null);
    await vapi.startCall();
    if (interview.state.config && !interview.state.currentQuestion) {
      await interview.fetchQuestion();
    }
  }, [vapi, interview]);

  const handleVoiceEndCall = useCallback(async () => {
    await vapi.endCall();
    await handleFinishInterview();
  }, [vapi, handleFinishInterview]);

  // Completed state
  if (interview.state.status === "completed" && interview.state.feedback) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#020817] pt-28 pb-20 text-white">
          <div className="mx-auto max-w-5xl px-5">
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
                Interview saved successfully!
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

  // Setup state
  if (interview.state.status === "idle" || interview.state.status === "setup") {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#020817] pt-28 pb-20 text-white">
          <button
            onClick={() => router.push("/interview")}
            className="mx-auto mb-8 flex max-w-5xl items-center gap-2 px-5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Setup
          </button>
          <InterviewSetup onStart={handleStartInterview} initialRole={roleParam} />
        </main>
      </ProtectedRoute>
    );
  }

  // In-progress state
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#020817] pt-24 pb-20 text-white">
        <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-6xl flex-col px-5">
          {/* Header bar */}
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Interviewer</p>
                <p className="text-xs text-slate-400">
                  {interview.state.config?.role} &middot;{" "}
                  {interview.state.config?.interviewType} &middot;{" "}
                  {interview.state.config?.difficulty}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  Question {questionCount + 1}/{MAX_QUESTIONS}
                </p>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{
                      width: `${((questionCount + 1) / MAX_QUESTIONS) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleFinishInterview}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/20"
              >
                End Interview
              </button>
            </div>
          </div>

          {vapiErrorMsg && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>Voice Error: {vapiErrorMsg}</span>
            </div>
          )}

          {/* Content area */}
          <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Voice mode sidebar */}
            {voiceMode && (
              <div className="flex w-72 flex-shrink-0 flex-col gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
                  <h3 className="mb-4 text-sm font-semibold text-slate-300">Voice Controls</h3>
                  <VoiceControls
                    callStatus={vapi.callStatus}
                    onStartCall={handleVoiceStartCall}
                    onEndCall={handleVoiceEndCall}
                    onToggleMute={vapi.toggleMute}
                    disabled={interview.state.status !== "in-progress"}
                  />
                  {vapi.callStatus.transcript && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500">Live Transcript</p>
                      <div className="max-h-40 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
                        <p className="whitespace-pre-wrap text-xs text-slate-400">{vapi.callStatus.transcript}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text interview chat */}
            {!voiceMode && (
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
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

            {/* Voice interview main area */}
            {voiceMode && (
              <div className="flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl">
                {interview.state.currentQuestion ? (
                  <div>
                    <p className="mb-2 text-xs font-medium text-blue-400">Current Question</p>
                    <h2 className="text-xl font-semibold leading-relaxed text-white">
                      {interview.state.currentQuestion.question}
                    </h2>
                    <p className="mt-4 text-sm text-slate-500">
                      Speak your answer using the voice controls on the left.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <Loader2 size={40} className="mx-auto animate-spin text-blue-400" />
                      <p className="mt-4 text-slate-400">
                        {vapi.callStatus.status === "connected"
                          ? "Generating question..."
                          : "Start the voice call to begin"}
                      </p>
                    </div>
                  </div>
                )}
                {interview.state.transcript.length > 0 && (
                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <p className="mb-3 text-xs font-medium text-slate-500">Conversation History</p>
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                      {interview.state.transcript.map((t: string, i: number) => (
                        <p key={i} className="rounded-lg bg-slate-800/30 p-2 text-sm text-slate-400">
                          {t}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
