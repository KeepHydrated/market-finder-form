-- Add is_sample column to submissions table
ALTER TABLE public.submissions 
ADD COLUMN is_sample boolean DEFAULT false;

-- Mark Sweet Treats Bakery as a sample store
UPDATE public.submissions 
SET is_sample = true 
WHERE store_name = 'Sweet Treats Bakery';