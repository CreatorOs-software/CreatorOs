
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_agency_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
-- current_agency_id needs to be callable from RLS policies of authenticated users
GRANT EXECUTE ON FUNCTION public.current_agency_id() TO authenticated;
