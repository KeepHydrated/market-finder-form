-- Create markets table
CREATE TABLE public.markets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}',
  hours TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Create policies for markets (public read access, authenticated users can insert)
CREATE POLICY "Markets are viewable by everyone" 
ON public.markets 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create markets" 
ON public.markets 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_markets_updated_at
BEFORE UPDATE ON public.markets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample markets
INSERT INTO public.markets (name, address, city, state, days, hours) VALUES
('Downtown Farmers Market', '123 Main St', 'Springfield', 'IL', '{"Saturday"}', '8:00 AM - 2:00 PM'),
('Riverside Market', '456 River Rd', 'Portland', 'OR', '{"Wednesday", "Saturday"}', '9:00 AM - 3:00 PM'),
('Central Park Market', '789 Park Ave', 'New York', 'NY', '{"Sunday"}', '10:00 AM - 4:00 PM');