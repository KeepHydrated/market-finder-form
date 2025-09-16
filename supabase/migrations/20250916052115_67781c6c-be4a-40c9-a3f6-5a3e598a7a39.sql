-- Create a test user account for shop manager access
-- This will be handled through the auth signup process, so let's check if we need any additional setup

-- First, let's see if we need to create any shop data for the test user
-- We'll create a placeholder shop entry for a test user
INSERT INTO public.shops (
  user_id, 
  store_name, 
  specialty, 
  description,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- placeholder user_id that will be updated after signup
  'Test Shop',
  'Organic Produce',
  'Test shop for demonstration purposes',
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;