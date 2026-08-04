"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
import Link from "next/link";

interface ResumeRecord {
  id: string;
  file_name: string | null;
  file_size: number | null;
  file_path: string | null;
  uploaded_at: string;
  analysis: ResumeAnalysis & { generatedInterview?: ResumeGeneratedInterview } | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const RESUME_INTERVIEW_STORAGE_KEY = "aegis_resume_interview";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [resumeToDelete, setResumeToDelete] = useState<ResumeRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  useEffect(() => {
    async function loadResumes() {
      if (!user) return;

      console.log("[Resume] Loading resumes for user:", user.id);

      try {
        const { data, error } = await supabase
          .from("resume_uploads")
          .select("*")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });

        console.log("[Resume] Fetch response:", {
          userId: user.id,
          count: data?.length ?? 0,
          error: error
            ? { message: error.message, code: error.code }
            : null,
        });

        if (error) {
          console.error("[Resume] Fetch failed:", {
            message: error.message,
            code: error.code,
            details: error.details,
          });
        } else if (data) {
          setResumes(data as ResumeRecord[]);
        }
      } catch (err) {
        console.error("[Resume] Unexpected fetch error:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadResumes();
    }
  }, [user, authLoading]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!user) return;

      setError(null);
      setSuccess(null);

      // Validate file type
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
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
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        // Path within the "resumes" bucket: {user_id}/{timestamp}.{ext}
        // The storage RLS policy checks that the first path segment
        // matches auth.uid(), so we must NOT prefix with "resumes/".
        const filePath = fileName;

        console.log("[Resume] Uploading file:", {
          userId: user.id,
          fileName: file.name,
          fileSize: file.size,
          bucketPath: filePath,
        });

