-- Add reusable updated_at trigger function and attach to tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Attach trigger to tables that have updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.profiles;
    CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.interviews;
    CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON public.interviews
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='resume_uploads' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.resume_uploads;
    CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON public.resume_uploads
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='learning_roadmaps' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at ON public.learning_roadmaps;
    CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON public.learning_roadmaps
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Create missing indexes for analytics and queries
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON public.interviews(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_interview_id ON public.feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_user_id ON public.resume_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_uploaded_at ON public.resume_uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_created_at ON public.resume_uploads(created_at);
