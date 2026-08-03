"use client";

import { Award, TrendingUp, Lightbulb, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { InterviewFeedback } from "@/types";
import { useState } from "react";

interface FeedbackCardProps {
  feedback: InterviewFeedback;
  role: string;
  interviewType: string;
  difficulty: string;
}

export function FeedbackCard({
  feedback,
  role,
  interviewType,
  difficulty,
}: FeedbackCardProps) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const scoreColor =
    feedback.overallScore >= 80
      ? "text-green-400"
      : feedback.overallScore >= 60
        ? "text-yellow-400"
        : "text-red-400";

  const scoreBg =
    feedback.overallScore >= 80
      ? "border-green-500/30 bg-green-500/10"
      : feedback.overallScore >= 60
        ? "border-yellow-500/30 bg-yellow-500/10"
        : "border-red-500/30 bg-red-500/10";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2 text-sm text-blue-300 backdrop-blur-md">
          <Award size={16} />
          Interview Complete
        </div>

        <h2 className="text-3xl font-black md:text-4xl">
          Your{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Interview Feedback
          </span>
        </h2>

        <p className="mt-2 text-slate-400">
          {role} &middot; {interviewType} &middot; {difficulty}
        </p>
      </div>

      {/* Overall Score */}
      <div className={`rounded-3xl border p-8 text-center backdrop-blur-xl ${scoreBg}`}>
        <div className="mb-2 text-6xl font-black tracking-tight">
          <span className={scoreColor}>{feedback.overallScore}</span>
          <span className="text-3xl text-slate-500">/100</span>
        </div>
        <p className="text-lg text-slate-400">
          {feedback.overallScore >= 80
            ? "Excellent performance!"
            : feedback.overallScore >= 60
              ? "Good effort! Keep practicing."
              : "Keep practicing, you'll improve!"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {feedback.answeredQuestions} of {feedback.totalQuestions} questions answered
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold">Summary</h3>
        </div>
        <p className="leading-relaxed text-slate-300">{feedback.summary}</p>
      </div>

      {/* Strengths */}
      {feedback.strengths.length > 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-400" />
            <h3 className="text-lg font-semibold">Strengths</h3>
          </div>
          <ul className="space-y-3">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <Lightbulb size={18} className="mt-0.5 flex-shrink-0 text-green-400" />
                <span className="text-slate-300">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas for Improvement */}
      {feedback.areasForImprovement.length > 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-400" />
            <h3 className="text-lg font-semibold">Areas for Improvement</h3>
          </div>
          <ul className="space-y-3">
            {feedback.areasForImprovement.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <XCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-400" />
                <span className="text-slate-300">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-Question Breakdown */}
      {feedback.questionEvaluations.length > 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <h3 className="mb-6 text-lg font-semibold">Question Breakdown</h3>
          <div className="space-y-4">
            {feedback.questionEvaluations.map((q, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-700/50 bg-slate-800/40 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-800/80"
                >
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">Question {i + 1}</p>
                    <p className="mt-1 text-sm font-medium text-white line-clamp-2">
                      {q.question}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span
                      className={`text-lg font-bold ${
                        q.score >= 80
                          ? "text-green-400"
                          : q.score >= 60
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {q.score}
                    </span>
                    <svg
                      className={`h-5 w-5 text-slate-400 transition-transform ${
                        expandedQ === i ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {expandedQ === i && (
                  <div className="border-t border-slate-700/50 p-4">
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-medium text-slate-500">
                        Your Answer
                      </p>
                      <p className="text-sm text-slate-300">{q.answer}</p>
                    </div>

                    {q.strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs font-medium text-green-400">
                          Strengths
                        </p>
                        <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-300">
                          {q.strengths.map((s, si) => (
                            <li key={si}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {q.improvementSuggestions.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs font-medium text-amber-400">
                          Improvements
                        </p>
                        <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-300">
                          {q.improvementSuggestions.map((s, si) => (
                            <li key={si}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {q.modelAnswer && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-blue-400">
                          Model Answer
                        </p>
                        <p className="text-sm text-slate-300">{q.modelAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

