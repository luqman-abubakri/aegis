"use client";

import { motion } from "framer-motion";
import {
  Mic,
  Brain,
  FileText,
  BarChart3,
  Clock3,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "AI Voice Interviews",
    description:
      "Practice realistic technical interviews through natural voice conversations powered by AI.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Brain,
    title: "Smart AI Feedback",
    description:
      "Receive detailed feedback on technical knowledge, communication, confidence, and problem-solving.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: FileText,
    title: "Resume Analysis",
    description:
      "Upload your resume and receive ATS-friendly suggestions, missing skills, and improvement tips.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Monitor interview scores, identify weak areas, and visualize your improvement over time.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Clock3,
    title: "Real-Time Interview Simulation",
    description:
      "Experience timed interviews that replicate the pressure of real technical hiring processes.",
    color: "from-sky-500 to-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Personal Learning Roadmap",
    description:
      "After every interview, Aegis generates a personalized roadmap to improve your technical skills.",
    color: "from-indigo-500 to-violet-500",
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020817] text-white">
      {/* Hero */}
      <section className="mx-auto flex max-w-7xl flex-col items-center px-5 pt-24 pb-10 text-center sm:px-6 md:pt-28 lg:pt-36">
        <motion.h1
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 max-w-4xl text-5xl font-black md:text-7xl"
        >
          Everything You Need To
          <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Ace Technical Interviews
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 max-w-3xl text-lg leading-8 text-slate-400"
        >
          Aegis combines AI-powered interviews, resume analysis, personalized
          coaching, and progress tracking into one platform built specifically
          for aspiring tech professionals.
        </motion.p>
      </section>

      {/* Features */}
      <section className="mx-auto mt-28 grid max-w-7xl gap-8 px-6 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.08,
              }}
              viewport={{ once: true }}
              whileHover={{
                y: -8,
              }}
              className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40"
            >
              <div
                className={`mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color}`}
              >
                <Icon size={30} />
              </div>

              <h2 className="text-2xl font-bold">{feature.title}</h2>

              <p className="mt-5 leading-8 text-slate-400">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </section>

      {/* How It Works */}
      <section className="mx-auto mt-36 max-w-6xl px-6 text-center">
        <h2 className="text-4xl font-bold">How Aegis Works In Three Simple Steps</h2>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {[
            "Choose your interview role and difficulty.",
            "Complete a realistic AI-powered interview.",
            "Receive detailed feedback and improve.",
          ].map((step, i) => (
            <div
              key={i}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8"
            >
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold">
                {i + 1}
              </div>

              <p className="leading-8 text-slate-400">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto my-20 max-w-5xl px-5 text-center sm:my-28 lg:my-36">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-600/20 via-cyan-600/10 to-blue-600/20 p-6 sm:p-10 lg:rounded-[40px] lg:p-14">
          <h2 className="text-3xl font-black leading-tight break-words sm:text-4xl lg:text-5xl">
            Ready to Build
            <span className="block">Interview Confidence?</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Start practicing today with Aegis and prepare for your next
            technical interview with confidence.
          </p>

          <button className="mt-8 w-full rounded-2xl bg-blue-600 px-8 py-4 font-semibold transition-all duration-300 hover:scale-105 hover:bg-blue-500 sm:mt-10 sm:w-auto sm:px-10">
            Start Free Interview
          </button>
        </div>
      </section>
    </main>
  );
}
