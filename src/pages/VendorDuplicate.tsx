import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Store, MapPin, Clock, Star, Heart, Plus, X, Camera, Navigation, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductGrid } from "@/components/ProductGrid";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { getGoogleMapsDistance, calculateDistance, getCoordinatesForAddress } from "@/lib/geocoding";

interface AcceptedSubmission {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  products: any[];
  selected_market: string;
  selected_markets?: any; // Json type from database, will be string[]
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
  rating: number | null;
  comment: string;
  created_at: string;
  photos?: string[];
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  reviewsWithRatings: number;
}

const VendorDuplicate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const { toggleLike, isLiked } = useLikes();
  const [acceptedSubmission, setAcceptedSubmission] = useState<AcceptedSubmission | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<AcceptedSubmission | null>(null);
  const [allVendors, setAllVendors] = useState<AcceptedSubmission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0, reviewsWithRatings: 0 });
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [existingReviewPhotos, setExistingReviewPhotos] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [marketOpeningHours, setMarketOpeningHours] = useState<any>(null);
  const [marketReviews, setMarketReviews] = useState<{rating?: number; reviewCount?: number} | null>(null);
  const [vendorReviews, setVendorReviews] = useState<{rating?: number; reviewCount?: number} | null>(null);
  const [vendorRatings, setVendorRatings] = useState<Record<string, {vendorId: string; averageRating: number; totalReviews: number}>>({});
  const [distance, setDistance] = useState<string>('');
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [cachedMarketCoordinates, setCachedMarketCoordinates] = useState<{lat: number; lng: number} | null>(null);
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const marketsScrollRef = useRef<HTMLDivElement>(null);
  const [selectedMarketName, setSelectedMarketName] = useState<string>('');
  const [selectedMarketAddress, setSelectedMarketAddress] = useState<string>('');

  useEffect(() => {
    console.log('VendorDuplicate useEffect triggered, location.state:', location.state);
    
    // Check for URL params first
    const vendorId = searchParams.get('id');
    const productId = searchParams.get('product');
    
    console.log('URL params - vendorId:', vendorId, 'productId:', productId);
    
    if (vendorId) {
      console.log('Using URL param vendor ID:', vendorId);
      fetchVendorById(vendorId);
    }
    // Check if data was passed from navigation
    else if (location.state) {
      console.log('Using location state data');
      const { type, selectedVendor, selectedMarket, allVendors, marketCoordinates, marketDistance } = location.state as {
        type: 'vendor' | 'market';
        selectedVendor?: AcceptedSubmission;
        selectedMarket?: { name: string; address: string; vendors: AcceptedSubmission[] };
        allVendors: AcceptedSubmission[];
        marketCoordinates?: { lat: number; lng: number } | null;
        marketDistance?: string;
      };
      
      setAllVendors(allVendors);
      setLoadingData(false);
      
      // Fetch ratings for all vendors
      if (allVendors.length > 0) {
        const vendorIds = allVendors.map(vendor => vendor.id);
        fetchVendorRatings(vendorIds);
      }
      
      // Store cached coordinates if passed
      if (marketCoordinates) {
        setCachedMarketCoordinates(marketCoordinates);
        console.log('🗺️ Using passed market coordinates:', marketCoordinates);
      }
      
      // Use the pre-calculated distance from Homepage if available
      if (marketDistance) {
        console.log('🗺️ Using pre-calculated distance from Homepage:', marketDistance);
        setDistance(marketDistance);
        setIsLoadingDistance(false);
      }
      
      if (type === 'vendor' && selectedVendor) {
        setAcceptedSubmission(selectedVendor);
        setSelectedVendor(selectedVendor);
      } else if (type === 'market' && selectedMarket) {
        // For market view, use the first vendor as the market representative
        setAcceptedSubmission(selectedMarket.vendors[0]);
        setSelectedVendor(null); // Start with vendor grid view
      }
    } else {
      console.log('No location state, fetching all vendors...');
      // Fallback to loading all vendors if no state passed
      fetchAllVendors();
    }
  }, [location.state, searchParams]);

  // Initialize selectedMarketName when acceptedSubmission loads
  useEffect(() => {
    if (acceptedSubmission && !selectedMarketName) {
      const initialMarket = acceptedSubmission.selected_market || acceptedSubmission.search_term || '';
      const initialAddress = acceptedSubmission.market_address || '';
      setSelectedMarketName(initialMarket);
      setSelectedMarketAddress(initialAddress);
    }
  }, [acceptedSubmission]);

  const fetchVendorReviews = async () => {
    if (!acceptedSubmission?.id) {
      console.log('No vendor ID found, skipping reviews fetch');
      return;
    }

    try {
      console.log('Fetching vendor reviews for vendor ID:', acceptedSubmission.id);
      
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('vendor_id', acceptedSubmission.id);

      if (error) {
        console.error('Error fetching vendor reviews:', error);
        return;
      }

      console.log('Vendor reviews data:', reviews);

      if (reviews && reviews.length > 0) {
        const reviewsWithRatings = reviews.filter(review => review.rating && review.rating > 0);
        if (reviewsWithRatings.length > 0) {
          const averageRating = reviewsWithRatings.reduce((sum, review) => sum + review.rating!, 0) / reviewsWithRatings.length;
          setVendorReviews({
            rating: averageRating,
            reviewCount: reviews.length
          });
          console.log('Calculated vendor rating:', { rating: averageRating, count: reviews.length });
        } else {
          setVendorReviews({
            rating: 0,
            reviewCount: reviews.length
          });
        }
      } else {
        setVendorReviews({
          rating: 0,
          reviewCount: 0
        });
        console.log('No reviews found for vendor');
      }
    } catch (error) {
      console.error('Error fetching vendor reviews:', error);
    }
  };

  // Calculate distance to market
  const calculateDistanceToMarket = async () => {
    if (!acceptedSubmission?.market_address) return;
    
    setIsLoadingDistance(true);
    
    try {
      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userCoords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            let marketCoords = null;
            
            // Use cached coordinates if available (same as vendor card)
            if (cachedMarketCoordinates) {
              marketCoords = cachedMarketCoordinates;
              console.log('🗺️ Using cached coordinates from vendor card:', marketCoords);
            } else {
              // Fallback to geocoding if no cached coordinates
              marketCoords = await getCoordinatesForAddress(acceptedSubmission.market_address!);
              console.log('🗺️ Using geocoded coordinates:', marketCoords);
            }
            
            if (marketCoords) {
              // Use Google Maps Distance Matrix API (same calculation as vendor card)
              const googleDistance = await getGoogleMapsDistance(
                userCoords.lat, 
                userCoords.lng, 
                marketCoords.lat, 
                marketCoords.lng
              );
              
              if (googleDistance) {
                // Show just distance without duration to match vendor card format
                setDistance(googleDistance.distance);
              } else {
                setDistance('Distance unavailable');
              }
            }
            
            setIsLoadingDistance(false);
          },
          (error) => {
            console.error('Error getting user location:', error);
            setIsLoadingDistance(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        setIsLoadingDistance(false);
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
      setIsLoadingDistance(false);
    }
  };

  useEffect(() => {
    if (acceptedSubmission) {
      fetchMarketOpeningHours();
      fetchVendorReviews();
      // Only calculate distance if it wasn't passed from Homepage
      if (!distance) {
        calculateDistanceToMarket();
      }
      // Debug log for current accepted submission
      console.log('Current acceptedSubmission ratings:', {
        store_name: acceptedSubmission.store_name,
        google_rating: acceptedSubmission.google_rating,
        google_rating_count: acceptedSubmission.google_rating_count,
        google_rating_type: typeof acceptedSubmission.google_rating,
        google_rating_count_type: typeof acceptedSubmission.google_rating_count,
        selected_market: acceptedSubmission.selected_market
      });
    }
  }, [acceptedSubmission]);

  useEffect(() => {
    if (selectedVendor) {
      fetchReviews();
    }
  }, [selectedVendor, user]);

  const fetchVendorById = async (vendorId: string) => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', vendorId)
        .eq('status', 'accepted')
        .single();

      if (error) throw error;
      
      const parsedSubmission = {
        ...data,
        products: typeof data.products === 'string' ? JSON.parse(data.products) : data.products,
        market_hours: data.market_hours && typeof data.market_hours === 'object' && data.market_hours !== null 
          ? data.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
          : undefined
      };
      
      setAcceptedSubmission(parsedSubmission);
      setSelectedVendor(parsedSubmission);
      setAllVendors([parsedSubmission]);
      setLoadingData(false);
      
      // Fetch ratings for this vendor
      fetchVendorRatings([vendorId]);
    } catch (error) {
      console.error('Error fetching vendor by ID:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor details",
        variant: "destructive",
      });
      setLoadingData(false);
    }
  };

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
        google_rating_count: s.google_rating_count,
        google_rating_type: typeof s.google_rating,
        google_rating_count_type: typeof s.google_rating_count
      })));
      
      // Also log the full objects to see their structure
      console.log('Full parsed submissions:', parsedSubmissions);
      
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
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('vendor_id', selectedVendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      // Check if the current user has already reviewed this vendor
      if (user && data) {
        const userReview = data.find(review => review.user_id === user.id);
        setHasUserReviewed(!!userReview);
      }
      
      // Calculate review stats
      if (data && data.length > 0) {
        const reviewsWithRatings = data.filter(review => review.rating && review.rating > 0);
        if (reviewsWithRatings.length > 0) {
          const totalRating = reviewsWithRatings.reduce((sum, review) => sum + review.rating!, 0);
          const averageRating = totalRating / reviewsWithRatings.length;
          setReviewStats({
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: data.length,
            reviewsWithRatings: reviewsWithRatings.length
          });
        } else {
          setReviewStats({ averageRating: 0, totalReviews: data.length, reviewsWithRatings: 0 });
        }
      } else {
        setReviewStats({ averageRating: 0, totalReviews: 0, reviewsWithRatings: 0 });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchVendorRatings = async (vendorIds: string[]) => {
    if (vendorIds.length === 0) return;

    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('vendor_id, rating')
        .in('vendor_id', vendorIds);

      if (error) throw error;

      // Calculate ratings for each vendor
      const ratingsMap: Record<string, {vendorId: string; averageRating: number; totalReviews: number}> = {};
      
      vendorIds.forEach(vendorId => {
        const vendorReviews = reviews?.filter(review => review.vendor_id === vendorId) || [];
        
        if (vendorReviews.length > 0) {
          const reviewsWithRatings = vendorReviews.filter(review => review.rating && review.rating > 0);
          if (reviewsWithRatings.length > 0) {
            const totalRating = reviewsWithRatings.reduce((sum, review) => sum + review.rating!, 0);
            const averageRating = totalRating / reviewsWithRatings.length;
            
            ratingsMap[vendorId] = {
              vendorId,
              averageRating: Math.round(averageRating * 10) / 10,
              totalReviews: vendorReviews.length
            };
          } else {
            ratingsMap[vendorId] = {
              vendorId,
              averageRating: 0,
              totalReviews: vendorReviews.length
            };
          }
        } else {
          ratingsMap[vendorId] = {
            vendorId,
            averageRating: 0,
            totalReviews: 0
          };
        }
      });

      setVendorRatings(ratingsMap);
    } catch (error) {
      console.error('Error fetching vendor ratings:', error);
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

    // Check that at least one field is filled (rating, comment, or photos)
    const hasRating = newReview.rating > 0;
    const hasComment = newReview.comment.trim().length > 0;
    const hasPhotos = selectedPhotos.length > 0 || existingReviewPhotos.length > 0;
    
    if (!hasRating && !hasComment && !hasPhotos) {
      toast({
        title: "Review content required",
        description: "Please add at least a rating, comment, or photo to submit your review.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingReview(true);

    try {
      let photoUrls: string[] = [...existingReviewPhotos];

      // Upload new photos if any are selected
      if (selectedPhotos.length > 0) {
        setUploadingPhotos(true);
        const newPhotoUrls = await uploadReviewPhotos(selectedPhotos);
        photoUrls = [...photoUrls, ...newPhotoUrls];
      }

      if (editingReviewId) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: newReview.rating > 0 ? newReview.rating : null,
            comment: newReview.comment.trim(),
            photos: photoUrls,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingReviewId);

        if (error) throw error;

        toast({
          title: "Review updated",
          description: "Your review has been updated successfully!",
        });
      } else {
        // Insert new review
        const { error } = await supabase
          .from('reviews')
          .insert({
            user_id: user.id,
            vendor_id: selectedVendor.id,
            rating: newReview.rating > 0 ? newReview.rating : null,
            comment: newReview.comment.trim(),
            photos: photoUrls
          });

        if (error) throw error;

        toast({
          title: "Review submitted",
          description: "Thank you for your review!",
        });
        
        setHasUserReviewed(true);
      }

      setNewReview({ rating: 0, comment: '' });
      setSelectedPhotos([]);
      setEditingReviewId(null);
      setExistingReviewPhotos([]);
      setShowReviewForm(false);
      fetchReviews(); // Refresh reviews
    } catch (error: any) {
      console.error('Error submitting review:', error);
      
      // Check if it's a unique constraint violation
      if (error?.code === '23505') {
        toast({
          title: "Already reviewed",
          description: "You have already submitted a review for this market.",
          variant: "destructive"
        });
        setHasUserReviewed(true);
      } else {
        toast({
          title: "Error",
          description: `Failed to ${editingReviewId ? 'update' : 'submit'} review. Please try again.`,
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmittingReview(false);
      setUploadingPhotos(false);
    }
  };

  const deleteReview = async () => {
    if (!user || !editingReviewId) return;

    setIsSubmittingReview(true);
    setShowDeleteConfirm(false);

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', editingReviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Review deleted",
        description: "Your review has been deleted successfully.",
      });

      setNewReview({ rating: 0, comment: '' });
      setSelectedPhotos([]);
      setEditingReviewId(null);
      setExistingReviewPhotos([]);
      setHasUserReviewed(false);
      setShowReviewForm(false);
      fetchReviews(); // Refresh reviews
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
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
    const remainingSlots = 3 - selectedPhotos.length - existingReviewPhotos.length;
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
    console.log('fetchMarketOpeningHours called with acceptedSubmission:', acceptedSubmission);
    
    const marketQuery = selectedMarketName || acceptedSubmission?.selected_market || acceptedSubmission?.search_term;
    console.log('Market query (selectedMarketName || selected_market || search_term):', marketQuery);
    
    if (!marketQuery) {
      console.log('No market query found, skipping API call');
      return;
    }

    try {
      console.log('Fetching market opening hours for:', marketQuery);
      
      const response = await supabase.functions.invoke('farmers-market-search', {
        body: { 
          query: marketQuery,
          location: null 
        }
      });

      console.log('Market search response:', response);

      if (response.data?.predictions && response.data.predictions.length > 0) {
        const market = response.data.predictions[0];
        console.log('Market data:', market);
        console.log('Market opening hours data:', market.opening_hours);
        console.log('Market rating data:', { rating: market.rating, reviewCount: market.user_ratings_total });
        
        setMarketOpeningHours(market.opening_hours);
        setMarketReviews({
          rating: market.rating,
          reviewCount: market.user_ratings_total
        });
        
        // Update the selected market address if not already set
        if (!selectedMarketAddress) {
          setSelectedMarketAddress(market.address);
        }
      } else {
        console.log('No market predictions found in response:', response.data);
      }
    } catch (error) {
      console.error('Error fetching market opening hours:', error);
    }
  };

  const switchToMarket = async (marketName: string, index: number) => {
    console.log('Switching to market:', marketName);
    setCurrentMarketIndex(index);
    setSelectedMarketName(marketName);
    
    // Fetch market details for the selected market
    try {
      const response = await supabase.functions.invoke('farmers-market-search', {
        body: { 
          query: marketName,
          location: null 
        }
      });

      if (response.data?.predictions && response.data.predictions.length > 0) {
        const market = response.data.predictions[0];
        console.log('New market data:', market);
        
        setMarketOpeningHours(market.opening_hours);
        setMarketReviews({
          rating: market.rating,
          reviewCount: market.user_ratings_total
        });
        setSelectedMarketAddress(market.address);
        
        // Reset distance since we changed markets
        setDistance('');
        setIsLoadingDistance(false);
      }
    } catch (error) {
      console.error('Error fetching market details:', error);
    }
  };

  const formatSchedule = (marketDays?: string[], marketHours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>) => {
    // First, try to use Google Maps opening hours if available
    if (marketOpeningHours?.weekday_text && marketOpeningHours.weekday_text.length > 0) {
      console.log('Using Google Maps weekday_text:', marketOpeningHours.weekday_text);
      const openDays = marketOpeningHours.weekday_text.filter(day => 
        !day.toLowerCase().includes('closed') && day.trim().length > 0
      );
      return openDays.length > 0 ? openDays : ["Schedule TBD"];
    }

    // Check for periods array format as backup
    if (marketOpeningHours?.periods && marketOpeningHours.periods.length > 0) {
      console.log('Using Google Maps periods:', marketOpeningHours.periods);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const scheduleMap = new Map();
      
      marketOpeningHours.periods.forEach((period: any) => {
        if (period.open) {
          const dayName = dayNames[period.open.day] || 'Unknown';
          const openTime = period.open.time || '0000';
          const closeTime = period.close?.time || '2359';
          
          const formatTime = (time: string) => {
            const hour = parseInt(time.substring(0, 2));
            const minute = time.substring(2, 4);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minute} ${ampm}`;
          };
          
          const schedule = `${formatTime(openTime)} - ${formatTime(closeTime)}`;
          scheduleMap.set(dayName, schedule);
        }
      });
      
      if (scheduleMap.size > 0) {
        return Array.from(scheduleMap.entries()).map(([day, time]) => `${day}: ${time}`);
      }
    }

    // Fallback to stored hours if Google Maps data is not available
    if (!marketDays || !marketHours) {
      console.log('No market data available, showing TBD');
      return ["Schedule TBD"];
    }
    
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
        {/* Left column - sticky, non-scrolling */}
        <div className="w-96 h-screen sticky top-0 bg-green-50 border-r">
        <div className="space-y-6 px-4 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span 
                className="text-black text-xl font-bold cursor-pointer hover:text-gray-600 transition-colors"
                onClick={() => setSelectedVendor(null)}
              >
                {selectedMarketName || acceptedSubmission.selected_market || acceptedSubmission.search_term || "Market Location"}
              </span>
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
            <div>
              <p className="text-muted-foreground text-base font-normal">
                {cleanAddress(selectedMarketAddress || acceptedSubmission.market_address)}
              </p>
              {distance && (
                <div className="flex items-center gap-1 mt-1">
                  <Navigation className="h-3 w-3 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">{distance}</p>
                </div>
              )}
              {isLoadingDistance && (
                <p className="text-muted-foreground text-sm mt-1">Calculating distance...</p>
              )}
            </div>
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

          {/* Google Reviews Section */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2 mt-0.5">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-foreground font-semibold text-lg">
                {marketReviews?.rating ? marketReviews.rating.toFixed(1) : 
                 acceptedSubmission.google_rating ? acceptedSubmission.google_rating.toFixed(1) : '0.0'}
              </span>
              <span className="text-muted-foreground text-sm">
                ({marketReviews?.reviewCount ?? acceptedSubmission.google_rating_count ?? 0}) Google reviews
              </span>
            </div>
          </div>

          {/* Markets Navigation - Only show if viewing a vendor that sells at multiple markets */}
          {selectedVendor && acceptedSubmission.selected_markets && Array.isArray(acceptedSubmission.selected_markets) && acceptedSubmission.selected_markets.length > 1 && (
            <div className="mt-4 flex items-center justify-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (currentMarketIndex > 0 && acceptedSubmission.selected_markets) {
                    const newIndex = currentMarketIndex - 1;
                    const marketName = (acceptedSubmission.selected_markets as string[])[newIndex];
                    switchToMarket(marketName, newIndex);
                  }
                }}
                disabled={currentMarketIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (acceptedSubmission.selected_markets && Array.isArray(acceptedSubmission.selected_markets) && currentMarketIndex < acceptedSubmission.selected_markets.length - 1) {
                    const newIndex = currentMarketIndex + 1;
                    const marketName = (acceptedSubmission.selected_markets as string[])[newIndex];
                    switchToMarket(marketName, newIndex);
                  }
                }}
                disabled={!acceptedSubmission.selected_markets || !Array.isArray(acceptedSubmission.selected_markets) || currentMarketIndex === acceptedSubmission.selected_markets.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Main content - right column, scrollable */}
      <div className="flex-1 overflow-y-auto h-screen">
        <div className="container mx-auto px-4 py-6">
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
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`h-4 w-4 fill-current ${
                            vendorReviews?.rating && star <= vendorReviews.rating
                              ? 'text-yellow-500' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-foreground font-medium">
                      {vendorReviews?.rating ? Number(vendorReviews.rating).toFixed(1) : 'No rating'}
                    </span>
                    <span className="text-muted-foreground">
                      ({vendorReviews?.reviewCount ?? 0})
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
                     {selectedVendor.website}
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
                  hideVendorName={true}
                  initialProductId={searchParams.get('product') || undefined}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                         {vendorRatings[vendor.id]?.totalReviews > 0 
                           ? vendorRatings[vendor.id].averageRating.toFixed(1)
                           : '0.0'
                         }
                       </span>
                       <span className="text-xs text-gray-600">
                         ({vendorRatings[vendor.id]?.totalReviews || 0})
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

                </div>
                
                 {/* Store Information */}
                 <div className="p-4 space-y-3">
                   <h3 className="text-lg font-semibold text-foreground text-left">
                     {vendor.store_name}
                   </h3>
                   
                   {vendor.primary_specialty && (
                     <Badge variant="secondary" className="text-xs">
                       {vendor.primary_specialty}
                     </Badge>
                   )}
                 </div>
              </Card>
            ))}
          </div>
        )}
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
                <div className="flex items-center gap-4">
                  <DialogTitle className="m-0">Customer Reviews</DialogTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`h-5 w-5 fill-current ${
                            reviewStats.reviewsWithRatings > 0 && star <= reviewStats.averageRating 
                              ? 'text-yellow-500' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold text-foreground">
                      {reviewStats.reviewsWithRatings > 0 ? Number(reviewStats.averageRating).toFixed(1) : 'No rating'}
                    </span>
                    <span className="text-muted-foreground">
                      ({reviewStats.reviewsWithRatings})
                    </span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Add Review Button */}
                <Button 
                  onClick={() => {
                    if (hasUserReviewed && user) {
                      // Load existing review
                      const userReview = reviews.find(r => r.user_id === user.id);
                      if (userReview) {
                        setNewReview({ rating: userReview.rating, comment: userReview.comment });
                        setEditingReviewId(userReview.id);
                        setExistingReviewPhotos(userReview.photos || []);
                      }
                    } else {
                      // Reset for new review
                      setNewReview({ rating: 0, comment: '' });
                      setEditingReviewId(null);
                      setExistingReviewPhotos([]);
                      setSelectedPhotos([]);
                    }
                    setShowReviewForm(true);
                  }}
                  className="w-full"
                  variant="outline"
                  disabled={!user}
                >
                  {hasUserReviewed ? (
                    <Pencil className="h-4 w-4 mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {hasUserReviewed ? 'Edit Your Review' : 'Write a Review'}
                </Button>

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {reviews.map((review) => (
                      <Card key={review.id} className="p-4">
                        <div className="space-y-3">
                          {/* User Profile Section */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={review.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {review.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 flex items-center justify-between">
                              <p className="font-semibold text-sm">
                                {review.profiles?.full_name || 'Anonymous'}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Rating - Only show if rating exists */}
                          {review.rating && review.rating > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star}
                                    className={`h-4 w-4 fill-current ${
                                      star <= review.rating! ? 'text-yellow-500' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Comment - Only show if comment exists */}
                          {review.comment && review.comment.trim().length > 0 && (
                            <p className="text-sm text-foreground">{review.comment}</p>
                          )}
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
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowReviewForm(false)}
                    className="p-0 h-auto"
                  >
                    ← Back to Reviews
                  </Button>
                  <DialogTitle className="m-0">{editingReviewId ? 'Edit Your Review' : 'Write a Review'}</DialogTitle>
                </div>
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
                      {/* Show existing photos when editing */}
                      {editingReviewId && existingReviewPhotos.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Current photos:</p>
                          <div className="flex gap-2 flex-wrap">
                            {existingReviewPhotos.map((photo, index) => (
                              <div key={index} className="relative">
                                <img 
                                  src={photo} 
                                  alt={`Existing photo ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded-md border"
                                />
                                <button
                                  onClick={() => {
                                    setExistingReviewPhotos(prev => 
                                      prev.filter((_, i) => i !== index)
                                    );
                                  }}
                                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                  type="button"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(selectedPhotos.length + existingReviewPhotos.length) < 3 && (
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
                            {selectedPhotos.length + existingReviewPhotos.length}/3 photos
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
                    {isSubmittingReview 
                      ? (editingReviewId ? 'Updating...' : 'Submitting...') 
                      : uploadingPhotos 
                        ? 'Uploading photos...' 
                        : (editingReviewId ? 'Update Review' : 'Submit Review')
                    }
                  </Button>

                  {/* Delete Button - Only show when editing */}
                  {editingReviewId && (
                    <Button 
                      onClick={() => setShowDeleteConfirm(true)} 
                      disabled={isSubmittingReview}
                      variant="destructive"
                      className="w-full"
                    >
                      Delete Review
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
};

export default VendorDuplicate;