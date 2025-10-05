-- First, delete duplicate reviews, keeping only the most recent one per user per vendor
DELETE FROM public.reviews
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, vendor_id ORDER BY created_at DESC) as rn
    FROM public.reviews
  ) t
  WHERE rn > 1
);

-- Now add the unique constraint to ensure one review per user per vendor
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_user_vendor_unique UNIQUE (user_id, vendor_id);