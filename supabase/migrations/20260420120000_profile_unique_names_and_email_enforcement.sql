-- Unique public display names (case-insensitive) and unique avatar image URLs.
-- Deduplicate existing rows before creating indexes.

-- 1) display_name: keep first account (oldest created_at) per lower(display), suffix others
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY lower(trim(display_name))
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.pp_user_profiles
  WHERE display_name IS NOT NULL
    AND length(trim(display_name)) > 0
)
UPDATE public.pp_user_profiles p
SET
  display_name = trim(p.display_name) || '_' || left(replace(p.id::text, '-', ''), 8)
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 2) avatar_url: disambiguate duplicate non-null URLs (query param is ignored by most image CDNs for display)
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY trim(avatar_url)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.pp_user_profiles
  WHERE avatar_url IS NOT NULL
    AND length(trim(avatar_url)) > 0
)
UPDATE public.pp_user_profiles p
SET
  avatar_url = trim(p.avatar_url)
    || CASE
      WHEN trim(p.avatar_url) LIKE '%?%' THEN '&v='
      ELSE '?v='
    END
    || replace(p.id::text, '-', '')
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 3) Unique constraints (partial: ignore null/empty)
CREATE UNIQUE INDEX IF NOT EXISTS pp_user_profiles_display_name_lower_key
  ON public.pp_user_profiles (lower(trim(display_name)))
  WHERE display_name IS NOT NULL
    AND length(trim(display_name)) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS pp_user_profiles_avatar_url_key
  ON public.pp_user_profiles (trim(avatar_url))
  WHERE avatar_url IS NOT NULL
    AND length(trim(avatar_url)) > 0;

-- 4) New signups: default display_name is always unique (base + short id token)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_name text;
  suffix text := '_' || left(replace(NEW.id::text, '-', ''), 8);
  raw_avatar text;
  avatar_val text;
BEGIN
  SET LOCAL row_security = off;

  base_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(trim(split_part(coalesce(NEW.email, ''), '@', 1)), ''),
    'user'
  );

  raw_avatar := NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), '');
  IF raw_avatar IS NOT NULL THEN
    avatar_val := raw_avatar
      || CASE
        WHEN raw_avatar LIKE '%?%' THEN '&uid='
        ELSE '?uid='
      END
      || replace(NEW.id::text, '-', '');
  ELSE
    avatar_val := NULL;
  END IF;

  INSERT INTO public.pp_user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    coalesce(NEW.email, ''),
    base_name || suffix,
    avatar_val
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
