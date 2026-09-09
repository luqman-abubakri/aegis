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
          <Loader2 size={40} className="mx-auto animate-spin text-[#A855F7]" />
          <p className="mt-4 text-sm text-[#666666]">Preparing your next question…</p>
        </div>
      </div>
    );
  }

  const characterCount = answer.trim().length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D9D4] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center bg-orange-50">
            <Sparkles size={18} className="text-[#A855F7]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Live Question</p>
            <p className="text-xs text-[#666666]">Answer with clarity and keep it concise.</p>
          </div>
        </div>
        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          In progress
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-orange-50">
            <Bot size={20} className="text-[#A855F7]" />
          </div>
          <div className="max-w-[92%] border border-orange-200 bg-orange-50 px-4 py-3 sm:max-w-[80%] sm:px-5">
            <p className="text-sm font-medium text-[#F97316]">AI Interviewer</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#111111] sm:text-[15px]">
              {currentQuestion.question}
            </p>
          </div>
        </div>

        {evaluation && (
          <div className="flex items-start justify-end gap-3">
            <div className="max-w-[92%] border border-[#D9D9D4] bg-[#F1F1EE] px-4 py-3 sm:max-w-[80%] sm:px-5">
              <p className="text-sm font-medium text-[#666666]">You</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white sm:text-[15px]">
                {evaluation.answer}
              </p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-[#EEECE7]">
              <User size={20} className="text-[#111111]" />
            </div>
          </div>
        )}

{evaluation && (
          <div className="ml-0 max-w-[92%] rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 sm:ml-12 sm:max-w-[80%] sm:px-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-400">Score: {evaluation.score}/100</span>
            </div>

            {evaluation.coachingMessage && (
              <div className="mb-3 border border-orange-200 bg-orange-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#F97316]">AI Coaching</p>
                <p className="mt-1 text-sm italic leading-relaxed text-[#C2410C]">
                  {evaluation.coachingMessage}
                </p>
              </div>
            )}

            {evaluation.strengths.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">Strengths</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-[#666666]">
                  {evaluation.strengths.map((strength, index) => (
                    <li key={`${strength}-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.improvementSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-amber-300">Suggestions</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-[#666666]">
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

      <div className="border-t border-[#D9D9D4] bg-[#F5F4F0] p-3 sm:p-4">
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
                className="min-h-[108px] w-full resize-none border border-[#D9D9D4] bg-white px-4 py-3 text-sm text-[#111111] placeholder-[#888888] outline-none transition-all focus:border-[#F97316] disabled:opacity-50"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#888888]">
                <span>Press Enter to submit, Shift+Enter for a new line.</span>
                <span className="border border-[#D9D9D4] px-2.5 py-1 text-[11px]">
                  {characterCount}/2000
                </span>
              </div>
            </div>
            <button
              onClick={() => void handleSubmit()}
              title="Send answer"
              disabled={!answer.trim() || submitting || loading}
              className="hard-edge inline-flex h-12 w-full items-center justify-center gap-2 bg-[#F97316] px-4 py-3 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-12 sm:px-0"
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
              className="hard-edge flex w-full items-center justify-center gap-2 bg-[#F97316] px-6 py-3 font-semibold text-white hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"
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

