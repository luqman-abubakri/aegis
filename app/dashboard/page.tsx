"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  BarChart3,
  Target,
  Clock,
  Award,
  PlayCircle,
  FileText,
  User,
  ArrowRight,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface DashboardInterview {
  _id: string;
  role: string;
  difficulty: string;
  interviewType: string;
  status: string;
  score: number | null;
  feedback: { summary?: string } | null;
  durationSeconds: number | null;
  startedAt: string;
  createdAt: string;
  completedAt: string | null;
}

interface DashboardFeedback {
  _id: string;
  interviewId: string;
  userId: string;
  overallScore: number | null;
  technicalScore: number | null;
  communicationScore: number | null;
  strengths: string[];
  improvements: string[];
  summary: string | null;
  createdAt: string;
}

/**
 * Calculate consecutive practice-day streak.
 */
function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const dayKeys = new Set(
    dates.map((dateString) => {
      const date = new Date(dateString);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    })
  );

  const sortedDays = Array.from(dayKeys)
    .map((key) => {
      const [year, month, day] = key.split("-").map(Number);

      return new Date(
        year,
        month - 1,
        day
      ).getTime();
    })
    .sort((a, b) => b - a);

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const todayMs = today.getTime();
  const oneDayMs = 86400000;

  // If the most recent practice was before yesterday,
  // the streak is broken.
  if (sortedDays[0] < todayMs - oneDayMs) {
    return 0;
  }

  let streak = 0;

  let expectedDay =
    sortedDays[0] >= todayMs
      ? todayMs
      : todayMs - oneDayMs;

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

  const [interviews, setInterviews] = useState<
    DashboardInterview[]
  >([]);

  const [feedbackRecords, setFeedbackRecords] = useState<
    DashboardFeedback[]
  >([]);

  const [loading, setLoading] = useState(true);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [interviewToDelete, setInterviewToDelete] =
    useState<DashboardInterview | null>(null);

  const [deleting, setDeleting] = useState(false);

  /**
   * Load dashboard data from MongoDB API.
   */
  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;

      console.log(
        "[Dashboard] Loading MongoDB data for user:",
        user.id
      );

      setLoading(true);

      try {
        const response = await fetch("/api/dashboard", {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        console.log(
          "[Dashboard] API response:",
          data
        );

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Failed to load dashboard data"
          );
        }

        setInterviews(data.interviews || []);
        setFeedbackRecords(
          data.feedbackRecords || []
        );
      } catch (error) {
        console.error(
          "[Dashboard] Failed to load data:",
          error
        );

        setInterviews([]);
        setFeedbackRecords([]);
      } finally {
        setLoading(false);
      }
    }

    if (user && !authLoading) {
      void loadDashboardData();
    }
  }, [user, authLoading]);

  /**
   * Open delete confirmation dialog.
   */
  const handleDeleteClick = (
    interview: DashboardInterview
  ) => {
    setInterviewToDelete(interview);
    setDeleteDialogOpen(true);
  };

  /**
   * Cancel deletion.
   */
  const handleCancelDelete = () => {
    if (deleting) return;

    setDeleteDialogOpen(false);
    setInterviewToDelete(null);
  };

  /**
   * Delete interview.
   *
   * NOTE:
   * The MongoDB delete API will be connected
   * in the next step.
   */
  const handleConfirmDelete = async () => {
    if (!user || !interviewToDelete) return;

    setDeleting(true);

    const interviewId = interviewToDelete._id;

    try {
      console.log(
        "[Dashboard] Deleting interview:",
        interviewId
      );

      const response = await fetch(
        `/api/interviews/${interviewId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Could not delete interview"
        );
      }

      // Remove from local state
      setInterviews((current) =>
        current.filter(
          (interview) =>
            interview._id !== interviewId
        )
      );

      setFeedbackRecords((current) =>
        current.filter(
          (feedback) =>
            feedback.interviewId !== interviewId
        )
      );

      console.log(
        "[Dashboard] Interview deleted successfully:",
        interviewId
      );

      setDeleteDialogOpen(false);
      setInterviewToDelete(null);
    } catch (error) {
      console.error(
        "[Dashboard] Delete interview error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while deleting the interview."
      );
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <LoadingSpinner
          size="lg"
          text="Loading dashboard..."
        />
      </div>
    );
  }

  /**
   * ================================
   * STATS
   * ================================
   */

  const completedCount = interviews.length;

  /**
   * Average score from feedback records.
   */
  const scoredFeedback =
    feedbackRecords.filter(
      (feedback) =>
        typeof feedback.overallScore === "number"
    );

  const avgScore =
    scoredFeedback.length > 0
      ? `${Math.round(
          scoredFeedback.reduce(
            (total, feedback) =>
              total +
              (feedback.overallScore || 0),
            0
          ) / scoredFeedback.length
        )}%`
      : "—";

  /**
   * Total practice time.
   */
  const totalSeconds = interviews.reduce(
    (sum, interview) =>
      sum +
      (interview.durationSeconds || 0),
    0
  );

  const totalTimeMinutes = Math.round(
    totalSeconds / 60
  );

  const totalTimeDisplay =
    totalTimeMinutes >= 60
      ? `${Math.floor(
          totalTimeMinutes / 60
        )}h ${
          totalTimeMinutes % 60
        }m`
      : `${totalTimeMinutes} min`;

  /**
   * Practice streak.
   */
  const streakCount = calculateStreak(
    interviews.map(
      (interview) => interview.createdAt
    )
  );

  const streakDisplay = `${streakCount} ${
    streakCount === 1 ? "day" : "days"
  }`;

  /**
   * Latest interview with feedback.
   */
  const latestInterview = interviews.find(
    (interview) => interview.feedback
  );

  const stats = [
    {
      icon: BarChart3,
      label: "Interviews Completed",
      value: String(completedCount),
      color:
        "from-blue-500 to-cyan-500",
    },
    {
      icon: Target,
      label: "Average Score",
      value: avgScore,
      color:
        "from-violet-500 to-fuchsia-500",
    },
    {
      icon: Clock,
      label: "Total Practice Time",
      value: totalTimeDisplay,
      color:
        "from-emerald-500 to-green-500",
    },
    {
      icon: Award,
      label: "Streak",
      value: streakDisplay,
      color:
        "from-orange-500 to-red-500",
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
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mb-12"
          >
            <h1 className="text-4xl font-black md:text-5xl">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {user?.name ||
                  user?.email ||
                  "Nexly User"}
              </span>
            </h1>

            <p className="mt-3 text-lg text-slate-400">
              Ready to ace your next interview?
              Let&apos;s get started.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.1,
                  }}
                  className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}
                  >
                    <Icon size={22} />
                  </div>

                  <p className="text-3xl font-bold">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.3,
            }}
            className="mb-12"
          >
            <h2 className="mb-6 text-2xl font-bold">
              Quick Actions
            </h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/interview"
                className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 p-6 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <PlayCircle
                  size={32}
                  className="mb-4 text-blue-400"
                />

                <h3 className="text-lg font-bold">
                  Start Interview
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Begin a new practice interview
                  session
                </p>
              </Link>

              <Link
                href="/resume"
                className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 p-6 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10"
              >
                <FileText
                  size={32}
                  className="mb-4 text-violet-400"
                />

                <h3 className="text-lg font-bold">
                  Analyze Resume
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Upload your resume for AI
                  analysis
                </p>
              </Link>

              <Link
                href="/profile"
                className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-emerald-600/10 to-green-600/10 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <User
                  size={32}
                  className="mb-4 text-emerald-400"
                />

                <h3 className="text-lg font-bold">
                  View Profile
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Manage your account settings
                </p>
              </Link>
            </div>
          </motion.div>

          {/* Recent Interviews */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.4,
            }}
            className="mb-12 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Recent Interviews
              </h2>

              {interviews.length > 5 && (
                <span className="text-sm text-slate-500">
                  Showing latest 5
                </span>
              )}
            </div>

            {interviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3
                  size={48}
                  className="mb-4 text-slate-600"
                />

                <p className="text-lg text-slate-400">
                  No interviews completed yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Complete your first interview
                  to see it here
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
                {interviews
                  .slice(0, 5)
                  .map((item) => {
                    const durationMin =
                      item.durationSeconds
                        ? Math.round(
                            item.durationSeconds /
                              60
                          )
                        : 0;

                    const durationDisplay =
                      durationMin >= 60
                        ? `${Math.floor(
                            durationMin / 60
                          )}h ${
                            durationMin % 60
                          }m`
                        : `${durationMin} min`;

                    return (
                      <div
                        key={item._id}
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-5 transition-all duration-300 hover:border-slate-700 sm:flex-row sm:items-center"
                      >
                        {/* Interview information */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-lg font-semibold text-white">
                              {item.role}
                            </span>

                            <span className="rounded-full bg-slate-700/60 px-3 py-1 text-xs capitalize text-slate-300">
                              {
                                item.interviewType
                              }
                            </span>

                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs capitalize text-blue-400">
                              {
                                item.difficulty
                              }
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                            <span>
                              {new Date(
                                item.createdAt
                              ).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>

                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {
                                durationDisplay
                              }
                            </span>
                          </div>
                        </div>

                        {/* Score + Delete */}
                        <div className="flex items-center gap-3">
                          {typeof item.score ===
                            "number" && (
                            <div
                              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                                item.score >= 80
                                  ? "border border-green-500/30 bg-green-500/10 text-green-400"
                                  : item.score >=
                                    60
                                  ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                                  : "border border-red-500/30 bg-red-500/10 text-red-400"
                              }`}
                            >
                              {item.score}/100
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteClick(
                                item
                              )
                            }
                            disabled={deleting}
                            aria-label={`Delete ${item.role} interview`}
                            title="Delete interview"
                            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-400 transition-all duration-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2
                              size={17}
                              className="transition-transform duration-300 group-hover:scale-110"
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </motion.div>

          {/* Latest AI Feedback */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.5,
            }}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl"
          >
            <h2 className="mb-6 text-2xl font-bold">
              Latest AI Feedback
            </h2>

            {latestInterview ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xl font-bold text-white">
                        {
                          latestInterview.role
                        }
                      </span>

                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium capitalize text-blue-400">
                        {
                          latestInterview.difficulty
                        }
                      </span>
                    </div>

                    {latestInterview.feedback
                      ?.summary && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">
                        {
                          latestInterview
                            .feedback
                            .summary
                        }
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      Completed on{" "}
                      {new Date(
                        latestInterview.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  {typeof latestInterview.score ===
                    "number" && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 px-6 py-4">
                      <span className="text-3xl font-black text-blue-400">
                        {
                          latestInterview.score
                        }
                      </span>

                      <span className="text-xs text-slate-400">
                        Overall Score
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Award
                  size={48}
                  className="mb-4 text-slate-600"
                />

                <p className="text-lg text-slate-400">
                  No interviews completed yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Complete your first interview
                  to see AI feedback here
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

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          title="Delete Interview?"
          message={
            interviewToDelete
              ? `Are you sure you want to delete your "${interviewToDelete.role}" interview? This will permanently remove the interview and its AI feedback. This action cannot be undone.`
              : "Are you sure you want to delete this interview?"
          }
          confirmLabel="Delete Interview"
          cancelLabel="Keep Interview"
          variant="danger"
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </main>
    </ProtectedRoute>
  );
}