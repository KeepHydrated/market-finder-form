-- Add Google rating columns to markets table to persist market ratings
ALTER TABLE public.markets 
ADD COLUMN IF NOT EXISTS google_rating NUMERIC,
ADD COLUMN IF NOT EXISTS google_rating_count INTEGER,
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS last_rating_update TIMESTAMP WITH TIME ZONE;