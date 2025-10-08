-- Add DELETE policy for conversations so users can delete conversations related to their shops
CREATE POLICY "Users can delete their own conversations" 
ON public.conversations 
FOR DELETE 
USING (
  (auth.uid() = buyer_id) OR (auth.uid() = seller_id)
);