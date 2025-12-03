-- Add latitude and longitude columns to markets table
ALTER TABLE public.markets 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Populate coordinates for known markets (approximate coordinates for major cities)
UPDATE public.markets SET latitude = 34.0522, longitude = -118.2437 WHERE name = 'Downtown Farmers Market' AND city = 'Los Angeles';
UPDATE public.markets SET latitude = 40.7359, longitude = -73.9911 WHERE name = 'Union Square Greenmarket' AND city = 'New York';
UPDATE public.markets SET latitude = 47.6097, longitude = -122.3422 WHERE name = 'Pike Place Market' AND city = 'Seattle';
UPDATE public.markets SET latitude = 37.7956, longitude = -122.3933 WHERE name = 'Ferry Plaza Farmers Market' AND city = 'San Francisco';
UPDATE public.markets SET latitude = 45.5211, longitude = -122.6803 WHERE name = 'Portland Farmers Market' AND city = 'Portland';
UPDATE public.markets SET latitude = 30.2676, longitude = -97.7409 WHERE name = 'Austin Farmers Market' AND city = 'Austin';
UPDATE public.markets SET latitude = 40.0150, longitude = -105.2705 WHERE name = 'Boulder Farmers Market' AND city = 'Boulder';
UPDATE public.markets SET latitude = 41.9125, longitude = -87.6319 WHERE name = 'Chicago Farmers Market' AND city = 'Chicago';
UPDATE public.markets SET latitude = 42.3635, longitude = -71.0568 WHERE name = 'Boston Public Market' AND city = 'Boston';
UPDATE public.markets SET latitude = 25.7905, longitude = -80.1342 WHERE name = 'Miami Beach Farmers Market' AND city = 'Miami Beach';
UPDATE public.markets SET latitude = 33.4497, longitude = -112.0668 WHERE name = 'Phoenix Public Market' AND city = 'Phoenix';
UPDATE public.markets SET latitude = 39.7392, longitude = -104.9903 WHERE name = 'Denver Farmers Market' AND city = 'Denver';
UPDATE public.markets SET latitude = 29.7030, longitude = -98.1245 WHERE name = 'New Braunfels Farmers Market' AND city = 'New Braunfels';
UPDATE public.markets SET latitude = 29.4426, longitude = -98.4835 WHERE name = 'Pearl Farmers Market' AND city = 'San Antonio';
UPDATE public.markets SET latitude = 29.4954, longitude = -98.4737 WHERE name = 'Alamo Heights Farmers Market' AND city = 'San Antonio';