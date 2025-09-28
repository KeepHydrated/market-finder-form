-- Add product_image field to order_items table
ALTER TABLE public.order_items 
ADD COLUMN product_image TEXT;