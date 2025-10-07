-- Add tracking and shipping information to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS tracking_carrier text,
ADD COLUMN IF NOT EXISTS tracking_url text,
ADD COLUMN IF NOT EXISTS estimated_delivery_date date,
ADD COLUMN IF NOT EXISTS ship_from_city text,
ADD COLUMN IF NOT EXISTS ship_from_state text,
ADD COLUMN IF NOT EXISTS ship_to_city text,
ADD COLUMN IF NOT EXISTS ship_to_state text;