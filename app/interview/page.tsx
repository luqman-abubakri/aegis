"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ShieldCheck, ArrowRight, Mic, Type } from "lucide-react";
import Link from "next/link";

const roles = [
  "Frontend",
  "Backend",
  "Full Stack",
  "Mobile",
  "UI/UX",
  "DevOps",
];

const difficulties = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

export default function InterviewPage() {
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [intType, setIntType] = useState("");

  const ready = role && difficulty && intType;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#020817] pt-28 pb-20 text-white">
        <div className="mx-auto max-w-5xl px-5">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2 text-sm text-blue-300 backdrop-blur-md">
              <ShieldCheck size={16} />
              Configure Your Interview
            </div>

            <h1 className="text-4xl font-black md:text-5xl">
              Set Up Your{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Practice Interview
              </span>
            </h1>

            <p className="mt-4 text-lg text-slate-400">
              Choose your role, difficulty, and interview type to begin.
            </p>
          </div>

          {/* Select Role */}
          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold">
              Select Role
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {roles.map((r) => {
                const isActive = role === r;

                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300 ${
                      isActive
                        ? "border-blue-500 bg-blue-500/10 shadow-lg"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        isActive ? "bg-blue-600" : "bg-slate-800"
                      }`}
                    >
                      <Mic size={22} />
                    </div>

                    <span className="text-lg font-semibold">
                      {r}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Difficulty */}
          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold">
              Select Difficulty
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              {difficulties.map((d) => {
                const isActive = difficulty === d;

                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded-2xl border p-6 text-center transition-all duration-300 ${
                      isActive
                        ? "border-blue-500 bg-blue-500/10 shadow-lg"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-lg font-semibold">
                      {d}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interview Type */}
          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold">
              Interview Type
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
              <button
                onClick={() => setIntType("voice")}
                className={`flex items-center gap-5 rounded-2xl border p-6 text-left transition-all duration-300 ${
                  intType === "voice"
                    ? "border-blue-500 bg-blue-500/10 shadow-lg"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                    intType === "voice"
                      ? "bg-blue-600"
                      : "bg-slate-800"
                  }`}
                >
                  <Mic size={28} />
                </div>

                <div>
                  <p className="text-lg font-semibold">
                    Voice Interview
                  </p>

                  <p className="text-sm text-slate-400">
                    Realistic conversation with AI
                  </p>
                </div>
              </button>

              <button
                onClick={() => setIntType("text")}
                className={`flex items-center gap-5 rounded-2xl border p-6 text-left transition-all duration-300 ${
                  intType === "text"
                    ? "border-blue-500 bg-blue-500/10 shadow-lg"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                    intType === "text"
                      ? "bg-blue-600"
                      : "bg-slate-800"
                  }`}
                >
                  <Type size={28} />
                </div>

                <div>
                  <p className="text-lg font-semibold">
                    Text Interview
                  </p>

                  <p className="text-sm text-slate-400">
                    Typed responses
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-600/10 via-cyan-600/5 to-blue-600/10 p-8 backdrop-blur-xl">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-sm text-slate-400">
                  Estimated Duration
                </p>

                <p className="text-xl font-bold">
                  15–20 minutes
                </p>
              </div>

              <Link
                href={ready ? "/interview/session" : "#"}
                className={`inline-flex items-center gap-3 rounded-xl px-8 py-4 font-semibold transition-all duration-300 ${
                  ready
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 hover:shadow-lg"
                    : "cursor-not-allowed bg-slate-800 opacity-50"
                }`}
              >
                Start Interview
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}