import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ADMIN_USER_ID = '58f0d985-e620-4555-bd6a-ef2a5ee29cd7';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportChat({ isOpen, onClose }: SupportChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    let channel: any = null;

    const initConversation = async () => {
      setLoading(true);

      // Find existing support conversation (buyer=user, seller=admin, no vendor_id)
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', ADMIN_USER_ID)
        .is('vendor_id', null)
        .maybeSingle();

      let convId = existingConv?.id;

      if (!convId) {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            buyer_id: user.id,
            seller_id: ADMIN_USER_ID,
            vendor_id: null,
            order_id: null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating support conversation:', error);
          toast({ title: 'Error', description: 'Failed to start chat', variant: 'destructive' });
          setLoading(false);
          return;
        }
        convId = newConv.id;
      }

      setConversationId(convId);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);

      channel = supabase
        .channel(`support-chat-${convId}-${Date.now()}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        })
        .subscribe();

      setLoading(false);
    };

    initConversation();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isOpen, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user) return;

    const text = newMessage.trim();
    setNewMessage('');
    inputRef.current?.focus();

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: text,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
      return;
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Forward to external webhook (fire and forget)
    supabase.functions.invoke('send-chat-sms', {
      body: {
        message: text,
        senderName: user.email || 'Customer',
        chatType: 'support',
        conversationId,
      },
    }).catch(err => console.error('Chat forwarding failed:', err));
  };

  if (!isOpen) return null;

  // Not logged in - prompt to sign in
  if (!user) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-[99998]" onClick={onClose} />
        <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 w-full md:w-96 h-[100dvh] md:h-[400px] bg-card md:rounded-lg border-0 md:border md:border-border shadow-2xl flex flex-col z-[99999]">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold text-foreground">Support Chat</span>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">Sign in to chat with us!</p>
            <Button onClick={() => { onClose(); navigate('/auth'); }}>
              Sign In
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[99998]" onClick={onClose} />
      <div
        className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 w-full md:w-96 h-[100dvh] md:h-[500px] bg-card md:rounded-lg border-0 md:border md:border-border shadow-2xl flex flex-col z-[99999]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-semibold text-foreground">Support Chat</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <p className="text-sm text-center text-muted-foreground max-w-[80%]">
                  👋 Hi! We're here to help. Send us a message and we'll get back to you soon.
                </p>
              </div>

              {messages.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground text-center text-sm">Start the conversation!</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.sender_id === user.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSend} className="p-4 pb-safe border-t border-border bg-card flex-shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
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
  );
}
