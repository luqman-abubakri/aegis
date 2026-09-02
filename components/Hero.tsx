"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mic, FileText, Brain, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

const features = [
  { icon: Mic, label: "AI Voice Interviews" },
  { icon: FileText, label: "Resume Analysis" },
  { icon: Brain, label: "Personalized Feedback" },
  { icon: TrendingUp, label: "Progress Tracking" },
];

const QUESTION =
  "Walk me through how you'd design a URL shortener that scales to 10M requests a day.";

// Deterministic bar heights (no Math.random — keeps SSR/client output identical)
const WAVEFORM_BARS = Array.from({ length: 28 }, (_, i) => 18 + Math.round(14 * Math.abs(Math.sin(i * 0.7))));

type Phase = "typing" | "listening" | "feedback";

const InterviewPanel = () => {
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    let typeTimer: ReturnType<typeof setInterval>;
    let phaseTimer: ReturnType<typeof setTimeout>;
    let loopTimer: ReturnType<typeof setTimeout>;

    const run = () => {
      setCharCount(0);
      setPhase("typing");

      typeTimer = setInterval(() => {
        setCharCount((c) => {
          if (c >= QUESTION.length) {
            clearInterval(typeTimer);
            return c;
          }
          return c + 1;
        });
      }, 28);

      phaseTimer = setTimeout(() => {
        setPhase("listening");
        loopTimer = setTimeout(() => {
          setPhase("feedback");
        }, 2400);
      }, QUESTION.length * 28 + 400);
    };

    run();
    const restart = setInterval(run, 9500);

    return () => {
      clearInterval(typeTimer);
      clearTimeout(phaseTimer);
      clearTimeout(loopTimer);
      clearInterval(restart);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: -6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
      className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Session in progress
        </div>
      </div>

      {/* body */}
      <div className="min-h-[220px] px-6 py-6">
        <div className="mb-1 text-xs font-medium text-blue-400">Interviewer</div>
        <p className="font-mono text-[15px] leading-relaxed text-slate-200">
          {QUESTION.slice(0, charCount)}
          {phase === "typing" && (
            <span className="ml-0.5 inline-block h-4 w-[7px] translate-y-0.5 animate-pulse bg-blue-400 align-middle" />
          )}
        </p>

        <AnimatePresence mode="wait">
          {phase === "listening" && (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <div className="mb-2 text-xs font-medium text-cyan-400">You — speaking</div>
              <div className="flex h-10 items-end gap-[3px]">
                {WAVEFORM_BARS.map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full bg-gradient-to-t from-cyan-500/40 to-cyan-300"
                    animate={{ height: [h * 0.3, h, h * 0.3] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.035,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {phase === "feedback" && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 space-y-3"
            >
              <div className="text-xs font-medium text-violet-400">Live feedback</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Structure", value: "Strong", tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
                  { label: "Clarity", value: "92%", tone: "text-blue-300 border-blue-500/30 bg-blue-500/10" },
                  { label: "Filler words", value: "Low", tone: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" },
                ].map((tag) => (
                  <span
                    key={tag.label}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${tag.tone}`}
                  >
                    {tag.label} · {tag.value}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const Hero = () => {
  const { user } = useAuth();
  const targetHref = user ? "/interview" : "/sign-up";

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-24">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[10%] top-0 h-[550px] w-[550px] rounded-full bg-blue-500/10 blur-[170px]" />
        <div className="absolute right-0 bottom-0 h-[350px] w-[350px] rounded-full bg-cyan-500/5 blur-[120px]" />
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

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-xl text-center lg:text-left"
        >
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-slate-500 lg:justify-start">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
            </span>
            Practicing right now with engineers at 200+ companies
          </div>

          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
            Ace every
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              technical interview
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-lg text-lg leading-8 text-slate-400 lg:mx-0">
            Practice with an interviewer that actually listens — get scored on
            clarity, structure and confidence after every answer, and know
            exactly what to fix before the real thing.
          </p>

          <div className="mt-10 flex justify-center lg:justify-start">
            <Link href={targetHref}>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition-shadow hover:shadow-blue-500/30"
              >
                <span>{user ? "Start practice interview" : "Start free interview"}</span>
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </motion.div>
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 lg:justify-start">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={feature.label} className="flex items-center gap-2">
                  <Icon size={16} className="text-slate-500" />
                  <span className="text-sm text-slate-400">{feature.label}</span>
                  {i < features.length - 1 && (
                    <span className="ml-5 hidden h-4 w-px bg-slate-800 lg:inline-block" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Right: live interview panel */}
        <div className="flex w-full justify-center lg:w-auto">
          <InterviewPanel />
        </div>
      </div>
    </section>
  );
};

export default Hero;