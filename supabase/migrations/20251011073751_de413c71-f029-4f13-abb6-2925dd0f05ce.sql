-- Enable realtime for orders table
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Add orders table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;