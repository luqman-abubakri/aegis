"use client";

import Link from "next/link";
import { Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/30 transition-transform duration-300 hover:scale-110">
            <ShieldCheck size={24} className="text-white" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-wide text-white">
              AEGIS
            </h1>
            <p className="text-xs text-slate-400">
              AI Interview Coach
            </p>
          </div>
        </Link>

        {/* Desktop Buttons */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/sign-in"
            className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-medium text-slate-300 transition-all duration-300 hover:border-blue-500 hover:bg-slate-900 hover:text-blue-400"
          >
            Sign In
          </Link>

          <Link
            href="/sign-up"
            className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 hover:shadow-blue-500/40"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 transition hover:bg-slate-800 lg:hidden"
          aria-label="Toggle Menu"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-4 px-5 py-6">
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl border border-slate-700 py-3 text-center font-medium text-slate-300 transition-all duration-300 hover:border-blue-500 hover:bg-slate-900 hover:text-blue-400"
            >
              Sign In
            </Link>

            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-center font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:scale-[1.02]"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;