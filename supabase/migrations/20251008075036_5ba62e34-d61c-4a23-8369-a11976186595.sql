-- Update the second order to mark it as delivered
UPDATE orders 
SET 
  estimated_delivery_date = '2025-09-28',
  tracking_carrier = 'USPS',
  ship_from_city = 'Phoenix',
  ship_from_state = 'AZ',
  ship_to_city = 'San Antonio',
  ship_to_state = 'TX'
WHERE id = '243ab3c9-9cde-476a-b371-d34c6cb532fb';