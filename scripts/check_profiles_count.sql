SELECT (SELECT count(*) FROM auth.users) AS auth_users, (SELECT count(*) FROM public.profiles) AS public_profiles;
