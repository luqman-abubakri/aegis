"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { InterviewConfig } from "@/types";

export default function InterviewPage() {
  const router = useRouter();
  const [initialRole, setInitialRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchLatestResumeTitle() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("resume_uploads")
          .select("analysis")
          .eq("user_id", user.id)
          .not("analysis", "is", null)
          .order("uploaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.analysis) {
          const analysis = data.analysis as any;
          if (analysis.professionalTitle) {
            setInitialRole(analysis.professionalTitle);
          } else if (analysis.careerDomain) {
            setInitialRole(analysis.careerDomain);
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial role from resume:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLatestResumeTitle();
  }, [supabase]);

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
        {!loading && <InterviewSetup onStart={handleStart} initialRole={initialRole} />}
      </main>
    </ProtectedRoute>
  );
}
