import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

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
  unread_count?: number;
}

export default function Messages() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch last message and other party details for each conversation
      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (convo) => {
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
              onClick={() => navigate(`/messages/${convo.id}`)}
            >
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  {convo.otherParty?.avatar_url ? (
                    <img src={convo.otherParty.avatar_url} alt={convo.otherParty.full_name} />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold">
                        {convo.otherParty?.full_name?.[0] || '?'}
                      </span>
                    </div>
                  )}
                </Avatar>

                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <h3 className="font-semibold whitespace-nowrap">
                    {convo.otherParty?.full_name || 'Unknown User'}
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
    </div>
  );
}
