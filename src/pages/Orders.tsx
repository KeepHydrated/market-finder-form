import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, Calendar, Store, DollarSign, Mail, Phone, Star, Upload, X, ArrowLeftRight } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { FloatingChat } from "@/components/FloatingChat";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface OrderItem {
  id: string;
  product_name: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image: string;
}

interface Order {
  id: string;
  total_amount: number;
  vendor_name: string;
  vendor_id: string;
  email: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
  tracking_number?: string;
  tracking_carrier?: string;
  tracking_url?: string;
  estimated_delivery_date?: string;
  ship_from_city?: string;
  ship_from_state?: string;
  ship_to_city?: string;
  ship_to_state?: string;
}

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedVendorName, setSelectedVendorName] = useState<string | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatVendorId, setChatVendorId] = useState<string | null>(null);
  const [chatVendorName, setChatVendorName] = useState<string | null>(null);
  const [chatOrderItems, setChatOrderItems] = useState<OrderItem[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [userReviews, setUserReviews] = useState<Set<string>>(new Set());
  const [productReviews, setProductReviews] = useState<Set<string>>(new Set());
  const [reviewType, setReviewType] = useState<'vendor' | 'product'>('vendor');
  const [reviewProduct, setReviewProduct] = useState<OrderItem | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchUserReviews();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserReviews = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('vendor_id, product_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (data) {
        // Track general vendor reviews (where product_id is null)
        const reviewedVendors = new Set(
          data.filter(review => !review.product_id).map(review => review.vendor_id)
        );
        setUserReviews(reviewedVendors);

        // Track product reviews (where product_id is not null)
        const reviewedProducts = new Set(
          data.filter(review => review.product_id).map(review => review.product_id!)
        );
        setProductReviews(reviewedProducts);
      }
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Fetch all orders - RLS policy handles showing both buyer orders and vendor orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          vendor_name,
          vendor_id,
          email,
          status,
          created_at,
          tracking_number,
          tracking_carrier,
          tracking_url,
          estimated_delivery_date,
          ship_from_city,
          ship_from_state,
          ship_to_city,
          ship_to_state,
          user_id,
          order_items (
            id,
            product_name,
            product_description,
            quantity,
            unit_price,
            total_price,
            product_image
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch current store names from submissions
      if (ordersData && ordersData.length > 0) {
        const vendorIds = [...new Set(ordersData.map(order => order.vendor_id))];
        const { data: submissions } = await supabase
          .from('submissions')
          .select('id, store_name')
          .in('id', vendorIds);

        // Create a map of vendor_id to current store_name
        const storeNameMap = new Map(
          submissions?.map(sub => [sub.id, sub.store_name]) || []
        );

        // Update orders with current store names
        const updatedOrders = ordersData.map(order => ({
          ...order,
          vendor_name: storeNameMap.get(order.vendor_id) || order.vendor_name
        }));

        setOrders(updatedOrders);
      } else {
        setOrders(ordersData || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500 hover:bg-green-600';
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600';
      case 'processing':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handleVendorClick = async (vendorId: string, vendorName: string) => {
    try {
      // Fetch the vendor data from submissions
      const { data: vendor, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', vendorId)
        .eq('status', 'accepted')
        .single();

      if (error) throw error;

      if (!vendor) {
        toast({
          title: "Store not found",
          description: "This store is no longer available.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to the vendor page with the vendor data
      navigate('/market', {
        state: {
          type: 'vendor',
          selectedVendor: vendor,
          allVendors: [vendor],
        }
      });
    } catch (error) {
      console.error('Error fetching vendor:', error);
      toast({
        title: "Error",
        description: "Failed to load store information.",
        variant: "destructive",
      });
    }
  };

  const handleProductClick = (item: OrderItem, vendorId: string, vendorName: string) => {
    const product = {
      id: parseInt(item.id),
      name: item.product_name,
      description: item.product_description || '',
      price: item.unit_price / 100, // Convert from cents to dollars
      images: item.product_image ? [item.product_image] : [],
    };
    
    setSelectedProduct(product);
    setSelectedVendorId(vendorId);
    setSelectedVendorName(vendorName);
  };

  const handleTrackPackage = (order: Order) => {
    if (order.tracking_url) {
      window.open(order.tracking_url, '_blank');
    } else if (order.tracking_number && order.tracking_carrier) {
      // Generate tracking URLs based on carrier
      let trackingUrl = '';
      switch (order.tracking_carrier.toLowerCase()) {
        case 'usps':
          trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`;
          break;
        case 'ups':
          trackingUrl = `https://www.ups.com/track?tracknum=${order.tracking_number}`;
          break;
        case 'fedex':
          trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`;
          break;
        default:
          toast({
            title: "Tracking Number Available",
            description: `Tracking #: ${order.tracking_number} (${order.tracking_carrier})`,
          });
          return;
      }
      window.open(trackingUrl, '_blank');
    } else {
      toast({
        title: "Tracking Not Available",
        description: "Tracking information will be updated once the order ships.",
      });
    }
  };

  const handleMessageSeller = async (order: Order) => {
    if (!user) return;

    // Open floating chat with order items
    setChatVendorId(order.vendor_id);
    setChatVendorName(order.vendor_name);
    setChatOrderItems(order.order_items);
    setChatOpen(true);
  };

  const handleHelpWithOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowHelpDialog(true);
  };

  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setShowReceiptDialog(true);
  };

  const hasPackageArrived = (order: Order) => {
    if (!order.estimated_delivery_date) return false;
    const deliveryDate = new Date(order.estimated_delivery_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate <= today;
  };

  const handleLeaveReview = (order: Order, type: 'vendor' | 'product' = 'vendor', product?: OrderItem) => {
    setReviewOrder(order);
    setReviewType(type);
    setReviewProduct(product || null);
    setReviewRating(0);
    setReviewComment('');
    setReviewPhotos([]);
    setShowReviewDialog(true);
  };

  const toggleFlip = (orderId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleReviewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = reviewPhotos.length;
    const remainingSlots = 5 - totalPhotos;
    const filesToAdd = files.slice(0, remainingSlots);
    setReviewPhotos(prev => [...prev, ...filesToAdd]);
  };

  const removeReviewPhoto = (index: number) => {
    setReviewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!user || !reviewOrder) return;

    if (reviewRating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);

    try {
      // Upload photos if any
      let photoUrls: string[] = [];
      if (reviewPhotos.length > 0) {
        const uploadPromises = reviewPhotos.map(async (photo, index) => {
          const fileExt = photo.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('review-photos')
            .upload(fileName, photo);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('review-photos')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        photoUrls = await Promise.all(uploadPromises);
      }

      // Prepare review data with product info if it's a product review
      const reviewData: any = {
        user_id: user.id,
        vendor_id: reviewOrder.vendor_id,
        rating: reviewRating,
        comment: reviewComment || null,
        photos: photoUrls.length > 0 ? photoUrls : null,
      };

      if (reviewType === 'product' && reviewProduct) {
        reviewData.product_id = reviewProduct.id;
        reviewData.product_name = reviewProduct.product_name;
        reviewData.product_image = reviewProduct.product_image;
      }

      // Submit review
      const { error } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (error) throw error;

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });

      // Update local state
      if (reviewType === 'product' && reviewProduct) {
        setProductReviews(prev => new Set([...prev, reviewProduct.id]));
      } else {
        setUserReviews(prev => new Set([...prev, reviewOrder.vendor_id]));
      }
      setShowReviewDialog(false);
      setReviewOrder(null);
      setReviewRating(0);
      setReviewComment('');
      setReviewPhotos([]);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "Failed to submit review",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">Sign In to View Orders</h1>
          <AuthForm />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Your Market's Orders</h1>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">
              Start shopping at your local farmer's market to see orders here.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Start Shopping
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 max-w-5xl">
          {orders.map((order) => {
            const isFlipped = flippedCards[order.id] || false;
            
            return (
            <div key={order.id} className="grid md:grid-cols-[1fr,280px] gap-6">
              {/* Desktop view - always show both cards */}
              <Card className="overflow-hidden hidden md:block">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-base flex-wrap md:flex-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground hidden md:inline">Purchased from</span>
                      <Store className="h-4 w-4" />
                      <button
                        onClick={() => handleVendorClick(order.vendor_id, order.vendor_name)}
                        className="font-semibold hover:underline focus:outline-none focus:underline"
                      >
                        {order.vendor_name}
                      </button>
                    </div>
                    <span className="text-muted-foreground w-full md:w-auto text-sm md:text-base"><span className="hidden md:inline">on </span>{formatDate(order.created_at)}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  
                  <div className="space-y-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 py-2">
                        <button
                          onClick={() => handleProductClick(item, order.vendor_id, order.vendor_name)}
                          className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Show Package icon as fallback if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-green-600"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
                              }}
                            />
                          ) : (
                            <Package className="h-6 w-6 text-green-600" />
                          )}
                        </button>
                        <div className="flex-1 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <button
                              onClick={() => handleProductClick(item, order.vendor_id, order.vendor_name)}
                              className="font-medium text-left hover:underline focus:outline-none focus:underline block"
                            >
                              {item.product_name}
                            </button>
                            <p className="font-medium text-muted-foreground">{formatPrice(item.total_price)}</p>
                            {item.quantity > 1 && (
                              <p className="text-sm text-muted-foreground">
                                Quantity: {item.quantity}
                              </p>
                            )}
                          </div>
                          {hasPackageArrived(order) && !productReviews.has(item.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLeaveReview(order, 'product', item)}
                              className="whitespace-nowrap flex-shrink-0"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex-col gap-3 hidden md:flex">
                <div>
                  {order.estimated_delivery_date ? (
                    <h3 className="text-lg font-serif mb-1">
                      Arriving {new Date(order.estimated_delivery_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                  ) : (
                    <h3 className="text-lg font-serif mb-1">Preparing for shipment</h3>
                  )}
                  {order.tracking_carrier && (
                    <p className="text-xs mb-0.5">Estimated arrival from {order.tracking_carrier}</p>
                  )}
                  {order.ship_from_city && order.ship_to_city && (
                    <p className="text-xs">
                      From <span className="font-medium">{order.ship_from_city}, {order.ship_from_state}</span> To{" "}
                      <span className="font-medium underline">{order.ship_to_city}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {hasPackageArrived(order) && !userReviews.has(order.vendor_id) ? (
                    <Button 
                      size="sm" 
                      className="w-full rounded-full"
                      onClick={() => handleLeaveReview(order, 'vendor')}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Review Store
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      className="w-full rounded-full"
                      onClick={() => handleTrackPackage(order)}
                    >
                      Track package
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full rounded-full"
                    onClick={() => handleMessageSeller(order)}
                  >
                    Message seller
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full rounded-full"
                    onClick={() => handleViewReceipt(order)}
                  >
                    View receipt
                  </Button>
                </div>
              </div>

              {/* Mobile flip card view */}
              <div className="md:hidden relative h-[280px] perspective-1000">
                <div 
                  className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.6s'
                  }}
                >
                  {/* Front - Order Details */}
                  <Card 
                    className={`absolute inset-0 overflow-hidden backface-hidden ${
                      isFlipped ? 'pointer-events-none' : ''
                    }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-base flex-wrap">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            <button
                              onClick={() => handleVendorClick(order.vendor_id, order.vendor_name)}
                              className="font-semibold hover:underline focus:outline-none focus:underline"
                            >
                              {order.vendor_name}
                            </button>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleFlip(order.id)}
                        >
                          <ArrowLeftRight className="h-5 w-5" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                    </CardHeader>
                    
                    <CardContent className="pt-0 pb-0">
                      <Separator className="mb-2" />
                      
                      <div className="space-y-1 max-h-[140px] overflow-y-auto">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-start gap-2 py-1">
                            <button
                              onClick={() => handleProductClick(item, order.vendor_id, order.vendor_name)}
                              className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              {item.product_image ? (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-green-600" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => handleProductClick(item, order.vendor_id, order.vendor_name)}
                                className="text-left w-full hover:underline text-sm block"
                              >
                                {item.product_name}
                              </button>
                              <p className="font-medium text-sm text-muted-foreground">{formatPrice(item.total_price)}</p>
                              {item.quantity > 1 && (
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Back - Actions */}
                  <Card 
                    className={`absolute inset-0 overflow-hidden ${
                      !isFlipped ? 'pointer-events-none' : ''
                    }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1">
                          {order.estimated_delivery_date ? (
                            <h3 className="text-base font-serif mb-1">
                              Arriving {new Date(order.estimated_delivery_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h3>
                          ) : (
                            <h3 className="text-base font-serif mb-1">Preparing for shipment</h3>
                          )}
                          {order.tracking_carrier && (
                            <p className="text-xs mb-0.5">Estimated arrival from {order.tracking_carrier}</p>
                          )}
                          {order.ship_from_city && order.ship_to_city ? (
                            <p className="text-xs">
                              From <span className="font-medium">{order.ship_from_city}, {order.ship_from_state}</span> To{" "}
                              <span className="font-medium underline">{order.ship_to_city}</span>
                            </p>
                          ) : order.ship_to_city && (
                            <p className="text-xs">
                              To <span className="font-medium underline">{order.ship_to_city}</span>
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleFlip(order.id)}
                          className="flex-shrink-0"
                        >
                          <ArrowLeftRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex flex-col gap-2">
                        {hasPackageArrived(order) && !userReviews.has(order.vendor_id) ? (
                          <Button 
                            size="sm" 
                            className="w-full rounded-full"
                            onClick={() => handleLeaveReview(order, 'vendor')}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Review Store
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="w-full rounded-full"
                            onClick={() => handleTrackPackage(order)}
                          >
                            Track package
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full rounded-full"
                          onClick={() => handleMessageSeller(order)}
                        >
                          Message seller
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full rounded-full"
                          onClick={() => handleViewReceipt(order)}
                        >
                          View receipt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          products={[selectedProduct]}
          open={!!selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            setSelectedVendorId(null);
            setSelectedVendorName(null);
          }}
          vendorId={selectedVendorId || undefined}
          vendorName={selectedVendorName || undefined}
          hideVendorName={false}
        />
      )}

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Need Help with Your Order?</DialogTitle>
            <DialogDescription>
              We're here to assist you with any questions or concerns about your order.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Order Information</h4>
                <p className="text-sm text-muted-foreground">Order ID: {selectedOrder.id}</p>
                <p className="text-sm text-muted-foreground">Store: {selectedOrder.vendor_name}</p>
                <p className="text-sm text-muted-foreground">Date: {formatDate(selectedOrder.created_at)}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Contact Options</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      window.location.href = `mailto:support@farmersmarket.com?subject=Order ${selectedOrder.id}`;
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Support
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: "Contact Store",
                        description: "Please contact the store directly for order-specific questions.",
                      });
                    }}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Contact Store
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Receipt</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="py-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">{selectedOrder.vendor_name}</h3>
                <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.created_at)}</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Items</h4>
                {selectedOrder.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-32 h-32 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h5 className="font-medium mb-1">{item.product_name}</h5>
                      <p className="text-lg font-semibold text-primary mb-2">{formatPrice(item.total_price)}</p>
                      {item.product_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.product_description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total_amount)}</span>
                </div>
              </div>

              <Button
                className="w-full print:hidden"
                onClick={() => {
                  window.print();
                }}
              >
                Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Chat */}
      {chatOpen && chatVendorId && chatVendorName && (
        <FloatingChat
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setChatVendorId(null);
            setChatVendorName(null);
            setChatOrderItems([]);
          }}
          vendorId={chatVendorId}
          vendorName={chatVendorName}
          orderItems={chatOrderItems}
        />
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewType === 'vendor' ? 'Review Store' : 'Review Product'}
            </DialogTitle>
            <DialogDescription>
              {reviewType === 'vendor' 
                ? `Share your experience with ${reviewOrder?.vendor_name}`
                : `Review ${reviewProduct?.product_name}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Rating */}
            <div>
              <Label className="mb-3 block">Rating *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewRating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <Label htmlFor="review-comment" className="mb-2 block">
                Your Review (Optional)
              </Label>
              <Textarea
                id="review-comment"
                placeholder="Tell us about your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {reviewComment.length}/500 characters
              </p>
            </div>

            {/* Photos */}
            <div>
              <Label className="mb-2 block">Add Photos (Optional)</Label>
              <div className="space-y-3">
                {reviewPhotos.length < 5 && (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleReviewPhotoUpload}
                      className="hidden"
                      id="review-photo-upload"
                    />
                    <Label
                      htmlFor="review-photo-upload"
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Upload className="h-5 w-5" />
                      <span>Upload Photos (up to 5)</span>
                    </Label>
                  </div>
                )}

                {reviewPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {reviewPhotos.map((photo, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Review photo ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                          onClick={() => removeReviewPhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
                className="flex-1"
                disabled={isSubmittingReview}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                className="flex-1"
                disabled={isSubmittingReview || reviewRating === 0}
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;