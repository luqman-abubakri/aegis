"use client";

import Link from "next/link";
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Reference to the entire navbar
  const navRef = useRef<HTMLElement>(null);

  // Close mobile menu when clicking outside the navbar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return;

      const target = event.target as Node;

      if (navRef.current && !navRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
      setOpen(false);
      router.push("/");
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <header
      ref={navRef}
      className="fixed top-0 z-50 w-full border-b border-[#111111] bg-white"
    >
      <nav className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-6 sm:px-8 lg:px-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-[132px] items-center justify-start">
            <img
              src="/logo.png"
              alt="Intervyou.ai"
              className="h-auto w-full object-contain object-left"
            />
          </div>

          <span className="sr-only">Intervyou.ai</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-4 lg:flex">
          {loading ? (
            <>
              <div className="h-10 w-28 animate-pulse bg-[#eeeeeb]" />
              <div className="h-10 w-32 animate-pulse bg-[#eeeeeb]" />
            </>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="nav-link border border-[#111111] px-5 py-2 text-sm font-semibold text-[#111111]"
              >
                Dashboard
              </Link>

              <Link
                href="/profile"
                className="nav-link flex items-center gap-2 border border-[#111111] px-5 py-2 text-sm font-semibold text-[#111111]"
              >
                <UserIcon size={16} />
                Profile
              </Link>

              <button
                onClick={requestLogout}
                className="flex items-center gap-2 border border-[#111111] px-5 py-2 text-sm font-semibold text-[#111111] transition-colors hover:border-[#EA580C] hover:bg-[#EA580C] hover:text-white"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="nav-link border border-[#111111] px-5 py-2 text-sm font-semibold text-[#111111]"
              >
                Sign In
              </Link>

              <Link
                href="/sign-up"
                className="hard-edge bg-[#F97316] px-5 py-2 text-sm font-semibold text-white hover:bg-[#EA580C]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-[#111111] transition hover:bg-[#FAF9F6] lg:hidden"
          aria-label="Toggle Menu"
          aria-expanded={open}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-[#111111] bg-white lg:hidden">
          <div className="flex flex-col gap-4 px-5 py-6">
            {loading ? (
              <>
                <div className="h-12 w-full animate-pulse bg-[#eeeeeb]" />
                <div className="h-12 w-full animate-pulse bg-[#eeeeeb]" />
              </>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="nav-link w-full border border-[#111111] py-3 text-center font-semibold text-[#111111]"
                >
                  Dashboard
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="nav-link flex w-full items-center justify-center gap-2 border border-[#111111] py-3 font-semibold text-[#111111]"
                >
                  <UserIcon size={16} />
                  Profile
                </Link>

                <button
                  onClick={requestLogout}
                  className="flex w-full items-center justify-center gap-2 border border-[#111111] py-3 font-semibold text-[#111111] transition-colors hover:border-[#EA580C] hover:bg-[#EA580C] hover:text-white"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="nav-link w-full border border-[#111111] py-3 text-center font-semibold text-[#111111]"
                >
                  Sign In
                </Link>

                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="hard-edge w-full bg-[#F97316] py-3 text-center font-semibold text-white hover:bg-[#EA580C]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        variant="danger"
        loading={loggingOut}
        onConfirm={() => void confirmLogout()}
        onCancel={() => {
          if (!loggingOut) {
            setShowLogoutConfirm(false);
          }
        }}
      />
    </header>
  );
};

export default Navbar;