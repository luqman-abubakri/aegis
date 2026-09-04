"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Brain,
  FileText,
  BarChart3,
  Clock3,
  BrainCircuit,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

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
    icon: BrainCircuit,
    title: "Personal Learning Roadmap",
    description:
      "After every interview, Nexly generates a personalized roadmap to improve your technical skills.",
    color: "from-indigo-500 to-violet-500",
  },
];

const steps = [
  "Choose your interview role and difficulty.",
  "Complete a realistic AI-powered interview.",
  "Receive detailed feedback and improve.",
];

const FeatureCarousel = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(track.children) as HTMLElement[];
    const card = cards[index];

    if (!card) return;

    track.scrollTo({
      left: card.offsetLeft - track.offsetLeft,
      behavior: "smooth",
    });

    setActiveIndex(index);
  }, []);

  const handlePrev = useCallback(() => {
    const previousIndex =
      activeIndex === 0 ? features.length - 1 : activeIndex - 1;

    scrollToIndex(previousIndex);
  }, [activeIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    const nextIndex =
      activeIndex === features.length - 1 ? 0 : activeIndex + 1;

    scrollToIndex(nextIndex);
  }, [activeIndex, scrollToIndex]);

  // Track currently centered card
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame: number;

    const onScroll = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const cards = Array.from(track.children) as HTMLElement[];

        if (!cards.length) return;

        const trackCenter = track.scrollLeft + track.offsetWidth / 2;

        let closest = 0;
        let closestDist = Infinity;

        cards.forEach((card, i) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const dist = Math.abs(cardCenter - trackCenter);

          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });

        setActiveIndex(closest);
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (isInteracting) return;

    const interval = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [handleNext, isInteracting]);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onTouchStart={() => setIsInteracting(true)}
      onTouchEnd={() => setIsInteracting(false)}
    >
      <div
        ref={trackRef}
        className="scrollbar-none flex w-full gap-4 overflow-x-auto scroll-smooth px-5 pb-4 [scroll-snap-type:x_mandatory] sm:gap-6 sm:px-[calc((100%-380px)/2)] xl:px-[calc((100%-1160px)/2)]"
        style={{
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.06,
                duration: 0.5,
              }}
              viewport={{
                once: true,
                amount: 0.4,
              }}
              className="w-[calc(100vw-40px)] max-w-[380px] flex-none rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl sm:w-[380px] sm:p-8"
              style={{
                scrollSnapAlign: "center",
              }}
            >
              <div
                className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br sm:mb-8 sm:h-16 sm:w-16 ${feature.color}`}
              >
                <Icon size={26} className="sm:h-[30px] sm:w-[30px]" />
              </div>

              <h2 className="text-xl font-bold leading-tight sm:text-2xl">
                {feature.title}
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-400 sm:mt-5 sm:text-base sm:leading-8">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-center gap-4 sm:mt-8 sm:gap-6">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous feature"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition-colors hover:border-blue-500/40 hover:text-white sm:h-10 sm:w-10"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {features.map((feature, i) => (
            <button
              key={feature.title}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to ${feature.title}`}
              className="p-1.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? "w-6 bg-blue-400"
                    : "w-1.5 bg-slate-700"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next feature"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition-colors hover:border-blue-500/40 hover:text-white sm:h-10 sm:w-10"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

const stepContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
    },
  },
};

const stepItemVariants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function FeaturesPage() {
  const { user } = useAuth();
  const ctaHref = user ? "/interview" : "/sign-up";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020817] text-white">
      {/* Hero */}
      <section className="mx-auto flex max-w-7xl flex-col items-center px-5 pt-20 pb-8 text-center sm:px-6 sm:pt-24 sm:pb-10 md:pt-28 lg:pt-36">
        <motion.h1
          initial={{
            opacity: 0,
            y: 35,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
          }}
          className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:mt-8 sm:text-5xl sm:leading-tight md:text-7xl"
        >
          Everything You Need To
          <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Ace Technical Interviews
          </span>
        </motion.h1>

        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.2,
          }}
          className="mt-6 max-w-3xl text-base leading-7 text-slate-400 sm:mt-8 sm:text-lg sm:leading-8"
        >
          Nexly combines AI-powered interviews, resume analysis, personalized
          coaching, and progress tracking into one platform built specifically
          for aspiring tech professionals.
        </motion.p>
      </section>

      {/* Features carousel */}
      <section className="mt-20 sm:mt-28">
        <FeatureCarousel />
      </section>

      {/* How It Works */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          amount: 0.3,
        }}
        variants={stepContainerVariants}
        className="mx-auto mt-28 max-w-6xl px-5 text-center sm:mt-36 sm:px-6"
      >
        <motion.h2
          variants={stepItemVariants}
          className="text-3xl font-bold leading-tight sm:text-4xl"
        >
          How Nexly Works In Three Simple Steps
        </motion.h2>

        <div className="mt-10 grid gap-5 sm:mt-16 sm:gap-10 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step}
              variants={stepItemVariants}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8"
            >
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold sm:mb-6 sm:h-14 sm:w-14 sm:text-xl">
                {i + 1}
              </div>

              <p className="text-sm leading-7 text-slate-400 sm:text-base sm:leading-8">
                {step}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <section className="mx-auto my-16 max-w-5xl px-5 text-center sm:my-28 lg:my-36">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-600/20 via-cyan-600/10 to-blue-600/20 p-6 sm:p-10 lg:rounded-[40px] lg:p-14">
          <h2 className="break-words text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Ready to Build
            <span className="block">Interview Confidence?</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:mt-5 sm:text-lg sm:leading-8">
            Start practicing today with Nexly and prepare for your next
            technical interview with confidence.
          </p>

          <Link
            href={ctaHref}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:bg-blue-500 sm:mt-10 sm:w-auto sm:px-10 sm:text-base"
          >
            {user ? "Start Practice Interview" : "Start Free Interview"}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}