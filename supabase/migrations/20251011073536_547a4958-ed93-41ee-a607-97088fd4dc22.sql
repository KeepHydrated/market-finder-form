-- Allow vendors to view order items for their orders
CREATE POLICY "Vendors can view order items for their orders"
ON order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    INNER JOIN submissions s ON s.id = o.vendor_id
    WHERE o.id = order_items.order_id
    AND s.user_id = auth.uid()
    AND s.status = 'accepted'
  )
);