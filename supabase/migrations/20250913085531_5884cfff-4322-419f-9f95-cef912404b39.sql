-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true);

-- Create storage policies for review photos
CREATE POLICY "Anyone can view review photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'review-photos');

CREATE POLICY "Users can upload their own review photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own review photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own review photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add photos column to reviews table
ALTER TABLE public.reviews ADD COLUMN photos TEXT[] DEFAULT '{}';

-- Add index for better performance on photos queries
CREATE INDEX idx_reviews_photos ON public.reviews USING GIN(photos);