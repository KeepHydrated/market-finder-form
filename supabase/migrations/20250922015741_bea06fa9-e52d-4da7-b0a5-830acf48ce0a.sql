-- Update the submission to show Pearl Farmers Market with correct address
UPDATE submissions 
SET 
  selected_market = 'Pearl Farmers Market',
  market_address = '312 Pearl Pkwy, San Antonio, TX 78215, United States',
  search_term = 'Pearl Farmers Market'
WHERE id = '9968fc21-d67f-4d1d-b8ab-ec1f903c7235';