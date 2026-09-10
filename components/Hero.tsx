"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FileText,
  MessageCircleCheck,
  MessageSquare,
  Mic,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

const HEADLINE = "Ace every technical interview";

const productIcons = [
  { Icon: FileText, label: "Resume analysis", position: "left-6 top-[18%] max-sm:left-2 max-sm:top-[10%] text-[#F97316]" },
  { Icon: Target, label: "Interview preparation", position: "right-8 top-[16%] max-sm:right-2 max-sm:top-[10%] text-[#F97316]" },
  { Icon: MessageSquare, label: "Interview questions", position: "left-[13%] top-[42%] max-sm:left-1 max-sm:top-[27%] max-[380px]:hidden text-[#EF4444]" },
  { Icon: Mic, label: "Voice interviews", position: "right-[12%] top-[40%] max-sm:right-1 max-sm:top-[27%] max-[380px]:hidden text-[#FACC15]" },
  { Icon: BrainCircuit, label: "AI evaluation", position: "left-[8%] bottom-[22%] max-sm:left-2 max-sm:bottom-[12%] text-[#A855F7]" },
  { Icon: BarChart3, label: "Scores and performance", position: "right-[7%] bottom-[23%] max-sm:right-2 max-sm:bottom-[12%] text-[#A3E635]" },
  { Icon: MessageCircleCheck, label: "AI feedback and coaching", position: "left-[25%] bottom-[11%] text-[#EC4899] hidden sm:block" },
  { Icon: CheckCircle2, label: "Progress and improvement", position: "right-[24%] bottom-[10%] text-[#111111] hidden sm:block" },
];

const Hero = () => {
  const { user } = useAuth();
  const targetHref = user ? "/interview" : "/sign-up";
  const [headline, setHeadline] = useState("");
  const [deletingHeadline, setDeletingHeadline] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!deletingHeadline && headline === HEADLINE) {
        setDeletingHeadline(true);
        return;
      }

      if (deletingHeadline) {
        setHeadline((current) => current.slice(0, -1));
        if (headline.length === 1) {
          setDeletingHeadline(false);
        }
        return;
      }

      setHeadline((current) => HEADLINE.slice(0, current.length + 1));
    }, headline === HEADLINE && !deletingHeadline ? 1800 : deletingHeadline ? 42 : 72);

    return () => clearTimeout(timer);
  }, [headline, deletingHeadline]);

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#FAF9F6] px-6 py-32">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {productIcons.map(({ Icon, label, position }) => (
          <div
            key={label}
            className={`hero-icon absolute max-sm:opacity-65 max-[380px]:opacity-50 ${position}`}
            title={label}
          >
            <Icon size={46} strokeWidth={1.5} />
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl text-center"
        >
          <h1 className="relative text-5xl font-black leading-[1.05] tracking-tight text-[#111111] md:text-6xl lg:text-7xl">
            <span className="invisible">{HEADLINE}</span>
            <span className="absolute inset-0">
              {headline}
              <span className="ml-1 inline-block h-[1em] w-px translate-y-[0.08em] animate-pulse bg-[#F97316] align-baseline" />
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-[#666666]">
            Practice with an interviewer that actually listens — get scored on
            clarity, structure and confidence after every answer, and know
            exactly what to fix before the real thing.
          </p>

          <div className="mt-10 flex justify-center">
            <Link href={targetHref}>
              <motion.div
                className="hard-edge group flex items-center gap-3 bg-[#F97316] px-8 py-4 font-semibold text-white transition-colors hover:bg-[#EA580C]"
              >
                <span>{user ? "Start practice interview" : "Start free interview"}</span>
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;