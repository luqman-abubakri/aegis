import React from "react";

const Footer = () => {
  return (
    <footer className="w-full bg-[#020817] text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 sm:px-8 lg:flex-row lg:px-12">
        {/* Brand */}
        <div className="text-center lg:text-left">
          <h2 className="text-2xl font-bold tracking-[0.15em] text-white">
            AEGIS
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            AI-powered interview preparation built to help you prepare,
            practice, and perform with confidence.
          </p>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2B7FFF]" />
            <span className="text-sm font-medium text-[#2B7FFF]">
              Prepare. Practice. Perform.
            </span>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center lg:text-right">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} AEGIS
          </p>

          <p className="mt-1 text-xs text-slate-500">
            All rights reserved.
          </p>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="h-px w-full bg-[#2B7FFF]/30" />
    </footer>
  );
};

export default Footer;