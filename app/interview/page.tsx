"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { useAuth } from "@/contexts/AuthProvider";
import type { InterviewConfig } from "@/types";

export default function InterviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [initialRole, setInitialRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestResumeTitle() {
      try {
        const response = await fetch("/api/resume", {
          credentials: "include",
        });
        const payload = await response.json();
        const latestResume = payload.resumes?.find(
          (resume: { analysis?: unknown }) => resume.analysis
        );

        if (latestResume?.analysis) {
          const analysis = latestResume.analysis as {
            professionalTitle?: string;
            careerDomain?: string;
          };

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
      } finally {
        setLoading(false);
      }
    }

    if (user && !authLoading) {
      void fetchLatestResumeTitle();
    }
  }, [user, authLoading]);

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
      <main className="min-h-screen bg-[#020817] pb-20 pt-28 text-white">
        {!loading && (
          <InterviewSetup
            onStart={handleStart}
            initialRole={initialRole}
          />
        )}
      </main>
    </ProtectedRoute>
  );
}