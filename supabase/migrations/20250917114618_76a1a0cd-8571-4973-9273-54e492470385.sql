-- Add support for multiple market selections
ALTER TABLE public.submissions 
ADD COLUMN selected_markets JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the structure
COMMENT ON COLUMN public.submissions.selected_markets IS 'Array of selected market objects with full market data including name, address, days, hours, etc.';