SELECT id, email, full_name, created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;

SELECT count(*) FROM public.profiles;
SELECT count(*) FROM auth.users;
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_schema='public' AND event_object_table='users';

SELECT proname, prosrc FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace=pg_namespace.oid WHERE nspname='public' AND proname IN ('handle_new_user','set_updated_at');
