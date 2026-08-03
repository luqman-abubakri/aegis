"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import type { InterviewConfig } from "@/types";

export default function InterviewPage() {
  const router = useRouter();

  const handleStart = useCallback(
    (config: InterviewConfig) => {
      const params = new URLSearchParams({
        role: config.role,
        difficulty: config.difficulty,
        interviewType: config.interviewType,
        mode: config.mode,
      });
      router.push(`/interview/session?${params.toString()}`);
    },
    [router]
  );

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#020817] pb-20 pt-28 text-white">
        <InterviewSetup onStart={handleStart} />
      </main>
    </ProtectedRoute>
  );
}
