-- Add user_id column to markets table to track who created each market
ALTER TABLE public.markets ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX idx_markets_user_id ON public.markets(user_id);

-- Add RLS policy to allow users to delete markets they created
CREATE POLICY "Users can delete markets they created" 
ON public.markets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update existing markets to have a user_id (optional - can be left null for existing markets)
-- This allows existing markets to remain undeletable unless claimed by a user