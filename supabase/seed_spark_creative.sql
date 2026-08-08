-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Spark Creative Agency – Creators, Brands, Deals, Events, Anfragen
-- Agency-ID: aaaaaaaa-0000-0000-0000-000000000003
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_agency uuid := 'aaaaaaaa-0000-0000-0000-000000000003';

  -- Creators
  v_mia   uuid := gen_random_uuid();
  v_felix uuid := gen_random_uuid();
  v_sara  uuid := gen_random_uuid();
  v_noah  uuid := gen_random_uuid();

  -- Brands
  v_glossy uuid := gen_random_uuid();
  v_verde  uuid := gen_random_uuid();
  v_volt   uuid := gen_random_uuid();
  v_solis  uuid := gen_random_uuid();
  v_forma  uuid := gen_random_uuid();
  v_arca   uuid := gen_random_uuid();

  -- Deals
  v_d1 uuid; v_d2 uuid; v_d3 uuid; v_d4 uuid;
  v_d5 uuid; v_d6 uuid; v_d7 uuid; v_d8 uuid;

BEGIN

  -- ── Cleanup ────────────────────────────────────────────────────────────────
  DELETE FROM public.events   WHERE agency_id = v_agency;
  DELETE FROM public.anfragen WHERE agency_id = v_agency;
  DELETE FROM public.deals    WHERE agency_id = v_agency;
  DELETE FROM public.creators WHERE agency_id = v_agency;
  DELETE FROM public.brands   WHERE agency_id = v_agency;

  -- ── Brands ─────────────────────────────────────────────────────────────────
  INSERT INTO public.brands
    (id, agency_id, company_name, short_code, color, industry, contact_name, contact_email, relationship_score)
  VALUES
    (v_glossy, v_agency, 'Glossy Lab',     'GLO', 'oklch(0.62 0.20 340)', 'Beauty',    'Nina Roth',    'nina@glossylab.de',   4),
    (v_verde,  v_agency, 'Verde Foods',    'VRD', 'oklch(0.58 0.18 145)', 'Food',      'Jonas Braun',  'jonas@verde.de',      3),
    (v_volt,   v_agency, 'Volt Energy',    'VLT', 'oklch(0.70 0.22 90)',  'Beverages', 'Kai Sommer',   'kai@volt.de',         5),
    (v_solis,  v_agency, 'Solis Skincare', 'SOL', 'oklch(0.65 0.14 60)',  'Skincare',  'Emma Fischer', 'emma@solis.de',       4),
    (v_forma,  v_agency, 'Forma Sport',    'FRM', 'oklch(0.45 0.10 220)', 'Sports',    'Marc Weber',   'marc@formasport.de',  3),
    (v_arca,   v_agency, 'Arca Tech',      'ARC', 'oklch(0.50 0.18 260)', 'Tech',      'Lara König',   'lara@arca.tech',      2);

  -- ── Creators ───────────────────────────────────────────────────────────────
  INSERT INTO public.creators (
    id, agency_id, full_name, handle, niche, platforms,
    instagram_handle, tiktok_handle, youtube_handle,
    followers, monthly_revenue, status, initials, color,
    email, city, country, bio,
    rates, dream_brands, wish_themes, no_go,
    goal_value, goal_type, goal_period, min_kooperation_betrag
  ) VALUES
  (
    v_mia, v_agency, 'Mia Schreiber', '@miaschreiber',
    ARRAY['Beauty','Lifestyle'], ARRAY['instagram','tiktok'],
    'miaschreiber', 'miaschreiber_tiktok', NULL,
    '148K', 6800, 'active', 'MS', 'oklch(0.62 0.20 340)',
    'mia@sparkcreative.de', 'Berlin', 'Deutschland',
    'Beauty-Creator mit Fokus auf nachhaltige Kosmetik und Alltags-Looks.',
    '{"reel":2200,"story":400,"tiktok":1800}'::jsonb,
    ARRAY['Sephora','Charlotte Tilbury'], ARRAY['Nachhaltigkeit','Clean Beauty'], ARRAY['Alkohol','Tabak'],
    10000, 'revenue', 'monthly', 1000
  ),
  (
    v_felix, v_agency, 'Felix Baum', '@felixbaum',
    ARRAY['Fitness','Nutrition'], ARRAY['instagram','youtube'],
    'felixbaum_fit', NULL, 'FelixBaumFit',
    '89K', 5200, 'active', 'FB', 'oklch(0.50 0.16 220)',
    'felix@sparkcreative.de', 'München', 'Deutschland',
    'Fitness & Ernährungs-Creator – von Gym-Routinen bis Meal Prep.',
    '{"reel":1500,"story":300,"youtube":4500}'::jsonb,
    ARRAY['Nike','Myprotein','Gymshark'], ARRAY['Fitness','Gesundheit','Mindset'], ARRAY['Fast Food','Gambling'],
    8000, 'revenue', 'monthly', 800
  ),
  (
    v_sara, v_agency, 'Sara Nowak', '@saranowak',
    ARRAY['Travel','Photography'], ARRAY['instagram','tiktok','youtube'],
    'saranowak.travel', 'saranowak_reels', 'SaraNowakTravel',
    '212K', 9400, 'active', 'SN', 'oklch(0.58 0.18 180)',
    'sara@sparkcreative.de', 'Hamburg', 'Deutschland',
    'Travel-Fotografin, die Reiseabenteuer in Europa und Asien dokumentiert.',
    '{"reel":3200,"story":600,"tiktok":2600,"youtube":6000}'::jsonb,
    ARRAY['Booking.com','Airbnb','Lufthansa'], ARRAY['Reisen','Abenteuer','Fotografie'], ARRAY['Massentourismus'],
    15000, 'revenue', 'monthly', 1500
  ),
  (
    v_noah, v_agency, 'Noah Krüger', '@noahkrueger',
    ARRAY['Tech','Gaming'], ARRAY['youtube','tiktok'],
    NULL, 'noahkrueger_tech', 'NoahKrügerTech',
    '67K', 3900, 'active', 'NK', 'oklch(0.48 0.14 270)',
    'noah@sparkcreative.de', 'Köln', 'Deutschland',
    'Tech-Reviewer und Gaming-Creator – Unboxings, Reviews und Setup-Guides.',
    '{"tiktok":1200,"youtube":3800}'::jsonb,
    ARRAY['Samsung','Razer','Apple'], ARRAY['Tech','Gaming','Setup'], ARRAY['MLM','Krypto'],
    6000, 'revenue', 'monthly', 600
  );

  -- ── Deals ──────────────────────────────────────────────────────────────────

  -- D1: Mia – Glossy Lab (production)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    campaign_start, campaign_end, deadline, contact_person, product,
    deliverables, payment_items, rights, guidelines, tracking_assets, contract_status, contract_date
  ) VALUES (
    v_agency, v_mia, v_glossy, 'Glossy Lab Summer Glow', 3800,
    'production'::public.deal_status, 'high'::public.deal_priority, 'instagram', 'manual',
    current_date - 10, current_date + 25, current_date + 12,
    'Nina Roth', 'Summer Glow Serum',
    jsonb_build_array(
      jsonb_build_object('count',1,'content_type','Reel','platform','Instagram',
        'draft_deadline',(current_date+7)::text,'freigabe_deadline',(current_date+10)::text,'live_date',(current_date+14)::text),
      jsonb_build_object('count',4,'content_type','Stories','platform','Instagram',
        'draft_deadline',NULL,'freigabe_deadline',NULL,'live_date',(current_date+14)::text)
    ),
    jsonb_build_array(jsonb_build_object('label','Zahlung','amount',3800,'invoice_date','','payment_term',30)),
    '{"scope":"nur_gepostet","territory":"DACH","duration_value":6,"duration_unit":"monate","channels":["Creator organic","Paid Social (Whitelisting/Spark)"]}'::jsonb,
    '{"labeling":"#Werbung #Ad","wording":"Natürlich und authentisch","nogo":"Keine Konkurrenzprodukte"}'::jsonb,
    '{"discount_code":"MIA15","affiliate_link":"https://glossylab.de/ref/mia"}'::jsonb,
    'unterschrieben', current_date - 8
  ) RETURNING id INTO v_d1;

  -- D2: Mia – Solis (negotiation)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    contact_person, deliverables, payment_items, contract_status
  ) VALUES (
    v_agency, v_mia, v_solis, 'Solis Herbst Kollektion', 5200,
    'negotiation'::public.deal_status, 'med'::public.deal_priority, 'tiktok', 'manual',
    'Emma Fischer',
    jsonb_build_array(
      jsonb_build_object('count',2,'content_type','TikTok Video','platform','TikTok',
        'draft_deadline',(current_date+20)::text,'freigabe_deadline',(current_date+24)::text,'live_date',(current_date+28)::text)
    ),
    jsonb_build_array(
      jsonb_build_object('label','Anzahlung','amount',2600,'invoice_date','','payment_term',14),
      jsonb_build_object('label','Restzahlung','amount',2600,'invoice_date','','payment_term',30)
    ),
    'offen'
  ) RETURNING id INTO v_d2;

  -- D3: Felix – Volt (approval)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    campaign_start, campaign_end, deadline, contact_person, product,
    deliverables, payment_items, rights, contract_status, contract_date
  ) VALUES (
    v_agency, v_felix, v_volt, 'Volt Energy Integration Q3', 4500,
    'approval'::public.deal_status, 'high'::public.deal_priority, 'youtube', 'manual',
    current_date - 20, current_date + 10, current_date + 5,
    'Kai Sommer', 'Volt Energy Zero',
    jsonb_build_array(
      jsonb_build_object('count',1,'content_type','YouTube Video','platform','YouTube',
        'draft_deadline',(current_date+2)::text,'freigabe_deadline',(current_date+4)::text,'live_date',(current_date+7)::text)
    ),
    jsonb_build_array(jsonb_build_object('label','Zahlung','amount',4500,'invoice_date','','payment_term',30)),
    '{"scope":"inkl_rohmaterial","territory":"DACH","duration_value":12,"duration_unit":"monate","channels":["Creator organic","Brand Repost","Website/Shop"]}'::jsonb,
    'versendet', current_date - 15
  ) RETURNING id INTO v_d3;

  -- D4: Felix – Forma (incoming)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    contact_person, deliverables, payment_items, contract_status
  ) VALUES (
    v_agency, v_felix, v_forma, 'Forma Sport Herbst Drop', 2800,
    'incoming'::public.deal_status, 'low'::public.deal_priority, 'instagram', 'manual',
    'Marc Weber',
    jsonb_build_array(
      jsonb_build_object('count',1,'content_type','Reel','platform','Instagram','draft_deadline',NULL,'freigabe_deadline',NULL,'live_date',NULL),
      jsonb_build_object('count',3,'content_type','Stories','platform','Instagram','draft_deadline',NULL,'freigabe_deadline',NULL,'live_date',NULL)
    ),
    jsonb_build_array(jsonb_build_object('label','Zahlung','amount',2800,'invoice_date','','payment_term',30)),
    'offen'
  ) RETURNING id INTO v_d4;

  -- D5: Sara – Verde (posted)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    campaign_start, campaign_end, deadline, contact_person, product,
    deliverables, payment_items, rights, tracking_assets, contract_status, contract_date
  ) VALUES (
    v_agency, v_sara, v_verde, 'Verde Summer Picnic Kampagne', 6000,
    'posted'::public.deal_status, 'high'::public.deal_priority, 'instagram', 'manual',
    current_date - 45, current_date - 5, current_date - 10,
    'Jonas Braun', 'Verde Protein Bowl',
    jsonb_build_array(
      jsonb_build_object('count',2,'content_type','Reel','platform','Instagram',
        'draft_deadline',(current_date-20)::text,'freigabe_deadline',(current_date-15)::text,'live_date',(current_date-8)::text),
      jsonb_build_object('count',6,'content_type','Stories','platform','Instagram',
        'draft_deadline',NULL,'freigabe_deadline',NULL,'live_date',(current_date-8)::text)
    ),
    jsonb_build_array(jsonb_build_object('label','Zahlung','amount',6000,'invoice_date',(current_date-6)::text,'payment_term',30)),
    '{"scope":"nur_gepostet","territory":"DACH","duration_value":3,"duration_unit":"monate","channels":["Creator organic"]}'::jsonb,
    '{"discount_code":"SARA10","utm_params":"utm_source=influencer&utm_medium=sara"}'::jsonb,
    'unterschrieben', current_date - 42
  ) RETURNING id INTO v_d5;

  -- D6: Sara – Arca (confirmed)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    campaign_start, deadline, contact_person,
    deliverables, payment_items, contract_status
  ) VALUES (
    v_agency, v_sara, v_arca, 'Arca Tech Travel Setup', 7500,
    'confirmed'::public.deal_status, 'high'::public.deal_priority, 'youtube', 'manual',
    current_date + 5, current_date + 35, 'Lara König',
    jsonb_build_array(
      jsonb_build_object('count',1,'content_type','YouTube Video','platform','YouTube',
        'draft_deadline',(current_date+25)::text,'freigabe_deadline',(current_date+30)::text,'live_date',(current_date+38)::text)
    ),
    jsonb_build_array(
      jsonb_build_object('label','Anzahlung','amount',3750,'invoice_date','','payment_term',14),
      jsonb_build_object('label','Restzahlung','amount',3750,'invoice_date','','payment_term',30)
    ),
    'unterschrieben'
  ) RETURNING id INTO v_d6;

  -- D7: Noah – Arca (production)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    campaign_start, campaign_end, deadline, contact_person, product,
    deliverables, payment_items, rights, contract_status, contract_date
  ) VALUES (
    v_agency, v_noah, v_arca, 'Arca SmartHome Unboxing', 3200,
    'production'::public.deal_status, 'med'::public.deal_priority, 'tiktok', 'manual',
    current_date - 5, current_date + 20, current_date + 8,
    'Lara König', 'Arca Hub Pro',
    jsonb_build_array(
      jsonb_build_object('count',2,'content_type','TikTok Video','platform','TikTok',
        'draft_deadline',(current_date+5)::text,'freigabe_deadline',(current_date+7)::text,'live_date',(current_date+10)::text)
    ),
    jsonb_build_array(jsonb_build_object('label','Zahlung','amount',3200,'invoice_date','','payment_term',30)),
    '{"scope":"inkl_rohmaterial","territory":"EU","duration_value":6,"duration_unit":"monate","channels":["Creator organic","Brand Repost"]}'::jsonb,
    'versendet', current_date - 4
  ) RETURNING id INTO v_d7;

  -- D8: Noah – Volt (evaluating)
  INSERT INTO public.deals (
    agency_id, creator_id, brand_id, title, budget, status, priority, platform, source,
    contact_person, deliverables, payment_items, contract_status
  ) VALUES (
    v_agency, v_noah, v_volt, 'Volt Energy Gaming Review', 2400,
    'evaluating'::public.deal_status, 'low'::public.deal_priority, 'youtube', 'manual',
    'Kai Sommer',
    jsonb_build_array(
      jsonb_build_object('count',1,'content_type','YouTube Video','platform','YouTube','draft_deadline',NULL,'freigabe_deadline',NULL,'live_date',NULL)
    ),
    jsonb_build_array(jsonb_build_object('label','Zahlung','amount',2400,'invoice_date','','payment_term',30)),
    'offen'
  ) RETURNING id INTO v_d8;

  -- ── Events ─────────────────────────────────────────────────────────────────
  INSERT INTO public.events
    (agency_id, creator_id, deal_id, title, type, start_at, end_at, location, notes, participants)
  VALUES
    (v_agency, v_mia, v_d1,
     'Glossy Lab Shoot – Summer Glow', 'shoot'::public.event_type,
     (current_date + 3)::timestamptz + interval '10 hours',
     (current_date + 3)::timestamptz + interval '17 hours',
     'Studio Berlin Mitte', 'Produktfotos + Reel-Content. Stylist vor Ort.', '[]'::jsonb),

    (v_agency, v_mia, v_d1,
     'Glossy Lab – Draft Deadline', 'deadline'::public.event_type,
     (current_date + 7)::timestamptz + interval '23 hours',
     NULL, NULL, 'Reel-Entwurf bis Mitternacht an Nina Roth senden.', '[]'::jsonb),

    (v_agency, v_felix, v_d3,
     'Volt Video – Freigabe Deadline', 'deadline'::public.event_type,
     (current_date + 4)::timestamptz + interval '18 hours',
     NULL, NULL, 'Letzter Tag für Brand-Feedback.', '[]'::jsonb),

    (v_agency, v_sara, v_d5,
     'Verde Kampagne – Live auf Instagram', 'posting'::public.event_type,
     (current_date - 8)::timestamptz + interval '12 hours',
     NULL, NULL, 'Reel + Stories gleichzeitig veröffentlichen.', '[]'::jsonb),

    (v_agency, v_sara, v_d6,
     'Briefing-Call Arca Tech', 'brand'::public.event_type,
     (current_date + 1)::timestamptz + interval '14 hours',
     (current_date + 1)::timestamptz + interval '15 hours',
     'Zoom', 'Technisches Briefing für den Travel-Setup-Vlog.', '[]'::jsonb),

    (v_agency, v_sara, v_d6,
     'Sara – Anreise Lissabon (Arca Shooting)', 'travel'::public.event_type,
     (current_date + 12)::timestamptz + interval '7 hours',
     (current_date + 14)::timestamptz + interval '20 hours',
     'Lissabon, Portugal', 'Flug + 2 Nächte Hotel. Kosten von Arca übernommen.', '[]'::jsonb),

    (v_agency, v_noah, v_d7,
     'Arca Hub Pro Unboxing Shoot', 'shoot'::public.event_type,
     (current_date + 4)::timestamptz + interval '11 hours',
     (current_date + 4)::timestamptz + interval '15 hours',
     'Home-Studio Köln', 'Unboxing + 2 TikTok-Clips.', '[]'::jsonb),

    (v_agency, NULL, NULL,
     'Spark – Weekly Team-Sync', 'internal'::public.event_type,
     (current_date + 2)::timestamptz + interval '9 hours',
     (current_date + 2)::timestamptz + interval '10 hours',
     NULL, 'Dealstatus, offene Anfragen, Q3-Planung.', '[]'::jsonb);

  -- ── Anfragen ───────────────────────────────────────────────────────────────
  INSERT INTO public.anfragen
    (agency_id, creator_id, brand_id, brand_name, contact_person,
     format, budget_requested, budget_offer, source, status, notes)
  VALUES
    (v_agency, v_mia, NULL, 'FreshFace Cosmetics', 'Julia Stein',
     '2x Reels + 5x Stories Instagram', 4000, NULL,
     'email', 'neu', 'Neue Anfrage per E-Mail. Warten auf Deadline-Infos.'),

    (v_agency, v_felix, NULL, 'Volta Nutrition', 'Stefan Luz',
     '1x YouTube Integration (60 Sek.)', 5500, 4800,
     'ig_dm', 'verhandlung',
     'Gegenangebot 4.800 € gemacht. Ball liegt beim Brand.'),

    (v_agency, v_sara, v_verde, 'Verde Foods', 'Jonas Braun',
     '2x Reels + 6x Stories', 6000, 6000,
     'email', 'gewonnen', 'Deal wurde angelegt. Vertrag unterschrieben.'),

    (v_agency, v_noah, NULL, 'CoinMax Crypto', 'Mike Taylor',
     'TikTok-Serie (5 Videos)', 8000, NULL,
     'manual', 'abgelehnt', 'Abgelehnt – No-Go Thema (Krypto).'),

    (v_agency, v_mia, v_solis, 'Solis Skincare', 'Emma Fischer',
     '3x TikTok Videos', 5500, NULL,
     'email', 'pruefung', 'Budgetcheck läuft. Termin nächste Woche geplant.'),

    (v_agency, v_felix, v_forma, 'Forma Sport', 'Marc Weber',
     '1x Reel + 3x Stories', 2800, NULL,
     'manual', 'angebot', 'Forma hat direkt angefragt. Konditionen prüfen.');

  -- ── Todos ───────────────────────────────────────────────────────────────────
  DELETE FROM public.todos WHERE agency_id = v_agency;

  INSERT INTO public.todos (agency_id, title, done, due_date, assignee_id, priority)
  VALUES
    (v_agency, 'Glossy Lab Vertrag gegenzeichnen und zurückschicken',        false, current_date + 1,  v_mia,   'hoch'),
    (v_agency, 'Volt Video – Freigabe bei Kai Sommer einholen',              false, current_date + 4,  v_felix, 'hoch'),
    (v_agency, 'Arca Briefing-Unterlagen für Sara vorbereiten',              false, current_date + 1,  v_sara,  'mittel'),
    (v_agency, 'Noah: TikTok-Draft für Arca Hub Pro reviewen',               false, current_date + 5,  v_noah,  'hoch'),
    (v_agency, 'Rechnung Verde Foods ausstellen (6.000 €)',                  false, current_date + 3,  v_sara,  'hoch'),
    (v_agency, 'Mia: Solis Verhandlung – Angebot finalisieren',              false, current_date + 7,  v_mia,   'mittel'),
    (v_agency, 'FreshFace Anfrage beantworten – Deadline klären',            false, current_date + 2,  NULL,    'mittel'),
    (v_agency, 'Felix Forma Sport – Gegenangebot ausarbeiten',               false, current_date + 5,  v_felix, 'niedrig'),
    (v_agency, 'Media Kits aller Creator aktualisieren (Q3)',                false, current_date + 14, NULL,    'niedrig'),
    (v_agency, 'Volta Nutrition – Follow-up nach Gegenangebot',              false, current_date + 3,  v_felix, 'mittel'),
    (v_agency, 'Spark Team-Sync Agenda vorbereiten',                         false, current_date + 2,  NULL,    'niedrig'),
    (v_agency, 'Arca Reisekosten Sara bestätigen lassen',                    true,  current_date - 2,  v_sara,  'mittel');

  RAISE NOTICE 'Seed abgeschlossen: 4 Creators · 6 Brands · 8 Deals · 8 Events · 6 Anfragen · 12 Todos';
END $$;
