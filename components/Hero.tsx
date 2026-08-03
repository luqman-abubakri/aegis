"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Mic,
  FileText,
  Brain,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

const features = [
  {
    icon: Mic,
    title: "AI Voice Interviews",
    color:
      "hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300 hover:shadow-blue-500/20",
  },
  {
    icon: FileText,
    title: "Resume Analysis",
    color:
      "hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300 hover:shadow-violet-500/20",
  },
  {
    icon: Brain,
    title: "Personalized Feedback",
    color:
      "hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-cyan-500/20",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    color:
      "hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 hover:shadow-emerald-500/20",
  },
];

const Hero = () => {
  const { user } = useAuth();
  const targetHref = user ? "/interview" : "/sign-up";

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Glow */}
        <div className="absolute left-1/2 top-0 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[170px]" />

        <div className="absolute right-0 bottom-0 h-[350px] w-[350px] rounded-full bg-cyan-500/5 blur-[120px]" />

        {/* Grid */}
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

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-5xl text-center"
      >
        {/* Badge */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="mb-8 inline-flex cursor-pointer items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2 text-sm font-medium text-blue-300 backdrop-blur-md"
        >
          🚀 AI-Powered Technical Interview Preparation
        </motion.div>

        {/* Heading */}
        <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-7xl lg:text-8xl">
          Ace Every
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Technical Interview
          </span>
        </h1>

        {/* Description */}
        <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-400 md:text-xl">
          Practice realistic mock interviews, improve your communication,
          receive intelligent feedback, analyze your resume, and build the
          confidence you need to land your next tech role.
        </p>

        {/* Buttons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
          <Link href={targetHref}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-500/30"
            >
              <span>{user ? "Start Practice Interview" : "Start Free Interview"}</span>
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </motion.div>
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-20 flex flex-wrap items-center justify-center gap-5">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                whileHover={{
                  y: -6,
                  scale: 1.05,
                }}
                transition={{
                  type: "spring",
                  stiffness: 250,
                }}
                className={`group flex cursor-pointer items-center gap-3 rounded-full border border-slate-800 bg-slate-900/50 px-6 py-3 text-slate-400 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl ${feature.color}`}
              >
                <Icon
                  size={18}
                  className="transition-transform duration-300 group-hover:rotate-12"
                />
                <span className="font-medium">
                  {feature.title}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;