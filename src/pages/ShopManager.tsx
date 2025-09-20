import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Store, Package, ShoppingCart, DollarSign, Edit, Plus, Calendar, Trash2, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProductGrid } from '@/components/ProductGrid';
import { AddProductForm } from '@/components/AddProductForm';
import { AddMarketForm } from '@/components/AddMarketForm';
import { MarketSearch } from '@/components/MarketSearch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShopData {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  search_term: string;
  market_address?: string;
  market_days?: string[];
  market_hours?: any; // Changed from Record to any for flexibility
  status: string;
  vacation_mode?: boolean;
}

interface Order {
  id: string;
  email: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

const SPECIALTY_CATEGORIES = [
  "Fresh Flowers & Plants",
  "Bakery", 
  "Dairy",
  "Rancher",
  "Beverages",
  "Seasonings & Spices",
  "Pets",
  "Home Goods",
  "Farmers",
  "Ready to Eat",
  "Packaged Goods & Snacks",
  "Artisan"
];

export default function ShopManager() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<any[]>([]);
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [editingMarket, setEditingMarket] = useState<any>(null);
  const [replacementMarket, setReplacementMarket] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [vacationMode, setVacationMode] = useState(false);
  const [activeMarketTab, setActiveMarketTab] = useState<number | null>(null);
  const [userSubmittedMarketIds, setUserSubmittedMarketIds] = useState<number[]>([]);

  // Check for public access via URL parameter
  const isPublicAccess = new URLSearchParams(window.location.search).get('demo') === 'true';

