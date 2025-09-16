-- Add vacation_mode column to submissions table
ALTER TABLE public.submissions 
ADD COLUMN vacation_mode BOOLEAN DEFAULT false;