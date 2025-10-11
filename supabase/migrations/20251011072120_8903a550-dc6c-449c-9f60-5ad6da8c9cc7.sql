-- Update the check constraint on user_addresses to allow 'both' as a valid type
ALTER TABLE public.user_addresses 
DROP CONSTRAINT IF EXISTS user_addresses_type_check;

ALTER TABLE public.user_addresses 
ADD CONSTRAINT user_addresses_type_check 
CHECK (type IN ('shipping', 'billing', 'both'));