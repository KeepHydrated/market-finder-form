-- Update Pearl Farmers Market submission with full address
UPDATE submissions 
SET market_address = '312 Pearl Pkwy, San Antonio, TX 78215, United States'
WHERE selected_market = 'Pearl Farmers Market' 
  OR search_term = 'Pearl Farmers Market';