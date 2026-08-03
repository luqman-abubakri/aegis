"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  FileText,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Loader2,
  FileCheck2,
} from "lucide-react";
import Link from "next/link";

interface ResumeRecord {
  id: string;
  file_name: string | null;
  file_size: number | null;
  file_path: string | null;
  uploaded_at: string;
  analysis: unknown;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadResumes() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("resume_uploads")
          .select("*")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });

        if (!error && data) {
          setResumes(data as ResumeRecord[]);
        }
      } catch (err) {
        console.error("Failed to fetch resumes:", err);
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
        const filePath = `resumes/${fileName}`;

        // Simulate progress while uploading (Supabase JS SDK does not expose progress events)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => (prev < 90 ? prev + 5 : prev));
        }, 200);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        clearInterval(progressInterval);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Save metadata to resume_uploads table
        const { error: dbError } = await supabase.from("resume_uploads").insert({
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
        });

        if (dbError) {
          throw new Error(dbError.message);
        }

        setSuccess("Resume uploaded successfully!");
        setUploadProgress(100);

        // Refresh the list
        const { data: refreshed } = await supabase
          .from("resume_uploads")
          .select("*")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });

        if (refreshed) {
          setResumes(refreshed as ResumeRecord[]);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to upload resume.";
        setError(message);
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [user]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (uploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile, uploading]
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

      try {
        // Delete from storage if path exists
        if (resume.file_path) {
          await supabase.storage.from("resumes").remove([resume.file_path]);
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from("resume_uploads")
          .delete()
          .eq("id", resume.id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        setResumes((prev) => prev.filter((r) => r.id !== resume.id));
        setSuccess("Resume deleted successfully.");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete resume.";
        setError(message);
      }
    },
    [user]
  );

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

          {/* Uploaded Resumes */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl">
            <h2 className="mb-6 text-xl font-bold">Uploaded Resumes</h2>

            {resumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText size={48} className="mb-4 text-slate-600" />
                <p className="text-lg text-slate-400">No resumes uploaded yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Upload your first resume to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                        <FileCheck2 size={24} />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {resume.file_name || "Untitled"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          {resume.file_size && (
                            <span>{formatBytes(resume.file_size)}</span>
                          )}
                          <span>
                            {new Date(resume.uploaded_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(resume)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}