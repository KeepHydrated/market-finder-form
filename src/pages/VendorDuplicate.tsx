import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Store, MapPin, Clock, Star, Heart, Plus, X, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductGrid } from "@/components/ProductGrid";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface AcceptedSubmission {
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
  market_hours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>;
  google_opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean;
    periods?: Array<{
      close?: { day: number; time: string };
      open?: { day: number; time: string };
    }>;
  };
  market_place_id?: string;
  google_rating?: number;
  google_rating_count?: number;
  created_at: string;
}

interface Review {
  id: string;
  user_id: string;
  vendor_id: string;
  rating: number;
  comment: string;
  created_at: string;
  photos?: string[];
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

const VendorDuplicate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const [acceptedSubmission, setAcceptedSubmission] = useState<AcceptedSubmission | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<AcceptedSubmission | null>(null);
  const [allVendors, setAllVendors] = useState<AcceptedSubmission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [marketOpeningHours, setMarketOpeningHours] = useState<any>(null);

  useEffect(() => {
    // Check if data was passed from navigation
    if (location.state) {
      const { type, selectedVendor, selectedMarket, allVendors } = location.state as {
        type: 'vendor' | 'market';
        selectedVendor?: AcceptedSubmission;
        selectedMarket?: { name: string; address: string; vendors: AcceptedSubmission[] };
        allVendors: AcceptedSubmission[];
      };
      
      setAllVendors(allVendors);
      setLoadingData(false);
      
      if (type === 'vendor' && selectedVendor) {
        setAcceptedSubmission(selectedVendor);
        setSelectedVendor(selectedVendor);
      } else if (type === 'market' && selectedMarket) {
        // For market view, use the first vendor as the market representative
        setAcceptedSubmission(selectedMarket.vendors[0]);
        setSelectedVendor(null); // Start with vendor grid view
      }
    } else {
      // Fallback to loading all vendors if no state passed
      fetchAllVendors();
    }
  }, [location.state]);

  useEffect(() => {
    if (acceptedSubmission) {
      fetchMarketOpeningHours();
    }
  }, [acceptedSubmission]);

  useEffect(() => {
    if (selectedVendor) {
      fetchReviews();
    }
  }, [selectedVendor]);

  const fetchAllVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedSubmissions = data?.map(sub => ({
        ...sub,
        products: typeof sub.products === 'string' ? JSON.parse(sub.products) : sub.products,
        market_hours: sub.market_hours && typeof sub.market_hours === 'object' && sub.market_hours !== null 
          ? sub.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
          : undefined
      })) || [];
      
      console.log('Fetched submissions with ratings:', parsedSubmissions.map(s => ({
        name: s.store_name,
        google_rating: s.google_rating,
        google_rating_count: s.google_rating_count
      })));
      
