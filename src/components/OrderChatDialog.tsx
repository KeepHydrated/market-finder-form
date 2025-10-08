import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[650px] flex flex-col p-0 gap-0 [&>button]:hidden">
        {/* Header with vendor name and close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold">{vendorName || 'Store'}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Collapsible Order Details Section */}
        <Collapsible open={isOrderOpen} onOpenChange={setIsOrderOpen}>
          <div className="px-6 pt-4">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Order Items:</span>
                {isOrderOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 p-4 border rounded-lg space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatPrice(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-semibold">
                      {formatPrice(item.total_price)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Messages Section */}
        <div className="flex-1 flex flex-col min-h-0 px-6 pt-4">
          <ScrollArea className="flex-1">
            <div className="space-y-3 pb-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        msg.sender_id === currentUserId
                          ? 'bg-[#4CAF50] text-white'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <span className={`text-xs mt-1 block ${
                        msg.sender_id === currentUserId ? 'text-white/80' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="py-4 border-t mt-auto">
            <div className="flex gap-3 items-center">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                disabled={!conversationId}
                className="flex-1 rounded-full bg-muted border-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !conversationId}
                size="icon"
                className="rounded-full bg-[#4CAF50] hover:bg-[#45a049] h-12 w-12"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
