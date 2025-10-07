import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { ArrowLeft, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface ConversationDetails {
  id: string;
  buyer_id: string;
  seller_id: string;
  otherParty?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function Conversation() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !conversationId) {
      navigate('/auth');
      return;
    }

    fetchConversation();
    fetchMessages();

    // Subscribe to real-time message updates
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, navigate]);

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    if (!conversationId || !user) return;

    try {
      const { data: convo, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      const otherPartyId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', otherPartyId)
        .maybeSingle();

      setConversation({
        ...convo,
        otherParty: profile || undefined,
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user || !conversationId) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !conversationId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message: newMessage.trim(),
      });

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-muted-foreground">Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/messages')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Messages
        </Button>

        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            {conversation.otherParty?.avatar_url ? (
              <img src={conversation.otherParty.avatar_url} alt={conversation.otherParty.full_name} />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold">
                  {conversation.otherParty?.full_name?.[0] || '?'}
                </span>
              </div>
            )}
          </Avatar>
          <h1 className="text-2xl font-bold">
            {conversation.otherParty?.full_name || 'Unknown User'}
          </h1>
        </div>
      </div>

      <Card className="flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {format(new Date(msg.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="resize-none"
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="h-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
