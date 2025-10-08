import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  order_id: string | null;
  last_message_at: string;
  lastMessage?: {
    message: string;
    sender_id: string;
  };
  otherParty?: {
    full_name: string;
    avatar_url: string | null;
  };
  store_name?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function Messages() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, authLoading]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data: convos, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Remove duplicates and fetch details
      const uniqueConvos = Array.from(new Map(convos?.map(c => [c.id, c])).values());

      // Fetch last message and other party details for each conversation
      const conversationsWithDetails = await Promise.all(
        (uniqueConvos || []).map(async (convo) => {
          const otherPartyId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('message, sender_id')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get other party profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', otherPartyId)
            .maybeSingle();

          // Get store name - use most recent accepted submission
          const { data: vendorSubmission } = await supabase
            .from('submissions')
            .select('store_name')
            .eq('user_id', otherPartyId)
            .eq('status', 'accepted')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...convo,
            lastMessage: lastMsg || undefined,
            otherParty: profile || undefined,
            store_name: vendorSubmission?.store_name || undefined,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (convo: Conversation) => {
    // Clean up previous subscription
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Reset state and use the conversation data from the list (including store_name)
    setMessages([]);
    setNewMessage('');
    setSelectedConversation(convo); // Use the conversation as-is with its store_name
    setLoadingMessages(true);

    try {
      // Fetch messages for this specific conversation
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(msgs || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', convo.id)
        .neq('sender_id', user!.id)
        .eq('is_read', false);

      // Subscribe to new messages for this conversation
      const channel = supabase
        .channel(`conversation-${convo.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convo.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const closeConversation = async () => {
    // Clean up subscription
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setSelectedConversation(null);
    setMessages([]);
    setNewMessage('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          message: newMessage.trim(),
        });

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      fetchConversations(); // Refresh conversation list
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0 && selectedConversation) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, selectedConversation]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No conversations yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((convo) => (
            <Card
              key={convo.id}
              className="p-4 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => openConversation(convo)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <h3 className="font-semibold whitespace-nowrap">
                    {convo.store_name || 'Unknown Store'}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {convo.lastMessage?.message || 'No messages yet'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(convo.last_message_at), 'MMM d')}
                  </span>
                  {convo.unread_count! > 0 && (
                    <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs">
                      {convo.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Chat Box */}
      {selectedConversation && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closeConversation}
          />
          
          {/* Chat Box */}
          <div 
            className="fixed bottom-4 right-4 w-96 h-[500px] bg-card border border-border rounded-lg shadow-2xl flex flex-col z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {selectedConversation.store_name || 'Unknown Store'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeConversation}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading messages...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground text-center text-sm">
                        Start the conversation!
                      </p>
                    </div>
                  )}
                  
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
