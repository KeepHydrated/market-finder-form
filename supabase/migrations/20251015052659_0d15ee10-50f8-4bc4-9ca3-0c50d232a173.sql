-- Allow everyone to view reports (WARNING: Security risk)
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;

CREATE POLICY "Everyone can view all reports"
ON public.reports
FOR SELECT
USING (true);

-- Allow everyone to update reports (WARNING: Security risk)
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

CREATE POLICY "Everyone can update reports"
ON public.reports
FOR UPDATE
USING (true);