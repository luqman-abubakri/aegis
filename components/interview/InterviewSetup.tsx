"use client";

import { useState } from "react";
import { ArrowRight, Mic, Type, ShieldCheck } from "lucide-react";
import type {
  Difficulty,
  InterviewConfig,
  InterviewMode,
  InterviewType,
} from "@/types";

interface InterviewSetupProps {
  onStart: (config: InterviewConfig) => void | Promise<void>;
  initialRole?: string;
  initialMode?: InterviewMode;
}

const ROLES = [
  "Frontend",
  "Backend",
  "Full Stack",
  "Mobile",
  "UI/UX",
  "DevOps",
];

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];
const INTERVIEW_TYPES: { value: InterviewType; label: string; icon: React.ReactNode }[] = [
  { value: "technical", label: "Technical", icon: <Mic size={28} /> },
  { value: "behavioral", label: "Behavioral", icon: <Type size={28} /> },
  { value: "system-design", label: "System Design", icon: <Type size={28} /> },
];

const INTERVIEW_MODES: { value: InterviewMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "voice",
    label: "Voice Interview",
    description: "Answer out loud with live transcription.",
    icon: <Mic size={28} />,
  },
  {
    value: "text",
    label: "Text Interview",
    description: "Type each answer at your own pace.",
    icon: <Type size={28} />,
  },
];

export function InterviewSetup({
  onStart,
  initialRole = "",
  initialMode = "text",
}: InterviewSetupProps) {
  const [role, setRole] = useState(initialRole);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [interviewType, setInterviewType] = useState<InterviewType | "">("");
  const [mode, setMode] = useState<InterviewMode>(initialMode);

  const ready = role && difficulty && interviewType && mode;

  const handleStart = () => {
    if (!ready) return;
    void onStart({
      role,
      interviewType: interviewType as InterviewType,
      difficulty: difficulty as Difficulty,
      mode,
    });
  };

  return (
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
        <h2 className="mb-6 text-2xl font-bold">Select Role</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {ROLES.map((r) => {
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
                <span className="text-lg font-semibold">{r}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Select Difficulty */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">Select Difficulty</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {DIFFICULTIES.map((d) => {
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
                <p className="text-lg font-semibold capitalize">{d}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interview Type */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">Interview Type</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {INTERVIEW_TYPES.map(({ value, label, icon }) => {
            const isActive = interviewType === value;
            return (
              <button
                key={value}
                onClick={() => setInterviewType(value)}
                className={`flex items-center gap-5 rounded-2xl border p-6 text-left transition-all duration-300 ${
                  isActive
                    ? "border-blue-500 bg-blue-500/10 shadow-lg"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                    isActive ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-lg font-semibold">{label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interview Mode */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">Interview Mode</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {INTERVIEW_MODES.map(({ value, label, description, icon }) => {
            const isActive = mode === value;
            return (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`flex items-center gap-5 rounded-2xl border p-6 text-left transition-all duration-300 ${
                  isActive
                    ? "border-blue-500 bg-blue-500/10 shadow-lg"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                    isActive ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-lg font-semibold">{label}</p>
                  <p className="mt-1 text-sm text-slate-400">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-600/10 via-cyan-600/5 to-blue-600/10 p-8 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm text-slate-400">Estimated Duration</p>
            <p className="text-xl font-bold">15–20 minutes</p>
          </div>

          <button
            onClick={handleStart}
            disabled={!ready}
            className={`inline-flex items-center gap-3 rounded-xl px-8 py-4 font-semibold transition-all duration-300 ${
              ready
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 hover:shadow-lg"
                : "cursor-not-allowed bg-slate-800 opacity-50"
            }`}
          >
            Start Interview
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

