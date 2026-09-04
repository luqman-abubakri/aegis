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
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

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

async function fetchResumes(): Promise<ResumeRecord[]> {
  const response = await fetch("/api/resume", {
    credentials: "include",
  });
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Failed to load resumes.");
  }

  return payload.resumes as ResumeRecord[];
}

export default function ResumePage() {
  const { user, loading: authLoading } = useAuth();

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [resumeToDelete, setResumeToDelete] =
    useState<ResumeRecord | null>(null);

  const [expandedResumeId, setExpandedResumeId] = useState<string | null>(
    null
  );

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
        setLoading(false);
        return;
      }

      try {
        setResumes(await fetchResumes());
      } catch (err) {
        console.error("[Resume] Failed to load resumes:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      void loadResumes();
    } else if (!authLoading) {
      setLoading(false);
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
          "Resume uploaded successfully. Analyzing your resume now..."
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

          throw new Error(
            payload?.message ?? "Resume analysis failed."
          );
        }

        await response.json();

        setAnalysisStatus("Complete");
        setAnalysisProgress(100);
        setSuccess(
          "Resume analyzed successfully. Your interview has been prepared."
        );

        /*
         * Refresh resume list
         */
        setResumes(await fetchResumes());
      } catch (err: unknown) {
        console.error("[Resume] Upload/analysis failed:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });

        const message =
          err instanceof Error
            ? err.message
            : "Failed to upload resume.";

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
    [user]
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

          throw new Error(
            payload?.message ?? "Resume analysis failed."
          );
        }

        await response.json();

        setAnalysisStatus("Complete");
        setAnalysisProgress(100);
        setSuccess(
          "Resume analyzed successfully. Your interview has been prepared."
        );

        /*
         * Refresh list
         */
        setResumes(await fetchResumes());
      } catch (err: unknown) {
        console.error("[Resume] Analysis failed:", {
          userId: user.id,
          resumeId: resume.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });

        const message =
          err instanceof Error
            ? err.message
            : "Failed to analyze resume.";

        setError(message);
        setAnalysisStatus("Failed");
      } finally {
        setAnalyzing(false);

        window.setTimeout(() => {
          setAnalysisProgress(0);
        }, 1000);
      }
    },
    [user]
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
    [handleFile, uploading, analyzing]
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
    [handleFile]
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

        setResumes((prev) =>
          prev.filter((r) => r.id !== resume.id)
        );

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
          err instanceof Error
            ? err.message
            : "Failed to delete resume.";

        setError(message);
      } finally {
        setDeleting(false);
        setResumeToDelete(null);
      }
    },
    [user]
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
          title:
            generatedInterview?.title ??
            "Resume-Based Interview",
          description:
            generatedInterview?.description ?? "",
          questions:
            generatedInterview?.questions ?? [],
        })
      );

      const role = encodeURIComponent(
        analysis?.professionalTitle ||
          analysis?.careerDomain ||
          "Candidate"
      );

      router.push(
        `/interview/session?role=${role}&difficulty=intermediate&interviewType=technical&mode=text&resumeInterview=1`
      );
    },
    [router]
  );

  /*
   * View PDF
   */
  const handleViewPdf = async (resume: ResumeRecord) => {
    if (!resume.id) return;

    try {
      window.open(
        `/api/resume/${encodeURIComponent(resume.id)}/view`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error("Failed to open PDF", error);
      setError("Failed to open PDF file.");
    }
  };

  /*
   * Loading state
   */
  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-[#020817]">
          <LoadingSpinner
            size="lg"
            text="Loading resume page..."
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen overflow-x-hidden bg-[#020817] pb-20 pt-28 text-white">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          {/* Back */}
          <Link
            href="/dashboard"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-5 py-2 text-sm text-violet-300 backdrop-blur-md">
              <FileText size={16} />
              Resume Analysis
            </div>

            <h1 className="text-3xl font-black sm:text-4xl md:text-5xl">
              Upload Your{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Resume
              </span>
            </h1>

            <p className="mt-4 text-lg text-slate-400">
              Upload your PDF resume and we will store it
              securely for analysis.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertTriangle
                size={18}
                className="flex-shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle
                size={18}
                className="flex-shrink-0"
              />
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
                ? "border-violet-500 bg-violet-500/10"
                : "border-slate-700 bg-slate-900/60 hover:border-violet-500/50"
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
                <Loader2
                  size={48}
                  className="animate-spin text-violet-400"
                />

                <p className="text-lg font-semibold text-white">
                  Uploading...
                </p>

                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>

                <p className="text-sm text-slate-400">
                  {uploadProgress}%
                </p>
              </div>
            ) : analyzing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2
                  size={48}
                  className="animate-spin text-violet-400"
                />

                <p className="text-lg font-semibold text-white">
                  Analyzing Resume...
                </p>

                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-300"
                    style={{
                      width: `${analysisProgress}%`,
                    }}
                  />
                </div>

                <p className="text-sm text-slate-400">
                  {analysisStatus}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-600/20">
                  <UploadCloud
                    size={40}
                    className="text-white"
                  />
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
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/20"
                >
                  <UploadCloud size={18} />
                  Select PDF File
                </button>

                <p className="text-xs text-slate-500">
                  PDF only · Max 5MB
                </p>
              </div>
            )}
          </div>

          {/* Analysis Pipeline */}
          {activeResumeId && (
            <div className="mb-8 min-w-0 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-violet-300">
                    Resume Analysis Pipeline
                  </p>

                  <p className="text-sm text-slate-400">
                    Uploading, extracting text, analyzing,
                    and generating your interview.
                  </p>
                </div>

                <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                  {analysisStatus}
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-300"
                  style={{
                    width: `${analysisProgress}%`,
                  }}
                />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-5">
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
                          ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
                          : "border-slate-800 bg-slate-950/70 text-slate-400"
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
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Uploaded Resumes
                </h2>

                <p className="text-sm text-slate-400">
                  Review your resumes and launch a tailored
                  interview instantly.
                </p>
              </div>

              <div className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-sm text-slate-400">
                {resumes.length} uploaded
              </div>
            </div>

            {resumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText
                  size={48}
                  className="mb-4 text-slate-600"
                />

                <p className="text-lg text-slate-400">
                  No resumes uploaded yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Upload your first resume to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => {
                  const analysis = resume.analysis;

                  const hasAnalysis = Boolean(analysis);

                  const isExpanded =
                    expandedResumeId === resume.id;

                  return (
                    <div
                      key={resume.id}
                      className="space-y-2"
                    >
                      {/* Resume Card */}
                      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                            <FileCheck2 size={24} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="break-words font-semibold text-white">
                              {resume.fileName ||
                                "Untitled"}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              {resume.fileSize && (
                                <span>
                                  {formatBytes(
                                    resume.fileSize
                                  )}
                                </span>
                              )}

                              <span>
                                {new Date(
                                  resume.uploadedAt
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>

                            {hasAnalysis && (
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                                  Score{" "}
                                  {analysis?.overallScore ??
                                    0}
                                </span>

                                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-300">
                                  ATS{" "}
                                  {analysis?.atsScore ?? 0}
                                </span>

                                {analysis?.generatedInterview
                                  ?.questions?.length ? (
                                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-violet-300">
                                    {
                                      analysis
                                        .generatedInterview
                                        .questions
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
                              onClick={() =>
                                goToResumeInterview(
                                  resume
                                )
                              }
                              disabled={
                                analyzing ||
                                deleting ||
                                uploading
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition-all duration-300 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              <PlayCircle size={16} />
                              Resume Interview
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void handleAnalyze(
                                  resume
                                )
                              }
                              disabled={
                                analyzing ||
                                deleting ||
                                uploading
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-300 hover:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              {analyzing &&
                              activeResumeId ===
                                resume.id ? (
                                <>
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
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
                            onClick={() =>
                              void handleViewPdf(resume)
                            }
                            disabled={
                              analyzing ||
                              deleting ||
                              uploading
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition-all duration-300 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            <Eye size={16} />
                            View PDF
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setResumeToDelete(resume)
                            }
                            disabled={
                              analyzing ||
                              deleting ||
                              uploading
                            }
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
                                  isExpanded
                                    ? null
                                    : resume.id
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
                        <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300 shadow-inner">
                          {/* Profile + Skills */}
                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <h3 className="mb-2 text-lg font-bold text-violet-300">
                                Profile
                              </h3>

                              <p>
                                <strong>Name:</strong>{" "}
                                {analysis?.candidateName ||
                                  "N/A"}
                              </p>

                              <p>
                                <strong>Title:</strong>{" "}
                                {analysis?.professionalTitle ||
                                  "N/A"}
                              </p>

                              <p>
                                <strong>Domain:</strong>{" "}
                                {analysis?.careerDomain ||
                                  "N/A"}
                              </p>

                              <p>
                                <strong>Level:</strong>{" "}
                                {analysis?.careerLevel ||
                                  "N/A"}
                              </p>

                              {analysis?.summary && (
                                <p className="mt-2 text-slate-400">
                                  {analysis.summary}
                                </p>
                              )}
                            </div>

                            <div>
                              <h3 className="mb-2 text-lg font-bold text-emerald-300">
                                Skills
                              </h3>

                              <div className="mb-2 flex flex-wrap gap-2">
                                {analysis?.technicalSkills?.map(
                                  (skill, idx) => (
                                    <span
                                      key={`technical-${idx}`}
                                      className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs"
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}

                                {analysis?.softSkills?.map(
                                  (skill, idx) => (
                                    <span
                                      key={`soft-${idx}`}
                                      className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs"
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}
                              </div>

                              {analysis?.missingSkills &&
                                analysis.missingSkills
                                  .length > 0 && (
                                  <>
                                    <h4 className="mb-1 mt-4 text-xs font-semibold text-red-300">
                                      Missing Skills
                                    </h4>

                                    <div className="flex flex-wrap gap-2">
                                      {analysis.missingSkills.map(
                                        (
                                          skill,
                                          idx
                                        ) => (
                                          <span
                                            key={`missing-${idx}`}
                                            className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-300"
                                          >
                                            {skill}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </>
                                )}
                            </div>
                          </div>

                          {/* Strengths + Weaknesses */}
                          <div className="mt-6 grid gap-6 md:grid-cols-2">
                            {analysis?.strengths &&
                              analysis.strengths.length >
                                0 && (
                                <div>
                                  <h3 className="mb-2 text-lg font-bold text-blue-300">
                                    Strengths
                                  </h3>

                                  <ul className="list-inside list-disc space-y-1 text-slate-400">
                                    {analysis.strengths.map(
                                      (str, idx) => (
                                        <li key={idx}>
                                          {str}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                            {analysis?.weaknesses &&
                              analysis.weaknesses.length >
                                0 && (
                                <div>
                                  <h3 className="mb-2 text-lg font-bold text-amber-300">
                                    Weaknesses
                                  </h3>

                                  <ul className="list-inside list-disc space-y-1 text-slate-400">
                                    {analysis.weaknesses.map(
                                      (wk, idx) => (
                                        <li key={idx}>
                                          {wk}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>

                          {/* Experience */}
                          {analysis?.experience &&
                            analysis.experience.length >
                              0 && (
                              <div className="mt-6">
                                <h3 className="mb-3 text-lg font-bold text-indigo-300">
                                  Experience
                                </h3>

                                <div className="space-y-4">
                                  {analysis.experience.map(
                                    (
                                      exp: any,
                                      idx: number
                                    ) => (
                                      <div
                                        key={idx}
                                        className="border-l-2 border-slate-700 pl-4"
                                      >
                                        <p className="font-semibold text-white">
                                          {
                                            exp.role
                                          }{" "}
                                          <span className="font-normal text-slate-400">
                                            at{" "}
                                            {
                                              exp.organization
                                            }
                                          </span>
                                        </p>

                                        <p className="text-xs text-slate-500">
                                          {exp.dates}
                                        </p>

                                        {exp.description && (
                                          <p className="mt-1 text-slate-400">
                                            {
                                              exp.description
                                            }
                                          </p>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Education */}
                          {analysis?.education &&
                            analysis.education.length >
                              0 && (
                              <div className="mt-6">
                                <h3 className="mb-3 text-lg font-bold text-fuchsia-300">
                                  Education
                                </h3>

                                <div className="space-y-4">
                                  {analysis.education.map(
                                    (
                                      edu: any,
                                      idx: number
                                    ) => (
                                      <div
                                        key={idx}
                                        className="border-l-2 border-slate-700 pl-4"
                                      >
                                        <p className="font-semibold text-white">
                                          {
                                            edu.degree
                                          }
                                        </p>

                                        <p className="text-xs text-slate-400">
                                          {
                                            edu.institution
                                          }{" "}
                                          •{" "}
                                          {
                                            edu.dates
                                          }
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Projects */}
                          {analysis?.projects &&
                            analysis.projects.length >
                              0 && (
                              <div className="mt-6">
                                <h3 className="mb-3 text-lg font-bold text-cyan-300">
                                  Projects
                                </h3>

                                <div className="grid gap-4 md:grid-cols-2">
                                  {analysis.projects.map(
                                    (
                                      proj: any,
                                      idx: number
                                    ) => (
                                      <div
                                        key={idx}
                                        className="rounded-lg border border-slate-800 bg-slate-800/30 p-3"
                                      >
                                        <p className="font-semibold text-white">
                                          {
                                            proj.name
                                          }
                                        </p>

                                        {proj.description && (
                                          <p className="mt-1 text-xs text-slate-400">
                                            {
                                              proj.description
                                            }
                                          </p>
                                        )}

                                        {proj.technologies &&
                                          proj
                                            .technologies
                                            .length >
                                            0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {proj.technologies.map(
                                                (
                                                  tech: string,
                                                  i: number
                                                ) => (
                                                  <span
                                                    key={
                                                      i
                                                    }
                                                    className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px]"
                                                  >
                                                    {
                                                      tech
                                                    }
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
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