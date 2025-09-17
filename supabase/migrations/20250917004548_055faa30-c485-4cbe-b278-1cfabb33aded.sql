-- Add UPDATE policy for markets table so authenticated users can update markets they created
CREATE POLICY "Authenticated users can update markets" 
ON public.markets 
FOR UPDATE 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);