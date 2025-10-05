-- Add foreign key constraint to link reviews to profiles
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;