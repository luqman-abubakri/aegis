"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  BarChart3,
  Target,
  Clock,
  Award,
  PlayCircle,
  FileText,
  User,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface DashboardInterview {
  id: string;
  role: string;
  difficulty: string;
  interview_type: string;
  status: string;
  score: number | null;
  feedback: { summary?: string } | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}

interface DashboardFeedback {
  id: string;
  interview_id: string;
  overall_score: number | null;
  summary: string | null;
  created_at: string;
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Convert each date to a "day key" (YYYY-MM-DD) in local time.
  // Using explicit date construction avoids the non-standard
  // toDateString() -> new Date(string) round-trip which can behave
  // differently across JS engines.
  const dayKeys = new Set(
    dates.map((d) => {
      const date = new Date(d);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })
  );

  // Convert day keys to timestamps (midnight local time) and sort descending
  const sortedDays = Array.from(dayKeys)
    .map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d).getTime();
    })
    .sort((a, b) => b - a);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const oneDayMs = 86400000;

  // If the most recent practice wasn't today or yesterday, streak is 0
  if (sortedDays[0] < todayMs - oneDayMs) {
    return 0;
  }

  let streak = 0;
  // Start from today if the most recent practice is today, otherwise yesterday
  let expectedDay = sortedDays[0] >= todayMs ? todayMs : todayMs - oneDayMs;

  for (const dayMs of sortedDays) {
    if (dayMs === expectedDay) {
      streak++;
      expectedDay -= oneDayMs;
    } else if (dayMs < expectedDay) {
      break;
    }
  }

  return streak;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState<DashboardInterview[]>([]);
  const [feedbackRecords, setFeedbackRecords] = useState<DashboardFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;

      console.log("[Dashboard] Loading data for user:", user.id);

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
            .select("id, interview_id, overall_score, summary, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        console.log("[Dashboard] Interviews query response:", {
          userId: user.id,
          filter: { user_id: user.id, status: "completed" },
          count: interviewsRes.data?.length ?? 0,
          error: interviewsRes.error
            ? { message: interviewsRes.error.message, code: interviewsRes.error.code }
            : null,
        });

        console.log("[Dashboard] Feedback query response:", {
          userId: user.id,
          filter: { user_id: user.id },
          count: feedbackRes.data?.length ?? 0,
          error: feedbackRes.error
            ? { message: feedbackRes.error.message, code: feedbackRes.error.code }
            : null,
        });

        if (interviewsRes.error) {
          console.error("[Dashboard] Interviews query failed:", {
            message: interviewsRes.error.message,
            code: interviewsRes.error.code,
            details: interviewsRes.error.details,
          });
        } else if (interviewsRes.data) {
          setInterviews(interviewsRes.data as DashboardInterview[]);
        }

        if (feedbackRes.error) {
          console.error("[Dashboard] Feedback query failed:", {
            message: feedbackRes.error.message,
            code: feedbackRes.error.code,
            details: feedbackRes.error.details,
          });
        } else if (feedbackRes.data) {
          setFeedbackRecords(feedbackRes.data as DashboardFeedback[]);
        }
      } catch (err) {
        console.error("[Dashboard] Unexpected fetch error:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const completedCount = interviews.length;

  // Average score from feedback table
  const scoredFeedback = feedbackRecords.filter(
    (f) => typeof f.overall_score === "number"
  );
  const avgScore =
    scoredFeedback.length > 0
      ? `${Math.round(
          scoredFeedback.reduce((a, b) => a + (b.overall_score || 0), 0) /
            scoredFeedback.length
        )}%`
      : "—";

  // Total practice time from interview durations (seconds -> minutes)
  const totalSeconds = interviews.reduce(
    (sum, i) => sum + (i.duration_seconds || 0),
    0
  );
  const totalTimeMinutes = Math.round(totalSeconds / 60);
  const totalTimeDisplay =
    totalTimeMinutes >= 60
      ? `${Math.floor(totalTimeMinutes / 60)}h ${totalTimeMinutes % 60}m`
      : `${totalTimeMinutes} min`;

  // Streak: consecutive practice days
  const streakCount = calculateStreak(
    interviews.map((i) => i.created_at)
  );
  const streakDisplay = `${streakCount} ${streakCount === 1 ? "day" : "days"}`;

  const latestInterview = interviews.find((i) => i.feedback);

  const stats = [
    {
      icon: BarChart3,
      label: "Interviews Completed",
      value: String(completedCount),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Target,
      label: "Average Score",
      value: avgScore,
      color: "from-violet-500 to-fuchsia-500",
    },
    {
      icon: Clock,
      label: "Total Practice Time",
      value: totalTimeDisplay,
      color: "from-emerald-500 to-green-500",
    },
    {
      icon: Award,
      label: "Streak",
      value: streakDisplay,
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <ProtectedRoute>
      <main className="relative min-h-screen bg-[#020817] pt-28 pb-20 text-white">
        {/* Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[170px]" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)
              `,
              backgroundSize: "70px 70px",
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-black md:text-5xl">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {user?.user_metadata?.full_name || user?.email || "Aegis User"}
              </span>
            </h1>
            <p className="mt-3 text-lg text-slate-400">
              Ready to ace your next interview? Let&apos;s get started.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}
                  >
                    <Icon size={22} />
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="mb-6 text-2xl font-bold">Quick Actions</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/interview"
                className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 p-6 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <PlayCircle size={32} className="mb-4 text-blue-400" />
                <h3 className="text-lg font-bold">Start Interview</h3>
                <p className="mt-2 text-sm text-slate-400">Begin a new practice interview session</p>
              </Link>

              <Link
                href="/resume"
                className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 p-6 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10"
              >
                <FileText size={32} className="mb-4 text-violet-400" />
                <h3 className="text-lg font-bold">Analyze Resume</h3>
                <p className="mt-2 text-sm text-slate-400">Upload your resume for AI analysis</p>
              </Link>

              <Link
                href="/profile"
                className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-emerald-600/10 to-green-600/10 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <User size={32} className="mb-4 text-emerald-400" />
                <h3 className="text-lg font-bold">View Profile</h3>
                <p className="mt-2 text-sm text-slate-400">Manage your account settings</p>
              </Link>
            </div>
          </motion.div>

          {/* Recent Interviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl"
          >
            <h2 className="mb-6 text-2xl font-bold">Recent Interviews</h2>

            {interviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 size={48} className="mb-4 text-slate-600" />
                <p className="text-lg text-slate-400">No interviews completed yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Complete your first interview to see it here
                </p>
                <Link
                  href="/interview"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold transition-all duration-300 hover:scale-105"
                >
                  Start First Interview
                  <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.slice(0, 5).map((item) => {
                  const durationMin = item.duration_seconds
                    ? Math.round(item.duration_seconds / 60)
                    : 0;
                  const durationDisplay =
                    durationMin >= 60
                      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
                      : `${durationMin} min`;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-5 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-lg font-semibold text-white">{item.role}</span>
                          <span className="rounded-full bg-slate-700/60 px-3 py-1 text-xs text-slate-300 capitalize">
                            {item.interview_type}
                          </span>
                          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400 capitalize">
                            {item.difficulty}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          <span>
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {durationDisplay}
                          </span>
                        </div>
                      </div>
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
                          {item.score}/100
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Latest AI Feedback */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl"
          >
            <h2 className="mb-6 text-2xl font-bold">Latest AI Feedback</h2>

            {latestInterview ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-white">
                        {latestInterview.role}
                      </span>
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 capitalize">
                        {latestInterview.difficulty}
                      </span>
                    </div>
                    {latestInterview.feedback?.summary && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">
                        {latestInterview.feedback.summary}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Completed on {new Date(latestInterview.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {typeof latestInterview.score === "number" && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 px-6 py-4">
                      <span className="text-3xl font-black text-blue-400">
                        {latestInterview.score}
                      </span>
                      <span className="text-xs text-slate-400">Overall Score</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Award size={48} className="mb-4 text-slate-600" />
                <p className="text-lg text-slate-400">No interviews completed yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Complete your first interview to see AI feedback here
                </p>
                <Link
                  href="/interview"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-semibold transition-all duration-300 hover:scale-105"
                >
                  Start First Interview
                  <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
