-- Convert niche from TEXT to TEXT[] so creators can have multiple niches
ALTER TABLE public.creators
  ALTER COLUMN niche TYPE TEXT[]
  USING CASE
    WHEN niche IS NULL OR niche = '' THEN '{}'::TEXT[]
    ELSE ARRAY[niche]
  END;

ALTER TABLE public.creators ALTER COLUMN niche SET DEFAULT '{}';
ALTER TABLE public.creators ALTER COLUMN niche SET NOT NULL;
