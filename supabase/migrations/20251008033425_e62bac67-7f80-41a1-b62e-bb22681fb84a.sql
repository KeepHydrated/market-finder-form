-- Add vendor_id to conversations table to track which store the conversation is about
ALTER TABLE conversations 
ADD COLUMN vendor_id uuid REFERENCES submissions(id);

-- Create index for better query performance
CREATE INDEX idx_conversations_vendor_id ON conversations(vendor_id);