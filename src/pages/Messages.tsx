import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FloatingChat } from '@/components/FloatingChat';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  order_id: string | null;
  last_message_at: string;
  vendor_id?: string | null;
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

          // Get store name from the vendor_id if available, otherwise fall back to seller's store
          let storeName = 'Unknown Store';
          if (convo.vendor_id) {
            const { data: vendorSubmission } = await supabase
              .from('submissions')
              .select('store_name')
              .eq('id', convo.vendor_id)
              .maybeSingle();
            storeName = vendorSubmission?.store_name || 'Unknown Store';
          } else {
            // Fallback: use seller's most recent store
            const { data: vendorSubmission } = await supabase
              .from('submissions')
              .select('store_name')
              .eq('user_id', otherPartyId)
              .eq('status', 'accepted')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            storeName = vendorSubmission?.store_name || 'Unknown Store';
          }

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
            store_name: storeName,
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

  const openConversation = (convo: Conversation) => {
    setSelectedConversation(convo);
  };

  const closeConversation = () => {
    setSelectedConversation(null);
    fetchConversations(); // Refresh to update unread counts
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {conversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No conversations yet</p>
        </Card>
      ) : (
        <div className="space-y-0 divide-y">
          {conversations.map((convo) => (
            <div
              key={convo.id}
              className="p-4 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => openConversation(convo)}
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={convo.otherParty?.avatar_url || ''} />
                  <AvatarFallback className="text-base">
                    {convo.store_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-base text-foreground">
                      {convo.store_name || 'Unknown Store'}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(convo.last_message_at), 'MMM d')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate">
                    {convo.lastMessage?.message || 'No messages yet'}
                  </p>
                </div>
                
                {convo.unread_count! > 0 && (
                  <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs ml-2 flex-shrink-0">
                    {convo.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Chat */}
      {selectedConversation && selectedConversation.vendor_id && (
        <FloatingChat
          isOpen={true}
          onClose={closeConversation}
          vendorId={selectedConversation.vendor_id}
          vendorName={selectedConversation.store_name || 'Unknown Store'}
        />
      )}
    </div>
  );
}
