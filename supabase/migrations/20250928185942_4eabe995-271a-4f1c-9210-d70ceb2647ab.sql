-- Fix the RLS policy for commissions table
DROP POLICY IF EXISTS "Commission recipient can view their commissions" ON public.commissions;

-- Create a simpler, working policy that uses JWT email
CREATE POLICY "Commission recipient can view their commissions" 
  ON public.commissions 
  FOR SELECT 
  USING (auth.jwt() ->> 'email' = commission_email);