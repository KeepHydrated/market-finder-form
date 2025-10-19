import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface ConversationDetails {
  id: string;
  buyer_id: string;
  seller_id: string;
  order_id: string | null;
  buyer_name: string;
  seller_name: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;  // This is actually the submission/store ID
  vendorName: string;
  orderItems?: OrderItem[];
}

export function FloatingChat({ isOpen, onClose, vendorId, vendorName, orderItems }: FloatingChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if we're already on this vendor's page
  const isOnVendorPage = location.pathname === '/market' && searchParams.get('id') === vendorId;

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user || !vendorId) return;

    let channel: any = null;

    const initConversation = async () => {
      setLoading(true);
      
      // vendorId is actually the submission ID in this context
      const vendorSubmissionId = vendorId;
      
      // Get the user_id from the submission
      const { data: vendorSubmission } = await supabase
        .from('submissions')
        .select('user_id, id')
        .eq('id', vendorSubmissionId)
        .single();
      
      if (!vendorSubmission) {
        console.error('Vendor submission not found');
        setLoading(false);
        return;
      }

      const sellerId = vendorSubmission.user_id;
      
      console.log('🔍 FloatingChat - Looking for conversation:', {
        vendorSubmissionId,
        sellerId,
        vendorName,
        userId: user.id
      });

      // Find or create conversation - must match buyer, seller AND vendor_id
      const { data: existingConv, error: findError } = await supabase
        .from('conversations')
        .select(`
          id,
          buyer_id,
          seller_id,
          order_id,
          vendor_id
        `)
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .eq('vendor_id', vendorSubmissionId)
        .maybeSingle();
      
      console.log('🔍 FloatingChat - Existing conversation:', existingConv);

      if (findError) {
        console.error('Error finding conversation:', findError);
        setLoading(false);
        return;
      }

      let conversationId = existingConv?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            order_id: null,
            vendor_id: vendorSubmissionId
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          toast({
            title: "Error",
            description: "Failed to start conversation",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        conversationId = newConv.id;
      }

      setConversation({
        id: conversationId,
        buyer_id: existingConv?.buyer_id || user.id,
        seller_id: existingConv?.seller_id || sellerId,
        order_id: existingConv?.order_id || null,
        buyer_name: '',
        seller_name: vendorName
      });

      // Load messages
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgsError) {
        console.error('Error loading messages:', msgsError);
      } else {
        setMessages(msgs || []);
      }

      // Subscribe to new messages
      channel = supabase
        .channel(`conversation-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log('New message received:', payload);
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });

      setLoading(false);
    };

    initConversation();

    return () => {
      if (channel) {
        console.log('Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen, user, vendorId, vendorName, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || !user) return;

    // Keep focus before any async operations (critical for mobile)
    const input = inputRef.current;
    
    const messageText = newMessage.trim();
    setNewMessage('');

    // Immediately refocus to prevent keyboard from closing
    input?.focus();

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        message: messageText
      });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return;
    }

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Refocus again after async operations
    input?.focus();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Chat Box - Fullscreen on mobile, floating on desktop */}
      <div 
        className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 w-full md:w-96 h-[100dvh] md:h-[500px] bg-card md:rounded-lg border-0 md:border md:border-border shadow-2xl flex flex-col z-[9999]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {isOnVendorPage ? (
            <button 
              onClick={onClose}
              className="font-semibold text-foreground hover:underline"
            >
              {vendorName}
            </button>
          ) : (
            <Link 
              to={`/market?id=${vendorId}`}
              className="font-semibold text-foreground hover:underline"
            >
              {vendorName}
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 [&>[data-radix-scroll-area-scrollbar]]:md:flex [&>[data-radix-scroll-area-scrollbar]]:hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Order Items - Show at top if available */}
            {orderItems && orderItems.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Order Items:</p>
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.product_image && (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × ${(item.unit_price / 100).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        ${(item.total_price / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Welcome message */}
            {!orderItems && (
              <div className="flex justify-center">
                <div className="max-w-[80%]">
                  <p className="text-sm text-center text-muted-foreground">
                    {vendorName} can help answer questions about their products and availability
                  </p>
                </div>
              </div>
            )}
            
            {messages.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground text-center text-sm">
                  Start the conversation!
                </p>
              </div>
            )}
            
            {/* User messages */}
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
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 pb-safe border-t border-border bg-card flex-shrink-0">
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
