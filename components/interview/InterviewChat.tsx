"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import type { InterviewQuestion, AnswerEvaluation } from "@/types";

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (answered) {
        handleNext();
      } else {
        handleSubmit();
      }
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto animate-spin text-blue-400" />
          <p className="mt-4 text-slate-400">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat transcript area */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {/* AI Question */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20">
            <Bot size={20} className="text-blue-400" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-blue-500/20 bg-blue-500/5 px-5 py-3">
            <p className="text-sm font-medium text-blue-300">AI Interviewer</p>
            <p className="mt-1 text-white">{currentQuestion.question}</p>
          </div>
        </div>

        {/* User's answer if submitted */}
        {evaluation && (
          <div className="flex items-start justify-end gap-3">
            <div className="max-w-[80%] rounded-2xl rounded-tr-none border border-slate-700 bg-slate-800/80 px-5 py-3">
              <p className="text-sm font-medium text-slate-400">You</p>
              <p className="mt-1 text-white">{evaluation.answer}</p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-700">
              <User size={20} className="text-slate-300" />
            </div>
          </div>
        )}

        {/* Evaluation feedback */}
        {evaluation && (
          <div className="ml-13 max-w-[80%] rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-400">
                Score: {evaluation.score}/100
              </span>
            </div>

            {evaluation.strengths.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-emerald-300">Strengths</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-300">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.improvementSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-300">
                  Improvement Suggestions
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-300">
                  {evaluation.improvementSuggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 p-4">
        {!answered ? (
          <div className="flex items-end gap-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here..."
              disabled={submitting || loading}
              rows={3}
              className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting || loading}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Loading next question...
              </span>
            ) : isLastQuestion ? (
              "Finish Interview"
            ) : (
              "Next Question →"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

