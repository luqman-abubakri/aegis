"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { ResumeAnalysis, ResumeGeneratedInterview } from "@/types";
import {
  FileText,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Loader2,
  FileCheck2,
  PlayCircle,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import {
  fetchCached,
  getCached,
  invalidateCached,
  setCached,
} from "@/lib/clientCache";

interface ResumeRecord {
  id: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  uploadedAt: string;
  analysis:
    | (ResumeAnalysis & {
        generatedInterview?: ResumeGeneratedInterview;
      })
    | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const RESUME_INTERVIEW_STORAGE_KEY = "aegis_resume_interview";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchResumes(userId: string): Promise<ResumeRecord[]> {
  return fetchCached(`resumes:${userId}`, async () => {
    const response = await fetch("/api/resume", {
      credentials: "include",
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Failed to load resumes.");
    }

    return payload.resumes as ResumeRecord[];
  });
}

export default function ResumePage() {
  const { user, loading: authLoading } = useAuth();

  const resumeCacheKey = user ? `resumes:${user.id}` : "";
  const [resumes, setResumes] = useState<ResumeRecord[]>(
    () => getCached<ResumeRecord[]>(resumeCacheKey) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [analysisStatus, setAnalysisStatus] = useState<string>("Idle");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<ResumeRecord | null>(
    null,
  );

  const [expandedResumeId, setExpandedResumeId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /*
   * Auto-hide success/error messages
   */
  useEffect(() => {
    if (!error && !success) {
      return;
    }

    const timer = window.setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [error, success]);

  /*
   * Load resumes
   */
  useEffect(() => {
    async function loadResumes() {
      if (!user) {
        return;
      }

      try {
        setResumes(await fetchResumes(user.id));
      } catch (err) {
        console.error("[Resume] Failed to load resumes:", err);
      }
    }

    if (user) {
      void loadResumes();
    }
  }, [user, authLoading]);

  /*
   * Upload and analyze resume
   */
  const handleFile = useCallback(
    async (file: File) => {
      if (!user) return;

      setError(null);
      setSuccess(null);

      // Validate file type
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        setError("Please upload a PDF file only.");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError("File size must be less than 5MB.");
        return;
      }

      setUploading(true);
      setUploadProgress(10);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const progressInterval = window.setInterval(() => {
          setUploadProgress((prev) => (prev < 90 ? prev + 5 : prev));
        }, 200);

        const uploadResponse = await fetch("/api/resume", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        window.clearInterval(progressInterval);

        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload.success) {
          throw new Error(uploadPayload.message || "Resume upload failed.");
        }

        const resumeId = uploadPayload.resume?.id as string | undefined;
        if (!resumeId) {
          throw new Error("Resume upload did not return an ID.");
        }

        /*
         * Start analysis state
         */
        setUploading(false);
        setAnalyzing(true);
        setSuccess(
          "Resume uploaded successfully. Analyzing your resume now...",
        );
        setUploadProgress(100);
        setActiveResumeId(resumeId);
        setAnalysisStatus("Analyzing Resume...");
        setAnalysisProgress(40);

        /*
         * Analyze resume
         */
        const response = await fetch("/api/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "analyze",
            resumeId,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);

          throw new Error(payload?.message ?? "Resume analysis failed.");
        }

        await response.json();

        setAnalysisStatus("Complete");
        setAnalysisProgress(100);
        setSuccess(
          "Resume analyzed successfully. Your interview has been prepared.",
        );

        /*
         * Refresh resume list
         */
        invalidateCached(resumeCacheKey);
        setResumes(await fetchResumes(user.id));
      } catch (err: unknown) {
        console.error("[Resume] Upload/analysis failed:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });

        const message =
          err instanceof Error ? err.message : "Failed to upload resume.";

        setError(message);
        setAnalysisStatus("Failed");
      } finally {
        setUploading(false);
        setAnalyzing(false);

        window.setTimeout(() => {
          setUploadProgress(0);
        }, 1000);
      }
    },
    [user],
  );

  /*
   * Analyze an existing resume
   */
  const handleAnalyze = useCallback(
    async (resume: ResumeRecord) => {
      if (!user) return;

      setError(null);
      setSuccess(null);
      setAnalyzing(true);
      setActiveResumeId(resume.id);
      setAnalysisStatus("Analyzing Resume...");
      setAnalysisProgress(40);

      console.log("[Resume] Analyzing existing resume:", {
        userId: user.id,
        resumeId: resume.id,
        fileName: resume.fileName,
      });

      try {
        const response = await fetch("/api/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "analyze",
            resumeId: resume.id,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);

          throw new Error(payload?.message ?? "Resume analysis failed.");
        }

        await response.json();

        setAnalysisStatus("Complete");
        setAnalysisProgress(100);
        setSuccess(
          "Resume analyzed successfully. Your interview has been prepared.",
        );

        /*
         * Refresh list
         */
        invalidateCached(resumeCacheKey);
        setResumes(await fetchResumes(user.id));
      } catch (err: unknown) {
        console.error("[Resume] Analysis failed:", {
          userId: user.id,
          resumeId: resume.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });

        const message =
          err instanceof Error ? err.message : "Failed to analyze resume.";

        setError(message);
        setAnalysisStatus("Failed");
      } finally {
        setAnalyzing(false);

        window.setTimeout(() => {
          setAnalysisProgress(0);
        }, 1000);
      }
    },
    [user],
  );

  /*
   * Drag and drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setDragActive(false);

      if (uploading || analyzing) return;

      const file = e.dataTransfer.files?.[0];

      if (file) {
        void handleFile(file);
      }
    },
    [handleFile, uploading, analyzing],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  /*
   * Delete resume
   */
  const handleDelete = useCallback(
    async (resume: ResumeRecord) => {
      if (!user) return;

      setDeleting(true);

      console.log("[Resume] Deleting resume:", {
        userId: user.id,
        resumeId: resume.id,
      });

      try {
        const response = await fetch("/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "delete", resumeId: resume.id }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Failed to delete resume.");
        }

        setResumes((prev) => {
          const nextResumes = prev.filter((r) => r.id !== resume.id);
          setCached(resumeCacheKey, nextResumes);
          return nextResumes;
        });

        setSuccess("Resume deleted successfully.");
      } catch (err: unknown) {
        console.error("[Resume] Delete failed:", {
          userId: user.id,
          resumeId: resume.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });

        const message =
          err instanceof Error ? err.message : "Failed to delete resume.";

        setError(message);
      } finally {
        setDeleting(false);
        setResumeToDelete(null);
      }
    },
    [user],
  );

  /*
   * Start resume-generated interview
   */
  const goToResumeInterview = useCallback(
    (resume: ResumeRecord) => {
      const analysis = resume.analysis;

      const generatedInterview = analysis?.generatedInterview;

      window.localStorage.setItem(
        RESUME_INTERVIEW_STORAGE_KEY,
        JSON.stringify({
          title: generatedInterview?.title ?? "Resume-Based Interview",
          description: generatedInterview?.description ?? "",
          questions: generatedInterview?.questions ?? [],
        }),
      );

      const role = encodeURIComponent(
        analysis?.professionalTitle || analysis?.careerDomain || "Candidate",
      );

      router.push(
        `/interview/session?role=${role}&difficulty=intermediate&interviewType=technical&mode=text&resumeInterview=1`,
      );
    },
    [router],
  );

  /*
   * Loading state
   */
  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6]">
          <LoadingSpinner size="lg" text="Loading resume page..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen overflow-x-hidden bg-[#FAF9F6] pb-20 pt-28 text-[#111111]">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          {/* Back */}
          <Link
            href="/dashboard"
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#666666] transition-colors hover:text-[#111111]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex items-center gap-2 border border-orange-200 bg-orange-50 px-5 py-2 text-sm text-[#F97316]">
              <FileText size={16} />
              Resume Analysis
            </div>

            <h1 className="text-3xl font-black sm:text-4xl md:text-5xl">
              Upload Your <span className="text-[#F97316]">Resume</span>
            </h1>

            <p className="mt-4 text-lg text-[#666666]">
              Upload your PDF resume and we will store it securely for analysis.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle size={18} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mb-10 rounded-3xl border-2 border-dashed p-6 text-center transition-all duration-300 sm:p-8 lg:p-12 ${
              dragActive
                ? "border-[#F97316] bg-orange-50"
                : "border-[#F97316] bg-white hover:border-[#EA580C]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleInputChange}
              className="hidden"
              disabled={uploading || analyzing}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-[#F97316]" />

                <p className="text-lg font-semibold text-white">Uploading...</p>

                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#D9D9D4]">
                  <div
                    className="h-full rounded-full bg-[#F97316] transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>

                <p className="text-sm text-[#666666]">{uploadProgress}%</p>
              </div>
            ) : analyzing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-[#F97316]" />

                <p className="text-lg font-semibold text-white">
                  Analyzing Resume...
                </p>

                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#D9D9D4]">
                  <div
                    className="h-full rounded-full bg-[#F97316] transition-all duration-300"
                    style={{
                      width: `${analysisProgress}%`,
                    }}
                  />
                </div>

                <p className="text-sm text-[#666666]">{analysisStatus}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center text-[#F97316]">
                  <UploadCloud size={40} className="text-[#F97316]" />
                </div>

                <div>
                  <p className="text-xl font-bold">
                    Drag & drop your resume here
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    or click to browse files
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="hard-edge mt-2 inline-flex items-center gap-2 bg-[#F97316] px-6 py-3 font-semibold text-white hover:bg-[#EA580C]"
                >
                  <UploadCloud size={18} />
                  Select PDF File
                </button>

                <p className="text-xs text-[#888888]">PDF only · Max 5MB</p>
              </div>
            )}
          </div>

          {/* Analysis Pipeline */}
          {activeResumeId && (
            <div className="mb-8 min-w-0 overflow-hidden border border-[#D9D9D4] bg-white p-6 hard-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#F97316]">
                    Resume Analysis Pipeline
                  </p>

                  <p className="text-sm text-[#666666]">
                    Uploading, extracting text, analyzing, and generating your
                    interview.
                  </p>
                </div>

                <div className="border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-[#F97316]">
                  {analysisStatus}
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#D9D9D4]">
                <div
                  className="h-full rounded-full bg-[#F97316] transition-all duration-300"
                  style={{
                    width: `${analysisProgress}%`,
                  }}
                />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-[#666666] md:grid-cols-5">
                {[
                  "Uploading Resume...",
                  "Extracting Text...",
                  "Analyzing Resume...",
                  "Generating Interview...",
                  "Complete",
                ].map((step, index) => {
                  const isComplete =
                    analysisStatus === "Complete" ||
                    analysisProgress >= (index + 1) * 20;

                  return (
                    <div
                      key={step}
                      className={`rounded-2xl border px-3 py-2 ${
                        isComplete
                          ? "border-orange-200 bg-orange-50 text-[#F97316]"
                          : "border-[#D9D9D4] bg-[#F1F1EE] text-[#666666]"
                      }`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Uploaded Resumes */}
          <div className="border border-[#D9D9D4] bg-white p-6 hard-card sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Uploaded Resumes</h2>

                <p className="text-sm text-[#666666]">
                  Review your resumes and launch a tailored interview instantly.
                </p>
              </div>

              <div className="border border-[#D9D9D4] bg-[#F1F1EE] px-3 py-1 text-sm text-[#666666]">
                {resumes.length} uploaded
              </div>
            </div>

            {resumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText size={48} className="mb-4 text-slate-600" />

                <p className="text-lg text-[#666666]">
                  No resumes uploaded yet
                </p>

                <p className="mt-2 text-sm text-[#888888]">
                  Upload your first resume to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => {
                  const analysis = resume.analysis;

                  const hasAnalysis = Boolean(analysis);

                  const isExpanded = expandedResumeId === resume.id;

                  return (
                    <div key={resume.id} className="space-y-2">
                      {/* Resume Card */}
                      <div className="flex flex-col gap-4 border border-[#D9D9D4] bg-[#F1F1EE] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F97316]">
                            <FileCheck2 size={24} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="break-words font-semibold text-[#111111]">
                              {resume.fileName || "Untitled"}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              {resume.fileSize && (
                                <span>{formatBytes(resume.fileSize)}</span>
                              )}

                              <span>
                                {new Date(resume.uploadedAt).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </span>
                            </div>

                            {hasAnalysis && (
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                                  Score {analysis?.overallScore ?? 0}
                                </span>

                                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-300">
                                  ATS {analysis?.atsScore ?? 0}
                                </span>

                                {analysis?.generatedInterview?.questions
                                  ?.length ? (
                                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[#F97316]">
                                    {
                                      analysis.generatedInterview.questions
                                        .length
                                    }{" "}
                                    questions ready
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                          {hasAnalysis ? (
                            <button
                              type="button"
                              onClick={() => goToResumeInterview(resume)}
                              disabled={analyzing || deleting || uploading}
                              className="hard-edge inline-flex w-full items-center justify-center gap-2 border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#F97316] transition-all hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              <PlayCircle size={16} />
                              Resume Interview
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleAnalyze(resume)}
                              disabled={analyzing || deleting || uploading}
                              className="hard-edge inline-flex w-full items-center justify-center gap-2 border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#F97316] transition-all hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              {analyzing && activeResumeId === resume.id ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <BrainCircuit size={16} />
                                  Analyze
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setResumeToDelete(resume)}
                            disabled={analyzing || deleting || uploading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>

                          {hasAnalysis && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedResumeId(
                                  isExpanded ? null : resume.id,
                                )
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-300 transition-all duration-300 hover:bg-slate-700/50 sm:w-auto"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={16} />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={16} />
                                  Show Details
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Analysis */}
                      {hasAnalysis && isExpanded && (
                        <div className="mt-3 border-2 border-black bg-white text-sm text-black shadow-[6px_6px_0_0_#000]">
                          {/* Header: who the candidate is */}
                          <div className="border-b-4 border-[#F97316] bg-black px-6 py-5 text-white">
                            <h3 className="text-xl font-bold">
                              {analysis?.candidateName || "N/A"}
                            </h3>
                            <p className="mt-1 text-white/70">
                              {analysis?.professionalTitle || "N/A"}
                            </p>
                          </div>

                          {/* Key facts */}
                          <dl className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black">
                            <div className="px-6 py-4">
                              <dt className="text-xs text-black/50">Domain</dt>
                              <dd className="mt-0.5 font-semibold">
                                {analysis?.careerDomain || "N/A"}
                              </dd>
                            </div>
                            <div className="px-6 py-4">
                              <dt className="text-xs text-black/50">Level</dt>
                              <dd className="mt-0.5 font-semibold">
                                {analysis?.careerLevel || "N/A"}
                              </dd>
                            </div>
                          </dl>

                          <div className="space-y-8 p-6">
                            {/* Summary */}
                            {analysis?.summary && (
                              <section>
                                <h4 className="mb-2 border-l-8 border-[#F97316] pl-3 text-base font-bold">
                                  Summary
                                </h4>
                                <p className="max-w-prose leading-relaxed text-black/70">
                                  {analysis.summary}
                                </p>
                              </section>
                            )}

                            {/* Skills */}
                            <section>
                              <h4 className="mb-3 border-l-8 border-[#F97316] pl-3 text-base font-bold">
                                Skills
                              </h4>

                              <div className="space-y-4">
                                {analysis?.technicalSkills &&
                                  analysis.technicalSkills.length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-semibold text-black/50">
                                        Technical
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {analysis.technicalSkills.map(
                                          (skill, idx) => (
                                            <span
                                              key={`technical-${idx}`}
                                              className="border-2 border-black bg-black px-2.5 py-1 text-xs font-bold text-white"
                                            >
                                              {skill}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {analysis?.softSkills &&
                                  analysis.softSkills.length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-semibold text-black/50">
                                        Soft
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {analysis.softSkills.map(
                                          (skill, idx) => (
                                            <span
                                              key={`soft-${idx}`}
                                              className="border-2 border-black bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000]"
                                            >
                                              {skill}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {analysis?.missingSkills &&
                                  analysis.missingSkills.length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-semibold text-[#F97316]">
                                        Missing
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {analysis.missingSkills.map(
                                          (skill, idx) => (
                                            <span
                                              key={`missing-${idx}`}
                                              className="border-2 border-black bg-[#F97316] px-2.5 py-1 text-xs font-bold text-black"
                                            >
                                              {skill}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </section>

                            {/* Strengths + Weaknesses */}
                            {((analysis?.strengths &&
                              analysis.strengths.length > 0) ||
                              (analysis?.weaknesses &&
                                analysis.weaknesses.length > 0)) && (
                              <div className="grid gap-8 md:grid-cols-2">
                                {analysis?.strengths &&
                                  analysis.strengths.length > 0 && (
                                    <section>
                                      <h4 className="mb-3 border-l-8 border-[#F97316] pl-3 text-base font-bold">
                                        Strengths
                                      </h4>
                                      <ul className="space-y-2">
                                        {analysis.strengths.map((str, idx) => (
                                          <li
                                            key={idx}
                                            className="flex gap-3 text-black/80"
                                          >
                                            <span className="mt-1.5 h-3 w-3 shrink-0 border-2 border-black bg-[#F97316]" />
                                            <span>{str}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </section>
                                  )}

                                {analysis?.weaknesses &&
                                  analysis.weaknesses.length > 0 && (
                                    <section>
                                      <h4 className="mb-3 border-l-8 border-black pl-3 text-base font-bold">
                                        Weaknesses
                                      </h4>
                                      <ul className="space-y-2">
                                        {analysis.weaknesses.map((wk, idx) => (
                                          <li
                                            key={idx}
                                            className="flex gap-3 text-black/80"
                                          >
                                            <span className="mt-1.5 h-3 w-3 shrink-0 border-2 border-black bg-white" />
                                            <span>{wk}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </section>
                                  )}
                              </div>
                            )}

                            {/* Experience */}
                            {analysis?.experience &&
                              analysis.experience.length > 0 && (
                                <section>
                                  <h4 className="mb-4 border-l-8 border-[#F97316] pl-3 text-base font-bold">
                                    Experience
                                  </h4>
                                  <ol className="ml-1 border-l-2 border-black">
                                    {analysis.experience.map(
                                      (exp: any, idx: number) => (
                                        <li
                                          key={idx}
                                          className="relative pb-5 pl-6 last:pb-0"
                                        >
                                          <span className="absolute -left-[7px] top-1.5 h-3 w-3 border-2 border-black bg-[#F97316]" />
                                          <p className="font-semibold">
                                            {exp.role}
                                          </p>
                                          <p className="text-black/70">
                                            {exp.organization}
                                          </p>
                                          <p className="mt-0.5 text-xs text-black/50">
                                            {exp.dates}
                                          </p>
                                          {exp.description && (
                                            <p className="mt-2 max-w-prose text-black/70">
                                              {exp.description}
                                            </p>
                                          )}
                                        </li>
                                      ),
                                    )}
                                  </ol>
                                </section>
                              )}

                            {/* Education */}
                            {analysis?.education &&
                              analysis.education.length > 0 && (
                                <section>
                                  <h4 className="mb-4 border-l-8 border-[#F97316] pl-3 text-base font-bold">
                                    Education
                                  </h4>
                                  <ul className="divide-y-2 divide-black border-y-2 border-black">
                                    {analysis.education.map(
                                      (edu: any, idx: number) => (
                                        <li
                                          key={idx}
                                          className="flex flex-wrap items-baseline justify-between gap-x-4 py-3"
                                        >
                                          <div>
                                            <p className="font-semibold">
                                              {edu.degree}
                                            </p>
                                            <p className="text-black/70">
                                              {edu.institution}
                                            </p>
                                          </div>
                                          <p className="text-xs text-black/50">
                                            {edu.dates}
                                          </p>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </section>
                              )}

                            {/* Projects */}
                            {analysis?.projects &&
                              analysis.projects.length > 0 && (
                                <section>
                                  <h4 className="mb-4 border-l-8 border-[#F97316] pl-3 text-base font-bold">
                                    Projects
                                  </h4>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    {analysis.projects.map(
                                      (proj: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#F97316]"
                                        >
                                          <p className="font-semibold">
                                            {proj.name}
                                          </p>

                                          {proj.description && (
                                            <p className="mt-1 text-xs leading-relaxed text-black/70">
                                              {proj.description}
                                            </p>
                                          )}

                                          {proj.technologies &&
                                            proj.technologies.length > 0 && (
                                              <div className="mt-3 flex flex-wrap gap-1.5">
                                                {proj.technologies.map(
                                                  (tech: string, i: number) => (
                                                    <span
                                                      key={i}
                                                      className="border border-black bg-black px-1.5 py-0.5 text-[11px] font-bold text-white"
                                                    >
                                                      {tech}
                                                    </span>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </section>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={resumeToDelete !== null}
        title="Delete Resume"
        message={`Are you sure you want to delete "${
          resumeToDelete?.fileName ?? "this resume"
        }"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => {
          if (resumeToDelete) {
            void handleDelete(resumeToDelete);
          }
        }}
        onCancel={() => {
          if (!deleting) {
            setResumeToDelete(null);
          }
        }}
      />
    </ProtectedRoute>
  );
}
