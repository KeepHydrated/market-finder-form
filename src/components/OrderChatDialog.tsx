import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Mail, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

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
}

export const OrderChatDialog = ({ open, onClose, order, vendorId }: OrderChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Message Buyer</DialogTitle>
        </DialogHeader>

        {/* Order Details Section */}
        <div className="px-6 pb-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.email}</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {formatDate(order.created_at)}
              </span>
            </div>
            
            <Separator className="my-3" />
            
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background rounded overflow-hidden flex-shrink-0">
                    {item.product_image ? (
                      <img 
                        src={item.product_image} 
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.quantity > 1 && `(x${item.quantity}) `}
                      {item.product_name}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {formatPrice(item.total_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Messages Section */}
        <div className="flex-1 flex flex-col min-h-0 px-6">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-4">
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
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
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.sender_id === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <span className="text-xs opacity-70 mt-1 block">
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
          <div className="py-4 border-t">
            <div className="flex gap-2">
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
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !conversationId}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
