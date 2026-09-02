"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/services/auth";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Password validation rules
  const passwordRules = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid =
    passwordRules.minLength &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Check required fields
    if (!name.trim() || !email.trim() || !password) {
      setFormError("Please fill in all fields");
      return;
    }

    // Validate password
    if (!isPasswordValid) {
      setFormError(
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, and number."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(
        name.trim(),
        email.trim(),
        password
      );

      if (!result.success) {
        setFormError(result.message || "Registration failed");
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Signup error:", error);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817] px-5 py-20 text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[160px]" />

        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
      >
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/30">
            <BrainCircuit size={34} />
          </div>

          <h1 className="mt-6 text-3xl font-black">
            Create Your Account
          </h1>

          <p className="mt-2 text-center text-slate-400">
            Start preparing for technical interviews with your AI
            interview coach.
          </p>
        </div>

        {/* Error Message */}
        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm leading-relaxed text-red-400"
          >
            {formError}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Full Name
            </label>

            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4 transition focus-within:border-blue-500">
              <User
                className="shrink-0 text-slate-500"
                size={20}
              />

              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFormError("");
                }}
                placeholder="John Doe"
                autoComplete="name"
                className="w-full bg-transparent px-3 py-4 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Email Address
            </label>

            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4 transition focus-within:border-blue-500">
              <Mail
                className="shrink-0 text-slate-500"
                size={20}
              />

              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-transparent px-3 py-4 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Password
            </label>

            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4 transition focus-within:border-blue-500">
              <Lock
                className="shrink-0 text-slate-500"
                size={20}
              />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError("");
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-transparent px-3 py-4 outline-none placeholder:text-slate-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="shrink-0 text-slate-500 transition hover:text-white"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            {/* Password Requirements */}
            {password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <p className="mb-2 text-xs font-medium text-slate-400">
                  Password requirements
                </p>

                <PasswordRule
                  valid={passwordRules.minLength}
                  text="At least 8 characters"
                />

                <PasswordRule
                  valid={passwordRules.uppercase}
                  text="At least one uppercase letter"
                />

                <PasswordRule
                  valid={passwordRules.lowercase}
                  text="At least one lowercase letter"
                />

                <PasswordRule
                  valid={passwordRules.number}
                  text="At least one number"
                />
              </motion.div>
            )}
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-4 font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Create Account

                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-blue-400 transition hover:text-cyan-400"
          >
            Sign In
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

/**
 * Password requirement indicator
 */
function PasswordRule({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-colors ${
        valid ? "text-green-400" : "text-slate-500"
      }`}
    >
      {valid ? (
        <Check size={14} />
      ) : (
        <X size={14} />
      )}

      <span>{text}</span>
    </div>
  );
}