import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type LikeType = 'market' | 'vendor' | 'product';

export interface LikedItem {
  id: string;
  item_id: string;
  item_type: LikeType;
  created_at: string;
}

export const useLikes = (itemType?: LikeType) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState<LikedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLikes = async () => {
    if (!user) {
      setLikes([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching likes:', error);
        toast.error('Failed to load likes');
        return;
      }

      // Cast the data to proper types
      const typedData: LikedItem[] = (data || []).map(item => ({
        ...item,
        item_type: item.item_type as LikeType
      }));

      setLikes(typedData);
    } catch (error) {
      console.error('Error fetching likes:', error);
      toast.error('Failed to load likes');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (itemId: string, type: LikeType) => {
    if (!user) {
      toast.error('Please sign in to like items');
      return false;
    }

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', type)
        .maybeSingle();

      if (existingLike) {
        // Unlike - delete the like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) {
          console.error('Error removing like:', error);
          toast.error('Failed to remove like');
          return false;
        }

        // Update local state
        setLikes(prev => prev.filter(like => like.id !== existingLike.id));
        toast.success('Removed from likes');
        return false;
      } else {
        // Like - create new like
        const { data, error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            item_id: itemId,
            item_type: type
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding like:', error);
          toast.error('Failed to add like');
          return false;
        }

        // Update local state with proper typing
        const newLike: LikedItem = {
          ...data,
          item_type: data.item_type as LikeType
        };
        setLikes(prev => [newLike, ...prev]);
        toast.success('Added to likes');
        return true;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
      return false;
    }
  };

  const isLiked = (itemId: string, type: LikeType) => {
    return likes.some(like => like.item_id === itemId && like.item_type === type);
  };

  useEffect(() => {
    fetchLikes();
  }, [user, itemType]);

  return {
    likes,
    loading,
    toggleLike,
    isLiked,
    refetch: fetchLikes
  };
};