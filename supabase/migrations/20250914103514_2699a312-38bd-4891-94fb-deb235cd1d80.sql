-- Update RLS policies for orders to allow vendors to see their own orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders or orders from their vendor" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.submissions 
    WHERE submissions.user_id = auth.uid() 
    AND submissions.id = orders.vendor_id
    AND submissions.status = 'accepted'
  )
);