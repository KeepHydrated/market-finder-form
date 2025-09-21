-- Update selected_markets to store full market objects instead of just names
-- The selected_markets field will now store an array of JSON objects with market details

COMMENT ON COLUMN public.submissions.selected_markets IS 'Stores an array of farmer market objects with details like name, address, rating, place_id, etc.';