  // Fetch user profile
  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    store_name: '',
    primary_specialty: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchShopData();
      fetchMarkets();
      fetchUserProfile();
    } else if (isPublicAccess) {
      // Load demo data for public access
      loadDemoData();
    }
  }, [user, isPublicAccess]);

  useEffect(() => {
    if (shopData) {
      fetchOrders();
    }
  }, [shopData]);

  const fetchShopData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shop data:', error);
        return;
      }

      if (data) {
        console.log('Raw data from database:', [data]); // Debug log
        const parsedData = {
          ...data,
          products: typeof data.products === 'string' ? JSON.parse(data.products) : data.products || [],
          market_hours: (() => {
            try {
              if (typeof data.market_hours === 'string') {
                // Remove extra quotes if present
                let hoursString = data.market_hours;
                if (hoursString.startsWith('"') && hoursString.endsWith('"')) {
                  hoursString = hoursString.slice(1, -1);
                }
                return hoursString;
              }
              return data.market_hours || null;
            } catch (e) {
              console.error('Error parsing market_hours:', e);
              return data.market_hours || null;
            }
          })(),
          selected_markets: (() => {
            try {
              return Array.isArray(data.selected_markets) ? data.selected_markets : [];
            } catch (e) {
              console.error('Error parsing selected_markets:', e);
              return [];
            }
          })()
        };
        console.log('Parsed submissions:', [parsedData]); // Debug log
        setShopData(parsedData);
        setSelectedMarkets(parsedData.selected_markets || []);
        setFormData({
          store_name: parsedData.store_name || '',
          primary_specialty: parsedData.primary_specialty || '',
          website: parsedData.website || '',
          description: parsedData.description || '',
        });
        setMarketSearchTerm(parsedData.search_term || '');
        setVacationMode(parsedData.vacation_mode ?? false);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoadingShop(false);
    }
  };

  const loadDemoData = () => {
    const demoShop: ShopData = {
      id: 'demo-shop-id',
      store_name: 'Demo Fresh Market',
      primary_specialty: 'Organic Produce',
      website: 'https://demo-fresh-market.com',
      description: 'A demonstration shop showcasing fresh, organic produce and artisanal goods. This is a demo version for testing purposes.',
      products: [
        {
          id: 1,
          name: 'Organic Apples',
          price: 450,
          category: 'Fruits',
          description: 'Fresh organic apples from local orchards',
          image: '/placeholder.svg'
        },
        {
          id: 2,
          name: 'Farm Fresh Eggs',
          price: 650,
          category: 'Dairy',
          description: 'Free-range eggs from happy chickens',
          image: '/placeholder.svg'
        },
        {
          id: 3,
          name: 'Artisan Bread',
          price: 550,
          category: 'Bakery',
          description: 'Handcrafted sourdough bread',
          image: '/placeholder.svg'
        }
      ],
      selected_market: 'Downtown Farmers Market',
      search_term: 'Downtown Farmers Market',
      market_address: '123 Main St, Downtown',
      market_days: ['Saturday', 'Sunday'],
      market_hours: { saturday: '8AM-2PM', sunday: '9AM-1PM' },
      status: 'accepted',
      vacation_mode: false
    };

    const demoOrders: Order[] = [
      {
        id: 'demo-order-1',
        email: 'customer@example.com',
        total_amount: 1100,
        status: 'completed',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        order_items: [
          {
            product_name: 'Organic Apples',
            quantity: 2,
            unit_price: 450,
            total_price: 900
          },
          {
            product_name: 'Farm Fresh Eggs',
            quantity: 1,
            unit_price: 650,
            total_price: 650
          }
        ]
      },
      {
        id: 'demo-order-2',
        email: 'another@example.com',
        total_amount: 550,
        status: 'completed',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        order_items: [
          {
            product_name: 'Artisan Bread',
            quantity: 1,
            unit_price: 550,
            total_price: 550
          }
        ]
      }
    ];

    setShopData(demoShop);
    setOrders(demoOrders);
    setFormData({
      store_name: demoShop.store_name,
      primary_specialty: demoShop.primary_specialty,
      website: demoShop.website,
      description: demoShop.description,
    });
    setMarketSearchTerm(demoShop.search_term);
    setVacationMode(demoShop.vacation_mode || false);
    setLoadingShop(false);
    setLoadingOrders(false);
  };

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching markets:', error);
        return;
      }

      setMarkets(data || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const fetchOrders = async () => {
    if (!user || !shopData) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          email,
          total_amount,
          status,
          created_at,
          order_items (
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('vendor_id', shopData.id) // Use shop ID instead of user ID
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveShop = async () => {
    if (!user || !shopData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          store_name: formData.store_name,
          primary_specialty: formData.primary_specialty,
          website: formData.website,
          description: formData.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      toast({
        title: "Shop Updated",
        description: "Your shop information has been successfully updated.",
      });

      setIsEditing(false);
      fetchShopData(); // Refresh data
    } catch (error: any) {
      console.error('Error updating shop:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update shop information.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = (product: any) => {
    if (!shopData) return;

    const updatedProducts = [...(shopData.products || []), { ...product, id: Date.now() }];
    updateProducts(updatedProducts);
    setShowAddProduct(false);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const handleUpdateProduct = (updatedProduct: any) => {
    if (!shopData) return;

    const updatedProducts = shopData.products.map(p => 
      p.id === updatedProduct.id ? updatedProduct : p
    );
    updateProducts(updatedProducts);
    setShowAddProduct(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: number) => {
    if (!shopData) return;

    const updatedProducts = shopData.products.filter(p => p.id !== productId);
    updateProducts(updatedProducts);
  };

  const handleDuplicateProduct = (product: any) => {
    if (!shopData) return;

    const newProduct = {
      ...product,
      id: Date.now(),
      name: `${product.name} (Copy)`
    };
    const updatedProducts = [newProduct, ...shopData.products];
    updateProducts(updatedProducts);
  };

  const updateProducts = async (products: any[]) => {
    if (!shopData || !user) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          products: JSON.stringify(products),
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      setShopData(prev => prev ? { ...prev, products } : null);
      
      toast({
        title: "Products Updated",
        description: "Your product list has been updated.",
      });
    } catch (error: any) {
      console.error('Error updating products:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update products.",
        variant: "destructive",
      });
    }
  };

  const handleMarketSelect = async (market: any) => {
    if (!shopData) return;

    // Check if market is already selected, but allow if we're replacing a market
    if (selectedMarkets.some(m => m.id === market.id) && activeMarketTab === null) {
      toast({
        title: "Market Already Selected",
        description: `${market.name} is already in your selected markets.`,
        variant: "destructive",
      });
      return;
    }

    // If we're editing a market tab (replacement mode)
    if (activeMarketTab !== null) {
      const newSelectedMarkets = [...selectedMarkets];
      newSelectedMarkets[activeMarketTab] = market;
      setSelectedMarkets(newSelectedMarkets);
      
      try {
        setSaving(true);
        const { error } = await supabase
          .from('submissions')
          .update({ 
            selected_markets: newSelectedMarkets,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: "Market Updated",
          description: `Successfully replaced with ${market.name}`,
        });
      } catch (error) {
        console.error('Error updating markets:', error);
        toast({
          title: "Error",
          description: "Failed to update market selection.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // Check if max markets reached (for new additions)
    if (selectedMarkets.length >= 3) {
      toast({
        title: "Maximum Markets Reached",
        description: "You can only select up to 3 farmers markets. Remove one to add a different market.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newSelectedMarkets = [...selectedMarkets, market];
      
      const { error } = await supabase
        .from('submissions')
        .update({
          selected_markets: newSelectedMarkets,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      setSelectedMarkets(newSelectedMarkets);
      setShopData(prev => prev ? {
        ...prev,
        selected_markets: newSelectedMarkets,
      } : null);

      toast({
        title: "Market Added",
        description: `You've joined ${market.name}. ${3 - newSelectedMarkets.length} market slots remaining.`,
      });
    } catch (error: any) {
      console.error('Error selecting market:', error);
      toast({
        title: "Selection Failed",
        description: error.message || "Failed to select market.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMarket = async (marketToRemove: any) => {
    if (!shopData) return;

    try {
      const newSelectedMarkets = selectedMarkets.filter(m => m.id !== marketToRemove.id);
      
      const { error } = await supabase
        .from('submissions')
        .update({
          selected_markets: newSelectedMarkets,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      setSelectedMarkets(newSelectedMarkets);
      setShopData(prev => prev ? {
        ...prev,
        selected_markets: newSelectedMarkets,
      } : null);

      toast({
        title: "Market Removed",
        description: `${marketToRemove.name} has been removed from your selected markets.`,
      });
    } catch (error: any) {
      console.error('Error removing market:', error);
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove market.",
        variant: "destructive",
      });
    }
  };

  const handleReplaceMarket = async (oldMarket: any, newMarket: any) => {
    console.log('handleReplaceMarket called:', {
      oldMarket: oldMarket.name,
      newMarket: newMarket.name,
      currentSelectedMarkets: selectedMarkets.map((m: any) => m.name)
    });
    
    if (!shopData) return;

    try {
      const newSelectedMarkets = selectedMarkets.map(m => m.id === oldMarket.id ? newMarket : m);
      
      const { error } = await supabase
        .from('submissions')
        .update({
          selected_markets: newSelectedMarkets,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      console.log('Updated selected markets:', newSelectedMarkets.map((m: any) => m.name));
      setSelectedMarkets(newSelectedMarkets);
      setShopData(prev => prev ? {
        ...prev,
        selected_markets: newSelectedMarkets,
      } : null);

      toast({
        title: "Market Replaced",
        description: `${oldMarket.name} has been replaced with ${newMarket.name}.`,
      });
    } catch (error: any) {
      console.error('Error replacing market:', error);
      toast({
        title: "Replacement Failed",
        description: error.message || "Failed to replace market.",
        variant: "destructive",
      });
    }
  };

  const handleEditMarket = (market: any) => {
    setEditingMarket(market);
    setShowAddMarket(true);
  };

  const handleAddMarket = async (marketData: any) => {
    console.log('handleAddMarket called with:', marketData);
    console.log('EditingMarket:', editingMarket);
    
    try {
      // Format the hours object as JSON string for database storage
      const formattedMarketData = {
        name: marketData.name,
        address: marketData.address,
        city: marketData.city || '',
        state: marketData.state || '',
        days: marketData.days,
        hours: JSON.stringify(marketData.hours)
      };

      console.log('Formatted market data:', formattedMarketData);

      let data;
      if (editingMarket) {
        // Update existing market
        const { data: updateData, error } = await supabase
          .from('markets')
          .update(formattedMarketData)
          .eq('id', editingMarket.id)
          .select()
          .single();

        if (error) throw error;
        data = updateData;

        // Update the markets list
        setMarkets(prev => prev.map(m => m.id === editingMarket.id ? data : m));
        
        toast({
          title: "Market Updated",
          description: `${marketData.name} has been updated.`,
        });
      } else {
        // Create new market
        const { data: insertData, error } = await supabase
          .from('markets')
          .insert([{
            ...formattedMarketData,
            user_id: user?.id // Track who created this market
          }])
          .select()
          .single();

        if (error) throw error;
        data = insertData;

        setMarkets(prev => [...prev, data]);
        
        // Track this as a user-submitted market
        setUserSubmittedMarketIds(prev => [...prev, data.id]);
        
        toast({
          title: "Market Added",
          description: `${marketData.name} has been added to available markets.`,
        });
      }

      // Handle replacement logic when replacementMarket is set (replacement scenario)
      if (replacementMarket) {
        // Find the market to replace in selectedMarkets
        const marketIndex = selectedMarkets.findIndex(m => m.id === replacementMarket.id);
        if (marketIndex !== -1) {
          const newSelectedMarkets = [...selectedMarkets];
          newSelectedMarkets[marketIndex] = data;
          
          // Update the database
          const { error: updateError } = await supabase
            .from('submissions')
            .update({ 
              selected_markets: newSelectedMarkets,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user?.id);

          if (updateError) throw updateError;

          setSelectedMarkets(newSelectedMarkets);
          setShopData(prev => prev ? {
            ...prev,
            selected_markets: newSelectedMarkets,
          } : null);

          toast({
            title: "Market Replaced",
            description: `${replacementMarket.name} has been replaced with ${marketData.name}.`,
          });
        }
      } else if (!editingMarket) {
        // For new market creation without replacement, add to selected markets if under limit
        if (selectedMarkets.length < 3) {
          const newSelectedMarkets = [...selectedMarkets, data];
          
          // Update the database
          const { error: updateError } = await supabase
            .from('submissions')
            .update({ 
              selected_markets: newSelectedMarkets,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user?.id);

          if (updateError) throw updateError;

          setSelectedMarkets(newSelectedMarkets);
          setShopData(prev => prev ? {
            ...prev,
            selected_markets: newSelectedMarkets,
          } : null);

          // Set the newly added market as the active tab
          setActiveMarketTab(newSelectedMarkets.length - 1);
          
          toast({
            title: "Market Added to Selection",
            description: `${marketData.name} has been added to your selected markets.`,
          });
        }
      }

      setShowAddMarket(false);
      setEditingMarket(null);
      setReplacementMarket(null);

    } catch (error: any) {
      console.error('Error with market:', error);
      toast({
        title: editingMarket ? "Update Failed" : "Add Failed",
        description: error.message || `Failed to ${editingMarket ? 'update' : 'add'} market.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMarket = async (market: any) => {
    try {
      const { error } = await supabase
        .from('markets')
        .delete()
        .eq('id', market.id);

      if (error) throw error;

      // Remove from markets list
      setMarkets(prev => prev.filter(m => m.id !== market.id));
      
      // Remove from user submitted market IDs
      setUserSubmittedMarketIds(prev => prev.filter(id => id !== market.id));
      
      // Remove from selected markets if it was selected
      const updatedSelectedMarkets = selectedMarkets.filter(m => m.id !== market.id);
      setSelectedMarkets(updatedSelectedMarkets);
      
      // Update database if it was in selected markets
      if (selectedMarkets.some(m => m.id === market.id)) {
        await supabase
          .from('submissions')
          .update({ 
            selected_markets: updatedSelectedMarkets,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);
      }

      // Reset active tab if needed
      if (activeMarketTab !== null && selectedMarkets[activeMarketTab]?.id === market.id) {
        setActiveMarketTab(null);
      }

      toast({
        title: "Market Deleted",
        description: `${market.name} has been removed from available markets.`,
      });

      setShowAddMarket(false);
      setEditingMarket(null);
    } catch (error: any) {
      console.error('Error deleting market:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete market.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    try {
      // First delete user's profile and related data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Delete user's submissions (shops)
      const { error: submissionsError } = await supabase
        .from('submissions')
        .delete()
        .eq('user_id', user.id);

      if (submissionsError) throw submissionsError;

      // Delete the auth user account
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) throw authError;

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Sign out and redirect to homepage
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteShop = async () => {
    if (!user || !shopData) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', shopData.id);

      if (error) throw error;

      toast({
        title: "Shop Deleted",
        description: "Your shop has been permanently deleted.",
      });

      // Navigate to homepage after deletion
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete shop.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVacationModeToggle = async (enabled: boolean) => {
    if (!user || !shopData || isPublicAccess) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          vacation_mode: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopData.id);

      if (error) throw error;

      setVacationMode(enabled);
      setShopData(prev => prev ? { ...prev, vacation_mode: enabled } : null);

      toast({
        title: enabled ? "Vacation Mode Enabled" : "Vacation Mode Disabled",
        description: enabled 
          ? "Your shop is now marked as on vacation and won't appear in search results." 
          : "Your shop is now active and visible to customers.",
      });
    } catch (error: any) {
      console.error('Error updating vacation mode:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update vacation mode.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTotalRevenue = () => {
    return orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.total_amount, 0);
  };

  const getTotalOrders = () => {
    return orders.filter(order => order.status === 'completed').length;
  };

  if (loading || loadingShop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user && !isPublicAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to manage your shop.
            </p>
            <AuthForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Shop Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don't have an approved shop yet. Please complete the vendor application process first.
            </p>
            <Button onClick={() => window.location.href = '/profile'}>
              Go to Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          {isPublicAccess && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium">
                🎯 Demo Mode - This is a demonstration of the shop manager interface
              </p>
              <p className="text-blue-600 text-sm mt-1">
                All data shown is sample data for demonstration purposes
              </p>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="flex gap-6">
          <TabsList className="flex flex-col h-fit w-48 space-y-1 p-1">
            <TabsTrigger value="overview" className="w-full justify-start">Overview</TabsTrigger>
            <TabsTrigger value="shop" className="w-full justify-start">Shop Information</TabsTrigger>
            <TabsTrigger value="products" className="w-full justify-start">Products</TabsTrigger>
            <TabsTrigger value="account" className="w-full justify-start">Account</TabsTrigger>
          </TabsList>

          <div className="flex-1 space-y-6">

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(getTotalRevenue())}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalOrders()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{shopData.products?.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders yet. Orders will appear here once customers start purchasing your products.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium">Order #{order.id.slice(0, 8)}...</p>
                              <p className="text-sm text-muted-foreground">{order.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatPrice(order.total_amount)}</p>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <Separator className="my-3" />
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Items:</p>
                            {order.order_items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.product_name}</span>
                                <span>{formatPrice(item.total_price)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="shop" className="space-y-6 max-w-2xl">
            <Tabs defaultValue="markets" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="markets">Farmers Markets</TabsTrigger>
                <TabsTrigger value="store">Store Information</TabsTrigger>
              </TabsList>
              
               <TabsContent value="markets" className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                     <MarketSearch
                       markets={markets}
                       searchTerm={marketSearchTerm}
                       onSearchTermChange={setMarketSearchTerm}
                       onSelectMarket={handleMarketSelect}
                          onAddMarket={(replacementMarket) => {
                            // Store replacement context separately, don't set as editingMarket
                            setReplacementMarket(replacementMarket);
                            setEditingMarket(null); // Keep null so form shows as "Add Market"
                            setShowAddMarket(true);
                          }}
                       onEditMarket={handleEditMarket}
                       submittedMarketName={shopData?.selected_market}
                       selectedMarkets={selectedMarkets}
                       onRemoveMarket={handleRemoveMarket}
                       activeMarketTab={activeMarketTab}
                       onMarketTabChange={setActiveMarketTab}
                       onReplaceMarket={handleReplaceMarket}
                       userSubmittedMarketIds={userSubmittedMarketIds}
                     />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="store" className="space-y-4">
                <div className="flex gap-4 items-start">
                  <Card className="flex-1">
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-2">
                        <Label htmlFor="store_name">Store Name</Label>
                        <Input
                          id="store_name"
                          value={formData.store_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialty">Primary Specialty</Label>
                        <Select
                          value={formData.primary_specialty}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, primary_specialty: value }))}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a specialty" />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIALTY_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          disabled={!isEditing}
                          placeholder="https://example.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          disabled={!isEditing}
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Edit button positioned to the side of the card */}
                  <Button
                    variant={isEditing ? "outline" : "default"}
                    onClick={() => {
                      if (isEditing) {
                        handleSaveShop();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    disabled={isSaving}
                    className="shrink-0"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Management</CardTitle>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardHeader>
              <CardContent>
                <ProductGrid
                  products={shopData.products || []}
                  onDeleteProduct={handleDeleteProduct}
                  onDuplicateProduct={handleDuplicateProduct}
                  onEditProduct={handleEditProduct}
                  vendorId={shopData.id}
                  vendorName={shopData.store_name}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Account Information
                </CardTitle>
              </CardHeader>
              {/* Reduced spacing in Account tab content */}
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">Vacation Mode</div>
                    <p className="text-sm text-muted-foreground">
                      {vacationMode 
                        ? "Your store is currently on vacation and hidden from customers" 
                        : "Your store is active and visible to customers"
                      }
                    </p>
                  </div>
                  <Switch
                    checked={vacationMode}
                    onCheckedChange={handleVacationModeToggle}
                    disabled={isPublicAccess}
                  />
                </div>

                {!isPublicAccess && (
                  <div className="pt-6">
                    <Separator className="mb-4" />
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-destructive">Delete Account</h3>
                            <p className="text-sm text-muted-foreground">
                              Permanently delete your entire account, including all shops, products, and personal data.
                            </p>
                          </div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                className="w-fit"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Account
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete your entire account, 
                                  including all shops, products, orders, and personal data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={handleDeleteAccount}
                                  disabled={isDeletingAccount}
                                >
                                  {isDeletingAccount ? "Deleting..." : "Yes, delete account"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          </div>
        </Tabs>
      </div>

      <AddProductForm
        open={showAddProduct}
        onClose={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
        }}
        onProductAdded={editingProduct ? handleUpdateProduct : handleAddProduct}
        editingProduct={editingProduct}
      />

      <AddMarketForm
        open={showAddMarket}
        onClose={() => {
          setShowAddMarket(false);
          setEditingMarket(null);
        }}
        onMarketAdded={handleAddMarket}
        editingMarket={editingMarket}
        userZipcode={userProfile?.zipcode}
        onDeleteMarket={handleDeleteMarket}
      />
    </div>
  );
}