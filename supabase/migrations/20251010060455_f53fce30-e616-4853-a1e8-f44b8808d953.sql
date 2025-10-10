-- Step 1: Clean up duplicate markets by keeping only the most recent entry for each google_place_id
-- This uses a CTE to identify duplicates and delete older entries
WITH duplicates AS (
  SELECT id,
         google_place_id,
         ROW_NUMBER() OVER (
           PARTITION BY google_place_id 
           ORDER BY last_rating_update DESC NULLS LAST, created_at DESC
         ) as rn
  FROM public.markets
  WHERE google_place_id IS NOT NULL
)
DELETE FROM public.markets
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Now add the unique constraint
ALTER TABLE public.markets 
ADD CONSTRAINT markets_google_place_id_unique UNIQUE (google_place_id);

-- Step 3: Create index for better query performance  
CREATE INDEX IF NOT EXISTS idx_markets_google_place_id ON public.markets(google_place_id);