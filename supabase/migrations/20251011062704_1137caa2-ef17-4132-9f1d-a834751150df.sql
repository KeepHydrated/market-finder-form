-- Make full_name nullable in user_addresses table
ALTER TABLE public.user_addresses 
ALTER COLUMN full_name DROP NOT NULL;