SELECT count(*) AS auth_users_count FROM auth.users;
SELECT count(*) AS profiles_count FROM public.profiles;
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema='auth' AND event_object_table='users';
SELECT trigger_name, event_object_table, event_object_schema, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema='public' AND event_object_table='profiles';
