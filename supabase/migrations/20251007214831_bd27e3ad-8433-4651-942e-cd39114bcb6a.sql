-- Create conversations table
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their own conversations"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can update messages they can view"
  ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;