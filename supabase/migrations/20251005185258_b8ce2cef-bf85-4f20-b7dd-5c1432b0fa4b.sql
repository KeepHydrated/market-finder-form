-- Drop existing payment_methods table if it exists
DROP TABLE IF EXISTS public.payment_methods CASCADE;

-- Drop existing payment_type if it exists
DROP TYPE IF EXISTS payment_type CASCADE;

-- Create payment_type enum
CREATE TYPE payment_type AS ENUM ('card', 'paypal', 'apple_pay');

-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_type payment_type NOT NULL DEFAULT 'card',
  card_last_four TEXT,
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  cardholder_name TEXT,
  paypal_email TEXT,
  apple_pay_email TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payment methods" 
ON public.payment_methods FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" 
ON public.payment_methods FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" 
ON public.payment_methods FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" 
ON public.payment_methods FOR DELETE 
USING (auth.uid() = user_id);

-- Function to ensure single default
CREATE OR REPLACE FUNCTION public.ensure_single_default_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger for single default
CREATE TRIGGER ensure_single_default_payment_trigger
BEFORE INSERT OR UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_payment();