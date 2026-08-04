-- =============================================================
-- AEGIS Supabase Migration: Fix schema, RLS policies, and storage
-- =============================================================
-- Run this in the Supabase SQL Editor.
-- This migration is idempotent (safe to run multiple times).
-- =============================================================

-- -------------------------------------------------------------
-- 1. Add duration_seconds column to interviews table
-- -------------------------------------------------------------
-- The application code inserts and reads duration_seconds, but the
-- original schema never included this column. This caused every
-- interview INSERT to fail with:
--   "column 'duration_seconds' of relation 'interviews' does not exist"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'interviews'
      AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE public.interviews
      ADD COLUMN duration_seconds INTEGER DEFAULT 0;
  END IF;
END $$;

-- -------------------------------------------------------------
-- 2. Feedback table: add missing INSERT and UPDATE RLS policies
-- -------------------------------------------------------------
-- The original schema only had a SELECT policy on feedback.
-- Without an INSERT policy, every feedback INSERT was rejected by
-- RLS with: "new row violates row-level security policy"
-- The application silently swallowed this error and reported success.

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
CREATE POLICY "Users can update own feedback"
  ON public.feedback FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own feedback" ON public.feedback;
CREATE POLICY "Users can delete own feedback"
  ON public.feedback FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 3. Interviews table: add missing UPDATE and DELETE RLS policies
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete own interviews" ON public.interviews;
CREATE POLICY "Users can delete own interviews"
  ON public.interviews FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 4. Resume uploads table: add missing UPDATE and DELETE RLS policies
-- -------------------------------------------------------------
-- The original schema only had SELECT and INSERT policies.
-- Without DELETE, users could not remove their resumes.
DROP POLICY IF EXISTS "Users can update own resumes" ON public.resume_uploads;
CREATE POLICY "Users can update own resumes"
  ON public.resume_uploads FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resumes" ON public.resume_uploads;
CREATE POLICY "Users can delete own resumes"
  ON public.resume_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 5. Storage bucket: resumes
-- -------------------------------------------------------------
-- The application uploads PDFs to a "resumes" storage bucket that
-- did not exist, causing: "Bucket not found"
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 6. Storage RLS policies for the resumes bucket
-- -------------------------------------------------------------
-- File paths follow the pattern: {user_id}/{timestamp}.pdf
-- so the first path segment is the user's UUID.

-- Allow users to upload files to their own folder
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
CREATE POLICY "Users can upload own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view/download their own files
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
CREATE POLICY "Users can view own resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update (overwrite) their own files
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
CREATE POLICY "Users can update own resumes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
CREATE POLICY "Users can delete own resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- -------------------------------------------------------------
-- 7. Index on duration_seconds for potential analytics queries
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_completed_at ON public.interviews(completed_at);