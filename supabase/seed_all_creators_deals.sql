-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: 1–2 Deals pro Creator (alle Creator der Agency)
-- Löscht vorher alle bestehenden [SEED]-Deals und legt neue an.
-- Ausführen im Supabase SQL-Editor.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_agency_id   uuid := '00000000-0000-0000-0000-000000000001';
  v_creator     RECORD;
  brands_arr    uuid[];
  n_brands      int;
  idx           int := 0;
  v_b1          uuid;
  v_b2          uuid;

  -- Abwechselnde Status-Kombinationen pro Creator
  statuses1 public.deal_status[] := ARRAY['production','approval','confirmed','negotiation','posted']::public.deal_status[];
  statuses2 public.deal_status[] := ARRAY['negotiation','incoming','approval','confirmed','production']::public.deal_status[];
  platforms1 text[] := ARRAY['instagram', 'tiktok', 'youtube', 'instagram', 'tiktok'];
  platforms2 text[] := ARRAY['tiktok', 'instagram', 'instagram', 'youtube', 'instagram'];
BEGIN

  -- ── Alte Seed-Deals löschen ───────────────────────────────────────────────
  DELETE FROM public.deals
  WHERE agency_id = v_agency_id AND title LIKE '[SEED]%';

  -- ── Alle Brand-IDs der Agency laden ──────────────────────────────────────
  SELECT ARRAY_AGG(id ORDER BY company_name)
  INTO brands_arr
  FROM public.brands
  WHERE agency_id = v_agency_id;

  IF brands_arr IS NULL OR array_length(brands_arr, 1) = 0 THEN
    RAISE EXCEPTION 'Keine Brands gefunden – zuerst seed_deals_dev.sql ausführen.';
  END IF;

  n_brands := array_length(brands_arr, 1);

  -- ── Je Creator 2 Deals anlegen ────────────────────────────────────────────
  FOR v_creator IN
    SELECT id, full_name
    FROM public.creators
    WHERE agency_id = v_agency_id
    ORDER BY full_name
  LOOP
    v_b1 := brands_arr[(idx % n_brands) + 1];
    v_b2 := brands_arr[((idx + 1) % n_brands) + 1];

    -- ── Deal 1: aktiver / laufender Deal ─────────────────────────────────
    INSERT INTO public.deals (
      agency_id, creator_id, brand_id,
      title, budget, status, priority, platform, source,
      campaign_start, campaign_end, deadline,
      contact_person, product,
      deliverables, payment_items,
      rights, guidelines, tracking_assets,
      contract_status, contract_date,
      description
    ) VALUES (
      v_agency_id,
      v_creator.id,
      v_b1,

      '[SEED] Kampagne ' || split_part(v_creator.full_name, ' ', 1),
      3500,
      statuses1[(idx % array_length(statuses1,1)) + 1],
      'high'::public.deal_priority,
      platforms1[(idx % array_length(platforms1,1)) + 1],
      'manual',

      current_date - 14,
      current_date + 30,
      current_date + 8,

      'Anna Müller',
      'Produkt Launch Q3',

      jsonb_build_array(
        jsonb_build_object(
          'count', 1,
          'content_type', 'Reel',
          'platform', 'Instagram',
          'draft_deadline', (current_date + 4)::text,
          'freigabe_deadline', (current_date + 7)::text,
          'live_date', (current_date + 10)::text
        ),
        jsonb_build_object(
          'count', 3,
          'content_type', 'Stories',
          'platform', 'Instagram',
          'draft_deadline', NULL,
          'freigabe_deadline', NULL,
          'live_date', (current_date + 10)::text
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'label', 'Zahlung',
          'amount', 3500,
          'invoice_date', '',
          'payment_term', 30
        )
      ),

      jsonb_build_object(
        'scope', 'nur_gepostet',
        'territory', 'DACH',
        'duration_value', 6,
        'duration_unit', 'monate',
        'duration_start_type', 'live_gang',
        'channels', jsonb_build_array('Creator organic', 'Paid Social (Whitelisting/Spark)')
      ),
      jsonb_build_object(
        'labeling', '#Werbung',
        'wording', 'Authentisch und natürlich präsentieren',
        'nogo', 'Keine Konkurrenzprodukte erwähnen',
        'hashtags', jsonb_build_array('#ad', '#sponsored', '#werbung'),
        'links', jsonb_build_array('https://brand.de/landing')
      ),
      jsonb_build_object(
        'discount_code', upper(left(split_part(v_creator.full_name,' ',1), 4)) || '10',
        'affiliate_link', 'https://brand.de/ref/' || lower(left(split_part(v_creator.full_name,' ',1), 6)),
        'utm_params', 'utm_source=influencer&utm_medium=social'
      ),

      'versendet',
      current_date - 5,

      'Kooperation für Q3 Produktlaunch. Authentische Integration gewünscht.'
    );

    -- ── Deal 2: Pipeline / frühe Phase ───────────────────────────────────
    INSERT INTO public.deals (
      agency_id, creator_id, brand_id,
      title, budget, status, priority, platform, source,
      contact_person,
      deliverables, payment_items,
      exclusivity_info, embargo,
      contract_status
    ) VALUES (
      v_agency_id,
      v_creator.id,
      v_b2,

      '[SEED] Kooperation ' || split_part(v_creator.full_name, ' ', 1),
      5000,
      statuses2[(idx % array_length(statuses2,1)) + 1],
      'med'::public.deal_priority,
      platforms2[(idx % array_length(platforms2,1)) + 1],
      'manual',

      'Max Weber',

      jsonb_build_array(
        jsonb_build_object(
          'count', 2,
          'content_type', 'TikTok Video',
          'platform', 'TikTok',
          'draft_deadline', (current_date + 18)::text,
          'freigabe_deadline', (current_date + 22)::text,
          'live_date', (current_date + 28)::text
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'label', 'Anzahlung',
          'amount', 2500,
          'invoice_date', '',
          'payment_term', 14
        ),
        jsonb_build_object(
          'label', 'Restzahlung',
          'amount', 2500,
          'invoice_date', '',
          'payment_term', 30
        )
      ),

      jsonb_build_object(
        'category', 'Beauty & Lifestyle',
        'end_date', (current_date + 90)::text,
        'competitors', jsonb_build_array('Konkurrent A', 'Konkurrent B')
      ),
      jsonb_build_object(
        'date', (current_date + 25)::text,
        'notes', 'Kein Posting vor dem offiziellen Launch-Datum'
      ),

      'offen'
    );

    RAISE NOTICE 'Deals erstellt für: % (idx=%)', v_creator.full_name, idx;
    idx := idx + 1;
  END LOOP;

  RAISE NOTICE 'Fertig – % Creator bespielt.', idx;
END $$;
