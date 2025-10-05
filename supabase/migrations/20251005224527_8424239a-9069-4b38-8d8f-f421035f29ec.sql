-- Make rating column nullable to allow reviews with just photos or just text
ALTER TABLE public.reviews
ALTER COLUMN rating DROP NOT NULL;