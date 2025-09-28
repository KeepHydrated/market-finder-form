-- Create commissions table to track commission earnings
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  commission_email TEXT NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0300, -- 3% as 0.0300
  commission_amount INTEGER NOT NULL, -- Amount in cents
  order_total INTEGER NOT NULL, -- Total order amount in cents
  vendor_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure we don't double-track commissions
  UNIQUE(order_id, commission_email)
);

-- Enable RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Only the commission recipient can view their commissions
CREATE POLICY "Commission recipient can view their commissions" 
  ON public.commissions 
  FOR SELECT 
  USING (
    auth.jwt() ->> 'email' = commission_email OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = commission_email
    )
  );

-- Allow system to insert commission records
CREATE POLICY "System can insert commission records" 
  ON public.commissions 
  FOR INSERT 
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();