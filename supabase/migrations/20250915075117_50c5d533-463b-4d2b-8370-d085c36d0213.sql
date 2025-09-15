-- Allow public access to view accepted submissions for the homepage
CREATE POLICY "Anyone can view accepted submissions" 
ON public.submissions 
FOR SELECT 
USING (status = 'accepted');