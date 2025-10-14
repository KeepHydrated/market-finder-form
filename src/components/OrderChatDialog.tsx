import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Package, X, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image?: string;
}

interface Order {
  id: string;
  email: string;
  created_at: string;
  total_amount: number;
  user_id?: string;
  order_items: OrderItem[];
}

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface OrderChatDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  vendorId: string;
  vendorName?: string;
}

export const OrderChatDialog = ({ open, onClose, order, vendorId, vendorName }: OrderChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOrderOpen, setIsOrderOpen] = useState(true);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (open && order && currentUserId) {
      setupConversation();
    }
  }, [open, order, currentUserId]);

  const setupConversation = async () => {
    if (!order || !currentUserId) return;

    try {
      setLoading(true);

      // Try to find existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('order_id', order.id)
        .single();

      if (existingConv) {
        setConversationId(existingConv.id);
        await loadMessages(existingConv.id);
      } else if (order.user_id) {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            buyer_id: order.user_id,
            seller_id: currentUserId,
            order_id: order.id,
            vendor_id: vendorId,
          })
          .select()
          .single();

        if (error) throw error;
        setConversationId(newConv.id);
      }
    } catch (error) {
      console.error('Error setting up conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  useEffect(() => {
    if (conversationId) {
      const channel = supabase
        .channel(`conversation:${conversationId}`)
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
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (!order) return null;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Chat Box - Fullscreen on mobile, floating on desktop */}
      <div 
        className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-96 md:h-[500px] bg-card border-0 md:border md:border-border md:rounded-lg shadow-2xl flex flex-col z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{vendorName || 'Store'}</h3>
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
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Order Items - Show at top */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <Collapsible open={isOrderOpen} onOpenChange={setIsOrderOpen}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Order Items:</p>
                      {isOrderOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2">
                      {order.order_items.map((item) => (
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
                              Qty: {item.quantity} × {formatPrice(item.unit_price)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            {formatPrice(item.total_price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              
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
                  className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.sender_id === currentUserId
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
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={!conversationId}
            />
            <Button type="submit" size="sm" disabled={!newMessage.trim() || !conversationId}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
