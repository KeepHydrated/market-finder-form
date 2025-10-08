-- Update the most recent order to mark it as delivered
UPDATE orders 
SET 
  estimated_delivery_date = '2025-09-30',
  tracking_carrier = 'USPS',
  ship_from_city = 'Phoenix',
  ship_from_state = 'AZ',
  ship_to_city = 'San Antonio',
  ship_to_state = 'TX'
WHERE id = '00d762f9-eb45-4ef0-92ce-4bff710832a6';