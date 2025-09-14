import { useState, useEffect } from "react";
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

const Vendor = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const [acceptedSubmission, setAcceptedSubmission] = useState<AcceptedSubmission | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    fetchAcceptedSubmission();
  }, []);

  useEffect(() => {
    if (acceptedSubmission) {
      fetchReviews();
    }
  }, [acceptedSubmission]);

  const fetchAcceptedSubmission = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
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
      console.error('Error fetching accepted submission:', error);
    } finally {
      setLoadingData(false);
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
    
    const firstDay = marketDays[0];
    const hours = marketHours[firstDay];
    if (!hours) return "Schedule TBD";
    
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
    
    const fullDayName = dayNames[firstDay.toLowerCase() as keyof typeof dayNames] || firstDay;
    return `${fullDayName}, ${formatTime(hours.start, hours.startPeriod)} - ${formatTime(hours.end, hours.endPeriod)}`;
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
        <div className="w-96 bg-green-50 border-r">
        <div className="space-y-6 px-4 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-xl font-bold">
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

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground text-base font-normal">
              {acceptedSubmission.market_address || "Address TBD"}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground text-base font-normal">
              {formatSchedule(acceptedSubmission.market_days, acceptedSubmission.market_hours)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 px-4">
        {/* Top row under header */}
        <div className="bg-card border-b pt-6 pb-8 px-8">
          <div className="space-y-4">
            {/* Title row with rating and heart icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-foreground">{acceptedSubmission.store_name}</h1>
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
                  onClick={() => setIsReviewModalOpen(true)}
                >
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-foreground font-medium">
                    {reviewStats.totalReviews > 0 ? reviewStats.averageRating : 'No rating'}
                  </span>
                  <span className="text-muted-foreground">
                    ({reviewStats.totalReviews} reviews)
                  </span>
                </div>
              </div>
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
                    "h-6 w-6 transition-colors",
                    acceptedSubmission && isLiked(acceptedSubmission.id, 'vendor') && "fill-current"
                  )} 
                />
              </Button>
            </div>
            
            {/* Category badges */}
            <div className="flex gap-2">
              {acceptedSubmission.primary_specialty && (
                <Badge variant="secondary">{acceptedSubmission.primary_specialty}</Badge>
              )}
              <Badge variant="secondary">Fresh Produce</Badge>
              <Badge variant="secondary">Local</Badge>
            </div>
            
            {/* Description */}
            <p className="text-muted-foreground">
              {acceptedSubmission.description || "Quality produce from local farmers."}
            </p>

            {/* Website */}
            {acceptedSubmission.website && (
              <div className="pt-2">
                <a 
                  href={acceptedSubmission.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Rest of main content */}
        <div className="p-8">
          {/* Products Section */}
          <div className="space-y-6">
            {/* Product Grid */}
            {acceptedSubmission.products && acceptedSubmission.products.length > 0 ? (
              <ProductGrid 
                products={acceptedSubmission.products} 
                vendorId={acceptedSubmission.id}
                vendorName={acceptedSubmission.store_name}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No products available yet.
              </div>
            )}
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

export default Vendor;