"use client";

import {
  ArrowUp,
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
    <footer className="relative w-full border-t border-[#111111] bg-white text-[#111111]">
      <div className="relative mx-auto max-w-[1440px] px-6 py-12 sm:px-8 lg:px-20">
        {/* Main footer */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Brand */}
          <div className="group max-w-md">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <div className="flex h-10 w-[132px] items-center justify-start">
                <img
                  src="/logo.png"
                  alt="Intervyou.ai"
                  className="h-auto w-full object-contain object-left"
                />
              </div>
            </div>

            <p className="mt-4 text-center text-sm leading-6 text-[#666666] lg:text-left">
              AI-powered interview preparation designed to help you
              prepare smarter, practice better, and perform with confidence.
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            <div className="group flex items-center gap-2 text-sm text-[#666666] transition-colors duration-200 hover:text-[#F97316]">
              <Sparkles
                size={16}
                className="text-[#F97316] transition-transform duration-200 group-hover:scale-110"
              />
              <span>AI Powered</span>
            </div>

            <div className="group flex items-center gap-2 text-sm text-[#666666] transition-colors duration-200 hover:text-[#F97316]">
              <Code2
                size={16}
                className="text-[#F97316] transition-transform duration-200 group-hover:scale-110"
              />
              <span>Real Interviews</span>
            </div>

            <div className="group flex items-center gap-2 text-sm text-[#666666] transition-colors duration-200 hover:text-[#F97316]">
              <CheckCircle2
                size={16}
                className="text-[#F97316] transition-transform duration-200 group-hover:scale-110"
              />
              <span>Instant Feedback</span>
            </div>
          </div>

          {/* Back to top */}
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="group mx-auto flex items-center gap-2 border border-[#111111] px-4 py-3 text-sm text-[#111111] transition-colors duration-300 hover:bg-[#111111] hover:text-white lg:mx-0"
          >
            <span>Back to top</span>

            <ArrowUp
              size={16}
              className="transition-transform duration-300 group-hover:-translate-y-1"
            />
          </button>
        </div>

        {/* Divider */}
        <div className="my-8 h-px w-full bg-[#111111]" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-[#666666] sm:flex-row">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-medium text-[#111111]">Intervyou.ai</span>. All
            rights reserved.
          </p>

          <div className="flex items-center gap-2">
            <span>Built for better interviews</span>

            <span className="h-1 w-1 bg-[#F97316]" />

            <span className="text-[#F97316]">
              Prepare. Practice. Perform.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;