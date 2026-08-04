"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { User, Mail, Calendar, Award, BarChart3, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";

interface InterviewRecord {
  id: string;
  role: string;
  difficulty: string;
  interview_type: string;
  status: string;
  score: number | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}

interface FeedbackRecord {
  id: string;
  interview_id: string;
  overall_score: number | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;

      console.log("[Profile] Loading data for user:", user.id);

      try {
        const [interviewsRes, feedbackRes] = await Promise.all([
          supabase
            .from("interviews")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false }),
          supabase
            .from("feedback")
            .select("id, interview_id, overall_score, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        console.log("[Profile] Interviews query response:", {
          userId: user.id,
          filter: { user_id: user.id, status: "completed" },
          count: interviewsRes.data?.length ?? 0,
          error: interviewsRes.error
            ? { message: interviewsRes.error.message, code: interviewsRes.error.code }
            : null,
        });

        console.log("[Profile] Feedback query response:", {
          userId: user.id,
          filter: { user_id: user.id },
          count: feedbackRes.data?.length ?? 0,
          error: feedbackRes.error
            ? { message: feedbackRes.error.message, code: feedbackRes.error.code }
            : null,
        });

        if (interviewsRes.error) {
          console.error("[Profile] Interviews query failed:", {
            message: interviewsRes.error.message,
            code: interviewsRes.error.code,
            details: interviewsRes.error.details,
          });
        } else if (interviewsRes.data) {
          setInterviews(interviewsRes.data as InterviewRecord[]);
        }

        if (feedbackRes.error) {
          console.error("[Profile] Feedback query failed:", {
            message: feedbackRes.error.message,
            code: feedbackRes.error.code,
            details: feedbackRes.error.details,
          });
        } else if (feedbackRes.data) {
          setFeedbackRecords(feedbackRes.data as FeedbackRecord[]);
        }
      } catch (err) {
        console.error("[Profile] Unexpected fetch error:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchUserData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  const name = user?.user_metadata?.full_name || "Aegis User";
  const email = user?.email || "";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const totalInterviews = interviews.length;

  // Average score from feedback table
  const scoredFeedback = feedbackRecords.filter(
    (f) => typeof f.overall_score === "number"
  );
  const avgScore =
    scoredFeedback.length > 0
      ? Math.round(
          scoredFeedback.reduce((acc, f) => acc + (f.overall_score || 0), 0) /
            scoredFeedback.length
        )
      : null;

  // Highest score from feedback table
  const highScore =
    scoredFeedback.length > 0
      ? Math.max(...scoredFeedback.map((f) => f.overall_score || 0))
      : null;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#020817] pt-28 pb-20 text-white">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          {/* Profile Header */}
          <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-600/20">
                <User size={48} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold">{name}</h1>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400 sm:justify-start">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-blue-400" />
                    <span>{email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-cyan-400" />
                    <span>Member since {createdAt}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <BarChart3 size={24} />
              </div>
              <p className="text-3xl font-bold">{totalInterviews}</p>
              <p className="mt-1 text-sm text-slate-400">Interviews Completed</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Award size={24} />
              </div>
              <p className="text-3xl font-bold">{avgScore !== null ? `${avgScore}%` : "—"}</p>
              <p className="mt-1 text-sm text-slate-400">Average Score</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Trophy size={24} />
              </div>
              <p className="text-3xl font-bold">{highScore !== null ? `${highScore}%` : "—"}</p>
              <p className="mt-1 text-sm text-slate-400">Highest Score</p>
            </div>
          </div>

          {/* Recent Interviews */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl">
            <h2 className="mb-6 text-xl font-bold">Recent Interviews</h2>

            {interviews.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p>No interviews completed yet.</p>
                <Link
                  href="/interview"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
                >
                  Start Practice Interview
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-white">{item.role}</span>
                        <span className="rounded-full bg-slate-700/60 px-3 py-1 text-xs text-slate-300 capitalize">
                          {item.interview_type}
                        </span>
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400 capitalize">
                          {item.difficulty}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span>
                          Completed on {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {item.duration_seconds ? (
                          <span>
                            {Math.round(item.duration_seconds / 60)} min
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {typeof item.score === "number" && (
                        <div
                          className={`rounded-xl px-4 py-2 text-sm font-bold ${
                            item.score >= 80
                              ? "border border-green-500/30 bg-green-500/10 text-green-400"
                              : item.score >= 60
                              ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                              : "border border-red-500/30 bg-red-500/10 text-red-400"
                          }`}
                        >
                          Score: {item.score}/100
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
