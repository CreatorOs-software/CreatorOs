DELETE FROM public.email_threads WHERE body IS NULL OR length(body) = 0;
UPDATE public.email_integrations SET last_uid = 0;