"use client"
import {
  ArrowUp,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Sparkles,
} from "lucide-react";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="relative w-full overflow-hidden bg-[#020817] text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-[#2B7FFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-[#2B7FFF]/10 blur-3xl" />

      {/* Top border */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#2B7FFF]/60 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        {/* Main footer */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Brand */}
          <div className="group max-w-md">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2B7FFF]/30 bg-[#2B7FFF]/10 transition-all duration-300 group-hover:border-[#2B7FFF]/60 group-hover:bg-[#2B7FFF]/20 group-hover:shadow-[0_0_25px_rgba(43,127,255,0.2)]">
                <ShieldCheck
                  size={23}
                  className="text-[#2B7FFF] transition-transform duration-300 group-hover:scale-110"
                />
              </div>

              <h2 className="text-2xl font-bold tracking-[0.18em]">
                AEGIS
              </h2>
            </div>

            <p className="mt-4 text-center text-sm leading-6 text-slate-400 lg:text-left">
              AI-powered interview preparation designed to help you
              prepare smarter, practice better, and perform with confidence.
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            <div className="group flex items-center gap-2 text-sm text-slate-400 transition-colors duration-200 hover:text-white">
              <Sparkles
                size={16}
                className="text-[#2B7FFF] transition-transform duration-200 group-hover:scale-110"
              />
              <span>AI Powered</span>
            </div>

            <div className="group flex items-center gap-2 text-sm text-slate-400 transition-colors duration-200 hover:text-white">
              <Code2
                size={16}
                className="text-[#2B7FFF] transition-transform duration-200 group-hover:scale-110"
              />
              <span>Real Interviews</span>
            </div>

            <div className="group flex items-center gap-2 text-sm text-slate-400 transition-colors duration-200 hover:text-white">
              <CheckCircle2
                size={16}
                className="text-[#2B7FFF] transition-transform duration-200 group-hover:scale-110"
              />
              <span>Instant Feedback</span>
            </div>
          </div>

          {/* Back to top */}
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="group mx-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400 transition-all duration-300 hover:border-[#2B7FFF]/40 hover:bg-[#2B7FFF]/10 hover:text-white hover:shadow-[0_0_20px_rgba(43,127,255,0.12)] lg:mx-0"
          >
            <span>Back to top</span>

            <ArrowUp
              size={16}
              className="transition-transform duration-300 group-hover:-translate-y-1"
            />
          </button>
        </div>

        {/* Divider */}
        <div className="my-8 h-px w-full bg-white/[0.08]" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-medium text-slate-400">AEGIS</span>. All
            rights reserved.
          </p>

          <div className="flex items-center gap-2">
            <span>Built for better interviews</span>

            <span className="h-1 w-1 rounded-full bg-[#2B7FFF]" />

            <span className="text-[#2B7FFF]">Prepare. Practice. Perform.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
