"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/services/auth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthProvider";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { setAuthenticatedUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setFormError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(normalizedEmail, password);

      if (!result.success) {
        setFormError(result.message || "Login failed");
        return;
      }

      if (!result.user) {
        throw new Error("Signed in without a user session.");
      }

      setAuthenticatedUser(result.user);

      router.push("/dashboard");
    } catch (error) {
      console.error("[Sign In] Unexpected error:", error);

      setFormError("Something went wrong while signing in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF9F6] px-5 py-20 text-[#111111]">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(17,17,17,.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(17,17,17,.08) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-lg border border-[#D9D9D4] bg-white p-8 hard-card sm:p-10"
      >
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <img src="/logo.png" alt="Intervyou.ai" className="h-16 w-32 object-contain" />

          <h1 className="mt-6 text-3xl font-black">
            Welcome Back
          </h1>

          <p className="mt-2 text-center text-[#666666]">
            Sign in to continue your AI interview preparation journey.
          </p>
        </div>

        {/* Error Message */}
        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
          >
            {formError}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="mb-2 block text-sm text-[#666666]">
              Email Address
            </label>

            <div className="hard-edge flex items-center border border-[#D9D9D4] bg-white px-4 transition focus-within:border-[#F97316]">
              <Mail className="text-[#888888]" size={20} />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-transparent px-3 py-4 text-[#111111] outline-none placeholder:text-[#888888]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm text-[#666666]">
              Password
            </label>

            <div className="hard-edge flex items-center border border-[#D9D9D4] bg-white px-4 transition focus-within:border-[#F97316]">
              <Lock className="text-[#888888]" size={20} />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-transparent px-3 py-4 text-[#111111] outline-none placeholder:text-[#888888]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#888888] transition hover:text-[#111111]"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-[#666666]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-[#F97316]"
              />
              Remember Me
            </label>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="hard-edge group flex w-full items-center justify-center gap-3 bg-[#F97316] py-4 font-semibold text-white transition-colors duration-300 hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Sign In
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#D9D9D4]" />
          <span className="text-sm text-[#888888]">OR</span>
          <div className="h-px flex-1 bg-[#D9D9D4]" />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[#666666]">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-[#F97316] transition hover:text-[#EA580C]"
          >
            Create Account
          </Link>
        </div>
      </motion.div>
    </main>
  );
}