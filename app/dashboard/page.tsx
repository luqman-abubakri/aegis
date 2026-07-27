"use client";

import { motion } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
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

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const stats = [
    { icon: BarChart3, label: "Interviews Completed", value: "0", color: "from-blue-500 to-cyan-500" },
    { icon: Target, label: "Average Score", value: "—", color: "from-violet-500 to-fuchsia-500" },
    { icon: Clock, label: "Total Practice Time", value: "0 min", color: "from-emerald-500 to-green-500" },
    { icon: Award, label: "Streak", value: "0 days", color: "from-orange-500 to-red-500" },
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
                {user?.name || "Aegis User"}
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
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}>
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

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl"
          >
            <h2 className="mb-6 text-2xl font-bold">Latest AI Feedback</h2>
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
          </motion.div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
