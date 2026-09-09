"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { useAuth } from "@/contexts/AuthProvider";
import type { InterviewConfig } from "@/types";
import { fetchCached, getCached } from "@/lib/clientCache";

interface ResumeSummary {
  analysis?: {
    professionalTitle?: string;
    careerDomain?: string;
  } | null;
}

export default function InterviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [initialRole, setInitialRole] = useState<string>("");
  const resumeCacheKey = user ? `resumes:${user.id}` : "";
  useEffect(() => {
    async function fetchLatestResumeTitle() {
      try {
        const resumes = await fetchCached<ResumeSummary[]>(
          resumeCacheKey,
          async () => {
            const response = await fetch("/api/resume", {
              credentials: "include",
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
              throw new Error(payload.message || "Failed to load resumes.");
            }

            return payload.resumes as ResumeSummary[];
          }
        );
        const latestResume = resumes.find((resume) => resume.analysis);

        if (latestResume?.analysis) {
          const analysis = latestResume.analysis;

          if (analysis.professionalTitle) {
            setInitialRole(analysis.professionalTitle);
          } else if (analysis.careerDomain) {
            setInitialRole(analysis.careerDomain);
          }
        }
      } catch (error) {
        console.error(
          "Failed to fetch initial role from resume:",
          error
        );
      }
    }

    if (user && !authLoading) {
      void fetchLatestResumeTitle();
    }
  }, [user, authLoading, resumeCacheKey]);

  const handleStart = useCallback(
    (config: InterviewConfig) => {
      const params = new URLSearchParams({
        role: config.role,
        difficulty: config.difficulty,
        interviewType: config.interviewType,
        mode: config.mode,
        duration: String(config.durationMinutes ?? 20),
      });

      router.push(`/interview/session?${params.toString()}`);
    },
    [router]
  );

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#FAF9F6] pb-20 pt-28 text-[#111111]">
        <InterviewSetup
          onStart={handleStart}
          initialRole={initialRole}
        />
      </main>
    </ProtectedRoute>
  );
}