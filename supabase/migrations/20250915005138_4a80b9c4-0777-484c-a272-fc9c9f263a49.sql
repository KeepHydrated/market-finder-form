-- Update the likes table to support composite item IDs for vendor-product combinations
ALTER TABLE public.likes ALTER COLUMN item_id TYPE text;