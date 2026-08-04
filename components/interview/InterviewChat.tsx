"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle, ChevronRight, Loader2, Send, Sparkles, User } from "lucide-react";
import type { AnswerEvaluation, InterviewQuestion } from "@/types";

interface InterviewChatProps {
  currentQuestion: InterviewQuestion | null;
  onSubmitAnswer: (answer: string) => Promise<AnswerEvaluation | null>;
  onNextQuestion: () => Promise<void>;
  isLastQuestion?: boolean;
  loading?: boolean;
  transcript: string[];
}

export function InterviewChat({
  currentQuestion,
  onSubmitAnswer,
  onNextQuestion,
  isLastQuestion = false,
  loading = false,
  transcript,
}: InterviewChatProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [answered, setAnswered] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentQuestion]);

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return;

    setSubmitting(true);
    const result = await onSubmitAnswer(answer.trim());
    setSubmitting(false);

    if (result) {
      setEvaluation(result);
      setAnswered(true);
    }
  };

  const handleNext = async () => {
    setAnswer("");
    setEvaluation(null);
    setAnswered(false);
    await onNextQuestion();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (answered) {
        void handleNext();
      } else {
        void handleSubmit();
      }
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-16">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto animate-spin text-blue-400" />
          <p className="mt-4 text-sm text-slate-400">Preparing your next question…</p>
        </div>
      </div>
    );
  }

  const characterCount = answer.trim().length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10">
            <Sparkles size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Live Question</p>
            <p className="text-xs text-slate-400">Answer with clarity and keep it concise.</p>
          </div>
        </div>
        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          In progress
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20">
            <Bot size={20} className="text-blue-400" />
          </div>
          <div className="max-w-[92%] rounded-2xl rounded-tl-none border border-blue-500/20 bg-blue-500/5 px-4 py-3 sm:max-w-[80%] sm:px-5">
            <p className="text-sm font-medium text-blue-300">AI Interviewer</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white sm:text-[15px]">
              {currentQuestion.question}
            </p>
          </div>
        </div>

        {evaluation && (
          <div className="flex items-start justify-end gap-3">
            <div className="max-w-[92%] rounded-2xl rounded-tr-none border border-slate-700 bg-slate-800/80 px-4 py-3 sm:max-w-[80%] sm:px-5">
              <p className="text-sm font-medium text-slate-400">You</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white sm:text-[15px]">
                {evaluation.answer}
              </p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-700">
              <User size={20} className="text-slate-300" />
            </div>
          </div>
        )}

        {evaluation && (
          <div className="ml-0 max-w-[92%] rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 sm:ml-12 sm:max-w-[80%] sm:px-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-400">Score: {evaluation.score}/100</span>
            </div>

            {evaluation.strengths.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">Strengths</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-300">
                  {evaluation.strengths.map((strength, index) => (
                    <li key={`${strength}-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.improvementSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-amber-300">Suggestions</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-300">
                  {evaluation.improvementSuggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-slate-800/80 bg-slate-950/40 p-3 sm:p-4">
        {!answered ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer here..."
                disabled={submitting || loading}
                rows={4}
                maxLength={2000}
                className="min-h-[108px] w-full resize-none rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Press Enter to submit, Shift+Enter for a new line.</span>
                <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px]">
                  {characterCount}/2000
                </span>
              </div>
            </div>
            <button
              onClick={() => void handleSubmit()}
              title="Send answer"
              disabled={!answer.trim() || submitting || loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-12 sm:px-0"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  <span className="sm:hidden">Send</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleNext()}
              title={isLastQuestion ? "Finish interview" : "Continue to next question"}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Loading next question...
                </span>
              ) : isLastQuestion ? (
                <>
                  <CheckCircle size={18} />
                  Finish Interview
                </>
              ) : (
                <>
                  Next Question
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

