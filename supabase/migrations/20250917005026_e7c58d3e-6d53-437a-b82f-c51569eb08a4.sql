-- Add zipcode column to profiles table to store user location information
ALTER TABLE public.profiles 
ADD COLUMN zipcode TEXT;