      setAllVendors(parsedSubmissions);
      // Set the first vendor as the market representative and selected vendor
      if (parsedSubmissions.length > 0) {
        setAcceptedSubmission(parsedSubmissions[0]);
        setSelectedVendor(parsedSubmissions[0]);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchReviews = async () => {
    if (!selectedVendor) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('vendor_id', selectedVendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      // Calculate review stats
      if (data && data.length > 0) {
        const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / data.length;
        setReviewStats({
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: data.length
        });
      } else {
        setReviewStats({ averageRating: 0, totalReviews: 0 });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const submitReview = async () => {
    if (!user || !selectedVendor) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to leave a review.",
        variant: "destructive"
      });
      return;
    }

    if (!newReview.comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please enter a comment for your review.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingReview(true);

    try {
      let photoUrls: string[] = [];

      // Upload photos if any are selected
      if (selectedPhotos.length > 0) {
        setUploadingPhotos(true);
        photoUrls = await uploadReviewPhotos(selectedPhotos);
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          vendor_id: selectedVendor.id,
          rating: newReview.rating,
          comment: newReview.comment.trim(),
          photos: photoUrls
        });

      if (error) throw error;

      toast({
        title: "Review submitted",
        description: "Thank you for your review!",
      });

      setNewReview({ rating: 5, comment: '' });
      setSelectedPhotos([]);
      fetchReviews(); // Refresh reviews
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
      setUploadingPhotos(false);
    }
  };

  const uploadReviewPhotos = async (photos: File[]): Promise<string[]> => {
    const uploadPromises = photos.map(async (photo, index) => {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}-${index}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('review-photos')
        .upload(fileName, photo);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('review-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const remainingSlots = 3 - selectedPhotos.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    // Validate file types and sizes
    const validFiles = filesToAdd.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: "Please select image files only.",
          variant: "destructive"
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: "Please select images smaller than 5MB.",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    setSelectedPhotos(prev => [...prev, ...validFiles]);
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const fetchMarketOpeningHours = async () => {
    if (!acceptedSubmission?.selected_market) return;

    try {
      const response = await supabase.functions.invoke('farmers-market-search', {
        body: { 
          query: acceptedSubmission.selected_market,
          location: null 
        }
      });

      if (response.data?.predictions && response.data.predictions.length > 0) {
        const market = response.data.predictions[0];
        setMarketOpeningHours(market.opening_hours);
      }
    } catch (error) {
      console.error('Error fetching market opening hours:', error);
    }
  };

  const formatSchedule = (marketDays?: string[], marketHours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>) => {
    // First, try to use Google Maps opening hours if available
    if (marketOpeningHours?.weekday_text && marketOpeningHours.weekday_text.length > 0) {
      const openDays = marketOpeningHours.weekday_text.filter(day => 
        !day.toLowerCase().includes('closed') && day.trim().length > 0
      );
      return openDays.length > 0 ? openDays : ["Schedule TBD"];
    }

    // Fallback to stored hours if Google Maps data is not available
    if (!marketDays || !marketHours) return ["Schedule TBD"];
    
    const dayNames = {
      'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 
      'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'
    };
    
    const formatTime = (time: string, period: 'AM' | 'PM') => {
      // Convert 24-hour format to 12-hour format
      let hour = parseInt(time.split(':')[0]);
      const minute = time.includes(':') ? time.split(':')[1] : '00';
      
      // Handle 24-hour format conversion
      if (hour === 0) {
        hour = 12;
        period = 'AM';
      } else if (hour > 12) {
        hour = hour - 12;
        period = 'PM';
      } else if (hour === 12) {
        period = 'PM';
      }
      
      return `${hour}:${minute} ${period}`;
    };
    
    // Format all days and times
    const schedules = marketDays.map(day => {
      const hours = marketHours[day];
      if (!hours) return null;
      
      const fullDayName = dayNames[day.toLowerCase() as keyof typeof dayNames] || day;
      return `${fullDayName}, ${formatTime(hours.start, hours.startPeriod)} - ${formatTime(hours.end, hours.endPeriod)}`;
    }).filter(Boolean);
    
    return schedules;
  };

  const cleanAddress = (address?: string) => {
    if (!address) return "Address TBD";
    // Remove "United States" and any trailing comma/space
    return address.replace(/,\s*United States\s*$/i, '').trim();
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!acceptedSubmission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">No Vendor Profile Available</h2>
          <p className="text-muted-foreground">
            No accepted submissions found. Complete the application process to display your vendor profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Left column - wider width */}
        <div className="w-96 min-h-screen bg-green-50 border-r">
        <div className="space-y-6 px-4 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span 
                className="text-black text-xl font-bold cursor-pointer hover:text-gray-600 transition-colors"
                onClick={() => setSelectedVendor(null)}
              >
                {acceptedSubmission.selected_market || acceptedSubmission.search_term || "Market Location"}
              </span>
              {/* Google Maps Rating display */}
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-foreground font-medium">
                  {acceptedSubmission.google_rating ? acceptedSubmission.google_rating.toFixed(1) : '0.0'}
                </span>
                <span className="text-muted-foreground">
                  ({acceptedSubmission.google_rating_count || 0})
                </span>
              </div>
            </div>
            {/* Heart icon */}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (acceptedSubmission) {
                  await toggleLike(acceptedSubmission.id, 'vendor');
                }
              }}
              className={cn(
                "transition-colors",
                acceptedSubmission && isLiked(acceptedSubmission.id, 'vendor')
                  ? "text-red-500 hover:text-red-600"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart 
                className={cn(
                  "h-5 w-5 transition-colors",
                  acceptedSubmission && isLiked(acceptedSubmission.id, 'vendor') && "fill-current"
                )} 
              />
            </Button>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground text-base font-normal">
              {cleanAddress(acceptedSubmission.market_address)}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-muted-foreground text-base font-normal whitespace-pre-line">
              {marketOpeningHours?.open_now !== undefined && (
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                  marketOpeningHours.open_now 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {marketOpeningHours.open_now ? 'Open Now' : 'Currently Closed'}
                </div>
              )}
              <div>
                {formatSchedule(acceptedSubmission.market_days, acceptedSubmission.market_hours).map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 px-4 py-6">
        {selectedVendor ? (
          // Show selected vendor details
          <div className="space-y-6">

            {/* Vendor Details */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-foreground">{selectedVendor.store_name}</h1>
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
                    onClick={() => setIsReviewModalOpen(true)}
                  >
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="text-foreground font-medium">
                      {acceptedSubmission.google_rating ? acceptedSubmission.google_rating.toFixed(1) : 'No rating'}
                    </span>
                    <span className="text-muted-foreground">
                      ({acceptedSubmission.google_rating_count || 0})
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (selectedVendor) {
                      await toggleLike(selectedVendor.id, 'vendor');
                    }
                  }}
                  className={cn(
                    "transition-colors",
                    selectedVendor && isLiked(selectedVendor.id, 'vendor')
                      ? "text-red-500 hover:text-red-600"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Heart 
                    className={cn(
                      "h-6 w-6 transition-colors",
                      selectedVendor && isLiked(selectedVendor.id, 'vendor') && "fill-current"
                    )} 
                  />
                </Button>
              </div>

              {/* Category badges */}
              <div className="flex gap-2 mb-4">
                {selectedVendor.primary_specialty && (
                  <Badge variant="secondary">{selectedVendor.primary_specialty}</Badge>
                )}
                <Badge variant="secondary">Fresh Produce</Badge>
                <Badge variant="secondary">Local</Badge>
              </div>
              
              {/* Description */}
              <p className="text-muted-foreground mb-4">
                {selectedVendor.description || "Quality produce from local farmers."}
              </p>

              {/* Website */}
              {selectedVendor.website && (
                <div className="mb-4">
                  <a 
                    href={selectedVendor.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>

            {/* Products Section */}
            <div className="space-y-6">
              {selectedVendor.products && selectedVendor.products.length > 0 ? (
                <ProductGrid 
                  products={selectedVendor.products} 
                  vendorId={selectedVendor.id}
                  vendorName={selectedVendor.store_name}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No products available yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Show vendor cards grid
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allVendors.map((vendor) => (
              <Card 
                key={vendor.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => setSelectedVendor(vendor)}
              >
                {/* Product Image */}
                <div className="aspect-video bg-muted relative">
                  {vendor.products && vendor.products.length > 0 && vendor.products[0].images && vendor.products[0].images.length > 0 ? (
                    <img 
                      src={vendor.products[0].images[0]} 
                      alt={vendor.products[0].name || 'Product'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image Available
                    </div>
                  )}
                  
                  {/* Rating - Top Left */}
                  <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-medium">
                        {Math.floor(Math.random() * 2) + 4}.{Math.floor(Math.random() * 9)}
                      </span>
                      <span className="text-xs text-gray-600">
                        ({Math.floor(Math.random() * 50) + 10})
                      </span>
                    </div>
                  </div>
                  
                  {/* Like Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleLike(vendor.id, 'vendor');
                    }}
                  >
                    <Heart 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isLiked(vendor.id, 'vendor') 
                          ? "text-red-500 fill-current" 
                          : "text-gray-600"
                      )} 
                    />
                  </Button>

                  {/* Distance Badge */}
                  <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                    <span className="text-xs font-medium text-gray-700">
                      {`${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 9)} miles`}
                    </span>
                  </div>
                </div>
                
                {/* Store Information */}
                <div className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-left">
                    {vendor.store_name}
                  </h3>
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground text-left">
                      {cleanAddress(vendor.market_address) || vendor.selected_market || vendor.search_term || "Location TBD"}
                    </p>
                  </div>
                  
                  {vendor.primary_specialty && (
                    <p className="text-sm text-foreground text-left">
                      {vendor.primary_specialty}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={(open) => {
        setIsReviewModalOpen(open);
        if (!open) {
          setShowReviewForm(false);
          setSelectedPhotos([]);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          {!showReviewForm ? (
            // Reviews List View
            <>
              <DialogHeader className="pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`h-5 w-5 fill-current ${
                          reviewStats.totalReviews > 0 && star <= reviewStats.averageRating 
                            ? 'text-yellow-500' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {reviewStats.totalReviews > 0 ? reviewStats.averageRating : '0.0'}
                  </span>
                  <span className="text-muted-foreground">
                    ({reviewStats.totalReviews} reviews)
                  </span>
                </div>
                <DialogTitle>Customer Reviews</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Add Review Button */}
                <Button 
                  onClick={() => setShowReviewForm(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Write a Review
                </Button>

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {reviews.map((review) => (
                      <Card key={review.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star}
                                  className={`h-4 w-4 fill-current ${
                                    star <= review.rating ? 'text-yellow-500' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{review.comment}</p>
                          {review.photos && review.photos.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {review.photos.map((photo, index) => (
                                <img 
                                  key={index} 
                                  src={photo} 
                                  alt={`Review photo ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded-md border"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No reviews yet. Be the first to leave a review!</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Review Form View
            <>
              <DialogHeader className="pb-6">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowReviewForm(false)}
                    className="p-0 h-auto"
                  >
                    ← Back to Reviews
                  </Button>
                </div>
                <DialogTitle>Write a Review</DialogTitle>
              </DialogHeader>

              {!user ? (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground mb-4">
                    Please sign in to leave a review
                  </p>
                  <AuthForm />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rating */}
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                          className="p-0 border-none bg-transparent"
                        >
                          <Star 
                            className={`h-6 w-6 fill-current transition-colors ${
                              star <= newReview.rating ? 'text-yellow-500' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-2">
                    <Label htmlFor="comment">Your Review</Label>
                    <Textarea
                      id="comment"
                      placeholder="Tell others about your experience..."
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label>Photos (optional)</Label>
                    <div className="space-y-2">
                      {selectedPhotos.length < 3 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoSelect}
                            className="hidden"
                            id="photo-upload"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('photo-upload')?.click()}
                            type="button"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Add Photos
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {selectedPhotos.length}/3 photos
                          </span>
                        </div>
                      )}
                      
                      {selectedPhotos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {selectedPhotos.map((photo, index) => (
                            <div key={index} className="relative">
                              <img 
                                src={URL.createObjectURL(photo)} 
                                alt={`Preview ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-md border"
                              />
                              <button
                                onClick={() => removePhoto(index)}
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                type="button"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    onClick={submitReview} 
                    disabled={isSubmittingReview || uploadingPhotos}
                    className="w-full"
                  >
                    {isSubmittingReview ? 'Submitting...' : uploadingPhotos ? 'Uploading photos...' : 'Submit Review'}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};

export default VendorDuplicate;