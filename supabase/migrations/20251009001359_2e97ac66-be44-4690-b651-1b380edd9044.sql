-- Add product_id to reviews table to support product-specific reviews
ALTER TABLE reviews 
ADD COLUMN product_id text,
ADD COLUMN product_name text,
ADD COLUMN product_image text;

-- Add index for better query performance
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_vendor_product ON reviews(vendor_id, product_id);