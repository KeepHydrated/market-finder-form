-- Add Google Maps rating fields to submissions table
ALTER TABLE public.submissions 
ADD COLUMN google_rating DECIMAL(2,1),
ADD COLUMN google_rating_count INTEGER;