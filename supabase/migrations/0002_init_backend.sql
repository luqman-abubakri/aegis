-- init_backend: create missing backend resources for AEGIS interview platform

-- 1. Tables
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  interview_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score INTEGER,
  feedback JSONB,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall_score INTEGER,
  technical_score INTEGER,
  communication_score INTEGER,
  strengths TEXT[],
  improvements TEXT[],
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resume_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  analysis JSONB,
  parsed_data JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_uploads ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for interviews
DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
CREATE POLICY "Users can view own interviews"
  ON public.interviews FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interviews" ON public.interviews;
CREATE POLICY "Users can insert own interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own interviews" ON public.interviews;
CREATE POLICY "Users can update own interviews"
  ON public.interviews FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interviews" ON public.interviews;
CREATE POLICY "Users can delete own interviews"
  ON public.interviews FOR DELETE
  USING (auth.uid() = user_id);

-- 4. RLS policies for feedback
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

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

-- 5. RLS policies for resume_uploads
DROP POLICY IF EXISTS "Users can view own resumes" ON public.resume_uploads;
CREATE POLICY "Users can view own resumes"
  ON public.resume_uploads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resumes" ON public.resume_uploads;
CREATE POLICY "Users can insert own resumes"
  ON public.resume_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resumes" ON public.resume_uploads;
CREATE POLICY "Users can update own resumes"
  ON public.resume_uploads FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resumes" ON public.resume_uploads;
CREATE POLICY "Users can delete own resumes"
  ON public.resume_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Storage bucket and storage policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
CREATE POLICY "Users can upload own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
CREATE POLICY "Users can view own resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
CREATE POLICY "Users can update own resumes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
CREATE POLICY "Users can delete own resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 7. Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.profiles;
    CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.interviews;
    CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON public.interviews
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='resume_uploads' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.resume_uploads;
    CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON public.resume_uploads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON public.interviews(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_interview_id ON public.feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_user_id ON public.resume_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_uploaded_at ON public.resume_uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_created_at ON public.resume_uploads(created_at);
