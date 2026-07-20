-- Persist personal display preferences without expanding the client-side auth surface.
ALTER TABLE public.profiles
  ADD COLUMN preferred_locale text NOT NULL DEFAULT 'en'
    CHECK (preferred_locale IN ('en', 'tl')),
  ADD COLUMN avatar_color text NOT NULL DEFAULT 'orange'
    CHECK (avatar_color IN ('orange', 'plum', 'teal', 'blue'));

COMMENT ON COLUMN public.profiles.preferred_locale IS 'User-selected application display locale.';
COMMENT ON COLUMN public.profiles.avatar_color IS 'Accent color for the generated initials avatar.';