        // Simulate progress while uploading (Supabase JS SDK does not expose progress events)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => (prev < 90 ? prev + 5 : prev));
        }, 200);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        clearInterval(progressInterval);

        console.log("[Resume] Storage upload response:", {
          path: uploadData?.path ?? null,
          error: uploadError
            ? { message: uploadError.message, name: uploadError.name }
            : null,
        });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Check for existing resume to prevent duplicates (UPSERT pattern)
        const { data: existingResume } = await supabase
          .from("resume_uploads")
          .select("id, file_path")
          .eq("user_id", user.id)
          .maybeSingle();

        let resumeId: string;

        if (existingResume) {
          // Update existing record instead of creating a duplicate
          console.log("[Resume] Updating existing resume record:", {
            existingId: existingResume.id,
            oldFilePath: existingResume.file_path,
          });

          // Delete old file from storage if path differs
          if (existingResume.file_path && existingResume.file_path !== filePath) {
            const { error: oldFileDeleteError } = await supabase.storage
              .from("resumes")
              .remove([existingResume.file_path]);

            if (oldFileDeleteError) {
              console.error("[Resume] Failed to delete old storage file:", {
                message: oldFileDeleteError.message,
                oldPath: existingResume.file_path,
              });
            }
          }

          const { data: updateData, error: updateError } = await supabase
            .from("resume_uploads")
            .update({
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
              analysis: null,
              parsed_data: null,
            })
            .eq("id", existingResume.id)
            .select("id")
            .single();

          console.log("[Resume] Update response:", {
            id: updateData?.id ?? null,
            error: updateError
              ? { message: updateError.message, code: updateError.code }
              : null,
          });

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }

          resumeId = updateData.id;
        } else {
          // No existing resume, insert new record
          const insertPayload = {
            user_id: user.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
          };

          console.log("[Resume] Inserting metadata:", {
            table: "resume_uploads",
            payload: insertPayload,
          });

          const { data: insertData, error: dbError } = await supabase
            .from("resume_uploads")
            .insert(insertPayload)
            .select("id")
            .single();

          console.log("[Resume] Insert response:", {
            id: insertData?.id ?? null,
            error: dbError
              ? { message: dbError.message, code: dbError.code }
              : null,
          });

          if (dbError) {
            throw new Error(`Database insert failed: ${dbError.message}`);
          }

          resumeId = insertData.id;
        }

        // Upload complete — switch to analyzing state
        setUploading(false);
        setAnalyzing(true);
        setSuccess("Resume uploaded successfully. Analyzing your resume now...");
        setUploadProgress(100);
        setActiveResumeId(resumeId);
        setAnalysisStatus("Analyzing Resume...");
        setAnalysisProgress(40);

        const response = await fetch("/api/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? "")}`,
          },
          body: JSON.stringify({
            action: "analyze",
            resumeId,
            filePath,
            fileName: file.name,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Resume analysis failed.");
        }

        await response.json();
        setAnalysisStatus("Complete");
        setAnalysisProgress(100);
        setSuccess("Resume analyzed successfully. Your interview has been prepared.");

        // Refresh the list
        const { data: refreshed, error: refreshError } = await supabase
          .from("resume_uploads")
          .select("*")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });

        if (refreshError) {
          console.error("[Resume] Refresh query failed:", {
            message: refreshError.message,
            code: refreshError.code,
            details: refreshError.details,
          });
        } else if (refreshed) {
          setResumes(refreshed as ResumeRecord[]);
        }
      } catch (err: unknown) {
        console.error("[Resume] Upload/analysis failed:", {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });
        const message = err instanceof Error ? err.message : "Failed to upload resume.";
        setError(message);
        setAnalysisStatus("Failed");
      } finally {
        setUploading(false);
        setAnalyzing(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [user]
  );

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
        filePath: resume.file_path,
        fileName: resume.file_name,
      });

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token ?? "";

        const response = await fetch("/api/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: "analyze",
            resumeId: resume.id,
            filePath: resume.file_path,
            fileName: resume.file_name,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Resume analysis failed.");
        }

        await response.json();
        setAnalysisStatus("Complete");
        setAnalysisProgress(100);
        setSuccess("Resume analyzed successfully. Your interview has been prepared.");

        // Refresh the list
        const { data: refreshed, error: refreshError } = await supabase
          .from("resume_uploads")
          .select("*")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });

        if (refreshError) {
          console.error("[Resume] Refresh query failed:", {
            message: refreshError.message,
            code: refreshError.code,
            details: refreshError.details,
          });
        } else if (refreshed) {
          setResumes(refreshed as ResumeRecord[]);
        }
      } catch (err: unknown) {
        console.error("[Resume] Analysis failed:", {
          userId: user.id,
          resumeId: resume.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });
        const message = err instanceof Error ? err.message : "Failed to analyze resume.";
        setError(message);
        setAnalysisStatus("Failed");
      } finally {
        setAnalyzing(false);
        setTimeout(() => setAnalysisProgress(0), 1000);
      }
    },
    [user]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (uploading || analyzing) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
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
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDelete = useCallback(
    async (resume: ResumeRecord) => {
      if (!user) return;

      setDeleting(true);

      console.log("[Resume] Deleting resume:", {
        userId: user.id,
        resumeId: resume.id,
        filePath: resume.file_path,
      });

      try {
        // Delete from storage if path exists
        if (resume.file_path) {
          const { error: storageDeleteError } = await supabase.storage
            .from("resumes")
            .remove([resume.file_path]);

          console.log("[Resume] Storage delete response:", {
            error: storageDeleteError
              ? { message: storageDeleteError.message, name: storageDeleteError.name }
              : null,
          });

          if (storageDeleteError) {
            console.error("[Resume] Storage delete failed:", {
              message: storageDeleteError.message,
            });
            // Continue to delete the DB record even if storage delete fails
          }
        }

        // Delete from database
        const { data: deleteData, error: deleteError } = await supabase
          .from("resume_uploads")
          .delete()
          .eq("id", resume.id)
          .select("id")
          .single();

        console.log("[Resume] DB delete response:", {
          deletedId: deleteData?.id ?? null,
          error: deleteError
            ? { message: deleteError.message, code: deleteError.code }
            : null,
        });

        if (deleteError) {
          throw new Error(`Database delete failed: ${deleteError.message}`);
        }

        setResumes((prev) => prev.filter((r) => r.id !== resume.id));
        setSuccess("Resume deleted successfully.");
      } catch (err: unknown) {
        console.error("[Resume] Delete failed:", {
          userId: user.id,
          resumeId: resume.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          raw: err,
        });
        const message = err instanceof Error ? err.message : "Failed to delete resume.";
        setError(message);
      } finally {
        setDeleting(false);
        setResumeToDelete(null);
      }
    },
    [user]
  );

  const goToResumeInterview = useCallback((resume: ResumeRecord) => {
    const analysis = resume.analysis;
    const generatedInterview = analysis?.generatedInterview;
    window.localStorage.setItem(
      RESUME_INTERVIEW_STORAGE_KEY,
      JSON.stringify({
        title: generatedInterview?.title ?? "Resume-Based Interview",
        description: generatedInterview?.description ?? "",
        questions: generatedInterview?.questions ?? [],
      })
    );
    router.push(
      "/interview/session?role=Full%20Stack&difficulty=intermediate&interviewType=technical&mode=text&resumeInterview=1"
    );
  }, [router]);

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-[#020817]">
          <LoadingSpinner size="lg" text="Loading resume page..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#020817] pt-28 pb-20 text-white">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
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
            <h1 className="text-4xl font-black md:text-5xl">
              Upload Your{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Resume
              </span>
            </h1>
            <p className="mt-4 text-lg text-slate-400">
              Upload your PDF resume and we will store it securely for analysis.
            </p>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
            className={`mb-10 rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
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
              disabled={uploading}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-violet-400" />
                <p className="text-lg font-semibold text-white">Uploading...</p>
                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-400">{uploadProgress}%</p>
              </div>
            ) : analyzing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-violet-400" />
                <p className="text-lg font-semibold text-white">Analyzing Resume...</p>
                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-400">{analysisStatus}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-600/20">
                  <UploadCloud size={40} className="text-white" />
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
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/20"
                >
                  <UploadCloud size={18} />
                  Select PDF File
                </button>
                <p className="text-xs text-slate-500">PDF only · Max 5MB</p>
              </div>
            )}
          </div>

          {activeResumeId && (
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-violet-300">Resume Analysis Pipeline</p>
                  <p className="text-sm text-slate-400">Uploading, extracting text, analyzing, and generating your interview.</p>
                </div>
                <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                  {analysisStatus}
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
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
                  const isDone = index < (analysisStatus === "Complete" ? 5 : analysisProgress >= (index + 1) * 20 ? index + 1 : 0);
                  return (
                    <div key={step} className={`rounded-2xl border px-3 py-2 ${isDone ? "border-violet-500/30 bg-violet-500/10 text-violet-200" : "border-slate-800 bg-slate-950/70 text-slate-400"}`}>
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
                <h2 className="text-xl font-bold">Uploaded Resumes</h2>
                <p className="text-sm text-slate-400">Review your resumes and launch a tailored interview instantly.</p>
              </div>
              <div className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-sm text-slate-400">
                {resumes.length} uploaded
              </div>
            </div>

            {resumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText size={48} className="mb-4 text-slate-600" />
                <p className="text-lg text-slate-400">No resumes uploaded yet</p>
                <p className="mt-2 text-sm text-slate-500">Upload your first resume to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => {
                  const analysis = resume.analysis as (ResumeAnalysis & { generatedInterview?: ResumeGeneratedInterview }) | null;
                  const hasAnalysis = Boolean(analysis);
                  return (
                    <div
                      key={resume.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                          <FileCheck2 size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{resume.file_name || "Untitled"}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            {resume.file_size && <span>{formatBytes(resume.file_size)}</span>}
                            <span>
                              {new Date(resume.uploaded_at).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          {hasAnalysis && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                                Score {analysis?.overallScore ?? 0}
                              </span>
                              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-300">
                                ATS {analysis?.atsScore ?? 0}
                              </span>
                              {analysis?.generatedInterview?.questions?.length ? (
                                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-violet-300">
                                  {analysis.generatedInterview.questions.length} questions ready
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {hasAnalysis ? (
                          <button
                            onClick={() => goToResumeInterview(resume)}
                            disabled={analyzing || deleting || uploading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition-all duration-300 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PlayCircle size={16} />
                            Resume Interview
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleAnalyze(resume)}
                            disabled={analyzing || deleting || uploading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-300 hover:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {analyzing ? (
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
                          onClick={() => setResumeToDelete(resume)}
                          disabled={analyzing || deleting || uploading}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={resumeToDelete !== null}
        title="Delete Resume"
        message={`Are you sure you want to delete "${resumeToDelete?.file_name ?? "this resume"}"? This action cannot be undone.`}
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
