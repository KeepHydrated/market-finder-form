-- Add market details fields to submissions table
ALTER TABLE public.submissions 
ADD COLUMN market_address TEXT,
ADD COLUMN market_days TEXT[],
ADD COLUMN market_hours JSONB;