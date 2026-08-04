SELECT (SELECT count(*) FROM auth.users) AS auth_users, (SELECT count(*) FROM public.profiles) AS public_profiles;
SELECT proname, prosrc FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'handle_new_user';
