-- Replace the Phase-1 stub: each signup now gets its own isolated agency.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name      TEXT;
  v_initials  TEXT;
  v_agency_id UUID;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  v_initials := upper(
    substring(regexp_replace(v_name, '[^a-zA-Z ]', '', 'g'), 1, 1)
    || COALESCE(substring(split_part(v_name, ' ', 2), 1, 1), '')
  );
  IF length(v_initials) = 0 THEN v_initials := 'AK'; END IF;

  -- Create a new agency for this user
  INSERT INTO public.agencies (name, plan)
  VALUES (v_name || '''s Agency', 'Pro')
  RETURNING id INTO v_agency_id;

  INSERT INTO public.profiles (id, agency_id, display_name, initials)
  VALUES (NEW.id, v_agency_id, v_name, v_initials);

  RETURN NEW;
END $$;
