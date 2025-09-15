import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  created_at: string;
  averageRating?: number;
  totalReviews?: number;
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

const Tet = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const [acceptedSubmission, setAcceptedSubmission] = useState<AcceptedSubmission | null>(null);
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [vendorRatings, setVendorRatings] = useState<Record<string, { vendorId: string; averageRating: number; totalReviews: number }>>({});

  useEffect(() => {
    fetchAcceptedSubmission();
    fetchAllAcceptedSubmissions();
  }, []);

  useEffect(() => {
    if (acceptedSubmission) {
      fetchReviews();
    }
  }, [acceptedSubmission]);

  const fetchAcceptedSubmission = async () => {
    try {
      // Hardcoded to fetch Sprout & Harvest vendor
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', '78c551ca-5271-4a26-a682-4a75a132bf89')
        .eq('status', 'accepted')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No vendor found with this ID');
        } else {
          throw error;
        }
      }
      
      if (data) {
        const parsedSubmission = {
          ...data,
          products: typeof data.products === 'string' ? JSON.parse(data.products) : data.products,
          market_hours: data.market_hours && typeof data.market_hours === 'object' && data.market_hours !== null 
            ? data.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
            : undefined
        };
        setAcceptedSubmission(parsedSubmission);
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Group vendors by market (same function from Homepage)
  const groupVendorsByMarket = () => {
    const markets: Record<string, {
      name: string;
      address: string;
      vendors: AcceptedSubmission[];
    }> = {};

    acceptedSubmissions.forEach(submission => {
      const marketKey = submission.selected_market || submission.search_term || 'Unknown Market';
      const marketAddress = submission.market_address || 'Address not available';
      
      if (!markets[marketKey]) {
        markets[marketKey] = {
          name: marketKey,
          address: marketAddress,
          vendors: []
        };
      }
      
      markets[marketKey].vendors.push(submission);
    });

    return Object.values(markets);
  };

  // Function to calculate distance (same as Homepage)
  const calculateDistance = (userCoords: {lat: number, lng: number}, marketAddress?: string): string => {
    if (!userCoords || !marketAddress) {
      return '-- miles';
    }
    
    // For now, return a placeholder distance
    const sampleDistances = ['0.5', '1.2', '2.1', '3.4', '5.8'];
    const randomIndex = Math.abs(marketAddress.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % sampleDistances.length;
    return `${sampleDistances[randomIndex]} miles`;
  };

  const fetchAllAcceptedSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted');

      if (error) throw error;
      
      if (data) {
        const parsedSubmissions = data.map(submission => ({
          ...submission,
          products: typeof submission.products === 'string' ? JSON.parse(submission.products) : submission.products,
          market_hours: submission.market_hours && typeof submission.market_hours === 'object' && submission.market_hours !== null 
            ? submission.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
            : undefined
        }));
        setAcceptedSubmissions(parsedSubmissions);
      }
    } catch (error) {
      console.error('Error fetching all vendors:', error);
    }
  };

  const fetchReviews = async () => {
    if (!acceptedSubmission) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('vendor_id', acceptedSubmission.id)
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
    if (!user || !acceptedSubmission) {
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
          vendor_id: acceptedSubmission.id,
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

  const formatSchedule = (marketDays?: string[], marketHours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>) => {
    if (!marketDays || !marketHours) return "Schedule TBD";
    
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
    
    return schedules.join('\n') || "Schedule TBD";
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
      <div className="flex min-h-screen">
        {/* Left column - wider width */}
        <div className="w-96 bg-green-50 border-r min-h-screen">
        <div className="space-y-4 px-6 pt-8 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span 
                className="text-black text-xl font-bold cursor-pointer hover:text-gray-600 transition-colors"
              >
                {acceptedSubmission.selected_market || acceptedSubmission.search_term || "Market Location"}
              </span>
              {/* Rating display */}
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-foreground font-medium">
                  {reviewStats.totalReviews > 0 ? reviewStats.averageRating : '0.0'}
                </span>
                <span className="text-muted-foreground">
                  ({reviewStats.totalReviews})
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

          <div className="flex items-start gap-2 pt-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground text-sm">
              {acceptedSubmission.market_address || "Address TBD"}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground text-sm whitespace-pre-line">
              {formatSchedule(acceptedSubmission.market_days, acceptedSubmission.market_hours)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 px-4">
        {/* Vendor Cards Grid */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {acceptedSubmissions.filter(vendor => {
              const vendorMarket = vendor.selected_market || vendor.search_term || 'Unknown Market';
              const currentMarket = acceptedSubmission.selected_market || acceptedSubmission.search_term || 'Unknown Market';
              return vendorMarket === currentMarket;
            }).map((vendor, index) => (
              <Card 
                key={vendor.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  navigate(`/vendor/${vendor.id}`);
                }}
              >
                {/* Vendor Image */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {vendor.products && 
                   vendor.products.length > 0 && 
                   vendor.products[0].images && 
                   vendor.products[0].images.length > 0 ? (
                    <img 
                      src={vendor.products[0].images[0]}
                      alt={vendor.store_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                      <div className="text-green-600 text-lg font-medium">
                        {vendor.store_name}
                      </div>
                    </div>
                  )}
                  
                  {/* Rating Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium">
                      {vendorRatings[vendor.id]?.averageRating || '0.0'}
                    </span>
                  </div>

                  {/* Like Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleLike(vendor.id, 'vendor');
                    }}
                    className={cn(
                      "absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm transition-colors hover:bg-white",
                      isLiked(vendor.id, 'vendor')
                        ? "text-red-500 hover:text-red-600"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Heart 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isLiked(vendor.id, 'vendor') && "fill-current"
                      )} 
                    />
                  </Button>

                  {/* Distance Badge */}
                  <div className="absolute bottom-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    {calculateDistance(userCoordinates || {lat: 0, lng: 0}, vendor.market_address)}
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-lg leading-tight">
                      {vendor.store_name}
                    </h3>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {vendor.description || vendor.primary_specialty}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" />
                    <span>{vendor.primary_specialty}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
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
                  <span className="text-lg font-medium ml-2">
                    {reviewStats.totalReviews > 0 ? reviewStats.averageRating.toFixed(1) : '0.0'} ({reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''})
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
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
                        <p className="text-sm mb-3">{review.comment}</p>
                        
                        {/* Review Photos */}
                        {review.photos && review.photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {review.photos.map((photoUrl: string, photoIndex: number) => (
                              <img
                                key={photoIndex}
                                src={photoUrl}
                                alt={`Review photo ${photoIndex + 1}`}
                                className="w-full h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                                onClick={() => window.open(photoUrl, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No reviews yet</p>
                    <p className="text-muted-foreground text-sm">Be the first to share your experience!</p>
                  </div>
                )}

                {/* Write Review Button */}
                {user ? (
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full bg-black text-white hover:bg-gray-800"
                      onClick={() => setShowReviewForm(true)}
                    >
                      Write Review
                    </Button>
                  </div>
                ) : (
                  <div className="text-center pt-4 border-t">
                    <p className="text-muted-foreground text-sm">Please sign in to leave a review</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Review Form View
            <>
              <DialogHeader className="pb-6">
                <DialogTitle className="text-xl font-semibold">Write a Review for {acceptedSubmission.store_name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Rating Section */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Rating *</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star 
                          className={`h-6 w-6 ${
                            star <= newReview.rating 
                              ? 'text-yellow-500 fill-current' 
                              : 'text-gray-300 stroke-2'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Review Text Section */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Your Review *</Label>
                  <Textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder={`Share your experience with ${acceptedSubmission.store_name}...`}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Photos Section */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Photos (Optional) - Max 3</Label>
                  
                  {/* Photo Upload Area */}
                  <div className="space-y-3">
                    {selectedPhotos.length < 3 && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="cursor-pointer flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
                        >
                          <Camera className="w-5 h-5" />
                          <span>Add Photo</span>
                        </label>
                      </div>
                    )}
                    
                    {/* Photo Previews */}
                    {selectedPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowReviewForm(false);
                      setSelectedPhotos([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      await submitReview();
                      setIsReviewModalOpen(false);
                      setShowReviewForm(false);
                    }}
                    disabled={isSubmittingReview || uploadingPhotos || !newReview.comment.trim()}
                    className="flex-1 bg-gray-600 text-white hover:bg-gray-700"
                  >
                    {uploadingPhotos ? 'Uploading photos...' : isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Tet;