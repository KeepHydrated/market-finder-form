-- Drop the old unique constraint that doesn't account for product reviews
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_vendor_unique;

-- Create a partial unique index for general vendor reviews (where product_id is null)
CREATE UNIQUE INDEX reviews_user_vendor_general_unique 
ON reviews(user_id, vendor_id) 
WHERE product_id IS NULL;

-- Create a unique index for product-specific reviews
CREATE UNIQUE INDEX reviews_user_vendor_product_unique 
ON reviews(user_id, vendor_id, product_id) 
WHERE product_id IS NOT NULL;