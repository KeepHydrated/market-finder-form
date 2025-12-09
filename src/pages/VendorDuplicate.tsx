import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom";
import { Store, MapPin, Clock, Star, Heart, Plus, X, Camera, Navigation, Pencil, ChevronLeft, ChevronRight, MessageSquare, ArrowUp, Flag } from "lucide-react";
import { FloatingChat } from "@/components/FloatingChat";
import { ReportVendorDialog } from "@/components/ReportVendorDialog";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface AcceptedSubmission {
  id: string;
  user_id: string;
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
  product_id?: string;
  product_name?: string;
  product_image?: string;
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
  const { marketSlug, vendorSlug } = useParams<{ marketSlug?: string; vendorSlug?: string }>();
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileScrollTop, setShowMobileScrollTop] = useState(false);
  const [marketReviews, setMarketReviews] = useState<{rating?: number; reviewCount?: number} | null>(null);
  const [vendorReviews, setVendorReviews] = useState<{rating?: number; reviewCount?: number} | null>(null);
  const [vendorRatings, setVendorRatings] = useState<Record<string, {vendorId: string; averageRating: number; totalReviews: number}>>({});
  const [distance, setDistance] = useState<string>('');
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [cachedMarketCoordinates, setCachedMarketCoordinates] = useState<{lat: number; lng: number} | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatVendorId, setChatVendorId] = useState<string>('');
  const [chatVendorName, setChatVendorName] = useState<string>('');
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const marketsScrollRef = useRef<HTMLDivElement>(null);
  const [selectedMarketName, setSelectedMarketName] = useState<string>('');
  const [selectedMarketAddress, setSelectedMarketAddress] = useState<string>('');
  const [actualSelectedMarket, setActualSelectedMarket] = useState<{ name: string; address: string } | null>(null);
  const [marketNavigationHistory, setMarketNavigationHistory] = useState<string[]>([]);
  const [navigationMarketsOrder, setNavigationMarketsOrder] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const [isTablet, setIsTablet] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null); // For tablet layout
  const desktopScrollRef2 = useRef<HTMLDivElement>(null); // For desktop/mobile layout
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Check if viewport is tablet (768px - 1024px)
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width <= 1024);
    };
    
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  const hasInitialized = useRef(false);

  useEffect(() => {
    // Skip if already initialized to prevent loops from URL changes
    if (hasInitialized.current) {
      return;
    }

    console.log('VendorDuplicate useEffect triggered, location.state:', location.state, 'marketSlug:', marketSlug);
    
    // Check if we have vendor data from Homepage navigation (clicking a vendor card)
    if (location.state?.selectedVendor && location.state?.type === 'vendor') {
      console.log('Found selectedVendor in location.state:', location.state.selectedVendor);
      const vendor = location.state.selectedVendor as any;
      const allVendorsFromState = location.state.allVendors as any[] || [vendor];
      
      setAllVendors(allVendorsFromState);
      setAcceptedSubmission(vendor);
      setSelectedVendor(vendor);
      setLoadingData(false);
      
      // Initialize navigationMarketsOrder with vendor's markets
      if (vendor.selected_markets && Array.isArray(vendor.selected_markets)) {
        const marketNames = vendor.selected_markets.map((market: any) => 
          typeof market === 'string' ? market : market.name
        );
        console.log('Setting navigationMarketsOrder from homepage:', marketNames);
        setNavigationMarketsOrder(marketNames);
      }
      
      // Set the market info
      setSelectedMarketName(vendor.selected_market || '');
      setSelectedMarketAddress(vendor.market_address || '');
      
      // Fetch ratings for all vendors
      const vendorIds = allVendorsFromState.map((v: any) => v.id);
      fetchVendorRatings(vendorIds);
      
      // Update URL with vendor name
      const slug = marketNameToSlug(vendor.store_name);
      navigate(`/vendor/${slug}`, { replace: true, state: location.state });
      hasInitialized.current = true;
      return;
    }
    
    // Check if we already have market data in state (from Homepage navigation)
    if (location.state?.selectedMarket) {
      console.log('Found selectedMarket in location.state:', location.state.selectedMarket);
      const selectedMarket = location.state.selectedMarket as any;
      
      // Handle market with or without vendors
      if (selectedMarket) {
        const vendors = selectedMarket.vendors || [];
        console.log('Selected market vendors:', vendors.length);
        
        setAllVendors(vendors);
        setSelectedMarketName(selectedMarket.name);
        setSelectedMarketAddress(selectedMarket.address || '');
        setActualSelectedMarket(selectedMarket);
        
        // Use the first vendor as the market representative for fetching hours/reviews (if any)
        if (vendors.length > 0) {
          setAcceptedSubmission(vendors[0]);
          // Fetch ratings for all vendors
          const vendorIds = vendors.map((v: any) => v.id);
          fetchVendorRatings(vendorIds);
        } else {
          // Create a minimal acceptedSubmission for market info display
          setAcceptedSubmission({
            id: `market-${selectedMarket.id || selectedMarket.name}`,
            user_id: '',
            store_name: selectedMarket.name,
            primary_specialty: '',
            website: '',
            description: '',
            products: [],
            selected_market: selectedMarket.name,
            market_address: selectedMarket.address,
            market_days: selectedMarket.days || [],
            google_rating: selectedMarket.google_rating,
            google_rating_count: selectedMarket.google_rating_count,
            search_term: '',
            created_at: new Date().toISOString()
          });
        }
        setSelectedVendor(null); // Start with vendor grid view
        setLoadingData(false); // Clear loading state
        
        // Update URL with market name immediately
        const slug = marketNameToSlug(selectedMarket.name);
        navigate(`/market/${slug}`, { replace: true, state: location.state });
        hasInitialized.current = true;
      }
      return;
    }
    
    // Check for URL params
    const vendorId = searchParams.get('id') || searchParams.get('vendor');
    
    if (vendorId) {
      console.log('Found vendor ID in URL params:', vendorId);
      // Load specific vendor - URL will be updated after vendor loads
      fetchVendorById(vendorId);
      hasInitialized.current = true;
    } else if (vendorSlug) {
      console.log('Found vendor slug in URL:', vendorSlug);
      // Fetch vendor by slug (store name)
      fetchVendorBySlug(vendorSlug);
      hasInitialized.current = true;
    } else if (marketSlug) {
      console.log('Found market slug in URL:', marketSlug);
      // Market slug is already in URL, just fetch vendors for this market
      // (Would need backend support to fetch by market name)
      fetchAllVendors();
      hasInitialized.current = true;
    } else {
      console.log('No location state or params, fetching all vendors...');
      // Fallback to loading all vendors
      fetchAllVendors();
      hasInitialized.current = true;
    }
  }, [location.state, searchParams, marketSlug]);

  // Initialize selectedMarketName when acceptedSubmission loads
  useEffect(() => {
    if (acceptedSubmission) {
      // Only initialize from acceptedSubmission if we don't have an actual selected market from navigation
      if (!selectedMarketName && !actualSelectedMarket) {
        const initialMarket = acceptedSubmission.selected_market || acceptedSubmission.search_term || '';
        const initialAddress = acceptedSubmission.market_address || '';
        setSelectedMarketName(initialMarket);
        setSelectedMarketAddress(initialAddress);
      }
    }
  }, [acceptedSubmission, actualSelectedMarket]);

  // Update URL when vendor is selected/deselected
  useEffect(() => {
    if (selectedVendor) {
      // When viewing a vendor, show vendor name in URL
      const vendorSlug = marketNameToSlug(selectedVendor.store_name);
      const currentPath = location.pathname;
      const expectedPath = `/vendor/${vendorSlug}`;
      if (currentPath !== expectedPath) {
        navigate(expectedPath, { replace: true, state: location.state });
      }
    } else if (selectedMarketName && !selectedVendor) {
      // When viewing market grid, show market name in URL
      const marketSlug = marketNameToSlug(selectedMarketName);
      const currentPath = location.pathname;
      const expectedPath = `/market/${marketSlug}`;
      if (currentPath !== expectedPath) {
        navigate(expectedPath, { replace: true, state: location.state });
      }
    }
  }, [selectedVendor, selectedMarketName]);

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

  // Reorder markets so the currently selected market appears first
  const reorderedMarkets = useMemo(() => {
    if (!acceptedSubmission?.selected_markets || !Array.isArray(acceptedSubmission.selected_markets)) {
      return [];
    }
    
    const markets = [...acceptedSubmission.selected_markets] as string[];
    const currentMarket = selectedMarketName || acceptedSubmission.selected_market;
    
    if (!currentMarket) return markets;
    
    // Find the current market and move it to the front
    const currentIndex = markets.findIndex(m => m === currentMarket);
    if (currentIndex > 0) {
      const [market] = markets.splice(currentIndex, 1);
      markets.unshift(market);
    }
    
    return markets;
  }, [acceptedSubmission?.selected_markets, acceptedSubmission?.selected_market, selectedMarketName]);

  const fetchVendorBySlug = async (slug: string) => {
    try {
      setLoadingData(true);
      
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'accepted');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({
          title: "Error",
          description: "Vendor not found",
          variant: "destructive",
        });
        setLoadingData(false);
        return;
      }
      
      // Parse all vendors and find the one matching the slug
      const parsedVendors = data.map((vendor: any) => ({
        ...vendor,
        products: typeof vendor.products === 'string' ? JSON.parse(vendor.products) : vendor.products,
        market_hours: vendor.market_hours && typeof vendor.market_hours === 'object' && vendor.market_hours !== null 
          ? vendor.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
          : undefined
      }));
      
      // Find vendor whose store_name matches the slug
      const matchingVendor = parsedVendors.find((vendor: any) => 
        marketNameToSlug(vendor.store_name) === slug
      );
      
      if (!matchingVendor) {
        toast({
          title: "Error",
          description: "Vendor not found",
          variant: "destructive",
        });
        setLoadingData(false);
        return;
      }
      
      // Check authorization for test store bb
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      if (matchingVendor.store_name?.toLowerCase() === 'test store bb' && userEmail !== 'nadiachibri@gmail.com') {
        navigate('/');
        return;
      }
      
      // Initialize navigationMarketsOrder with vendor's markets
      if (matchingVendor.selected_markets && Array.isArray(matchingVendor.selected_markets)) {
        const marketNames = matchingVendor.selected_markets.map((market: any) => 
          typeof market === 'string' ? market : market.name
        );
        setNavigationMarketsOrder(marketNames);
      }
      
      // Set vendor state
      setAcceptedSubmission(matchingVendor);
      setSelectedVendor(matchingVendor);
      setAllVendors([matchingVendor]);
      setLoadingData(false);
      
      // Fetch ratings for this vendor
      fetchVendorRatings([matchingVendor.id]);
    } catch (error) {
      console.error('Error fetching vendor by slug:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor details",
        variant: "destructive",
      });
      setLoadingData(false);
    }
  };

  const fetchVendorById = async (vendorId: string) => {
    try {
      setLoadingData(true);
      
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', vendorId)
        .eq('status', 'accepted')
        .single();
      
      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Error",
          description: "Vendor not found",
          variant: "destructive",
        });
        setLoadingData(false);
        return;
      }
      
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      // Check if this is test store bb and user is not nadiachibri@gmail.com
      if (data.store_name?.toLowerCase() === 'test store bb' && userEmail !== 'nadiachibri@gmail.com') {
        // Redirect to homepage if not authorized
        navigate('/');
        return;
      }
      
      const parsedSubmission = {
        ...data,
        products: typeof data.products === 'string' ? JSON.parse(data.products) : data.products,
        market_hours: data.market_hours && typeof data.market_hours === 'object' && data.market_hours !== null 
          ? data.market_hours as Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>
          : undefined
      };
      
      // Initialize navigationMarketsOrder with vendor's markets
      if (parsedSubmission.selected_markets && Array.isArray(parsedSubmission.selected_markets)) {
        const marketNames = parsedSubmission.selected_markets.map((market: any) => 
          typeof market === 'string' ? market : market.name
        );
        setNavigationMarketsOrder(marketNames);
      }
      
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
      
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      // Filter out "test store bb" unless user is nadiachibri@gmail.com
      const filteredSubmissions = parsedSubmissions.filter(submission => {
        if (submission.store_name?.toLowerCase() === 'test store bb') {
          return userEmail === 'nadiachibri@gmail.com';
        }
        return true;
      });
      
      console.log('Fetched submissions with ratings:', filteredSubmissions.map(s => ({
        name: s.store_name,
        google_rating: s.google_rating,
        google_rating_count: s.google_rating_count,
        google_rating_type: typeof s.google_rating,
        google_rating_count_type: typeof s.google_rating_count
      })));
      
      // Also log the full objects to see their structure
      console.log('Full parsed submissions:', filteredSubmissions);
      
      setAllVendors(filteredSubmissions);
      // Set the first vendor as the market representative and selected vendor
      if (filteredSubmissions.length > 0) {
        setAcceptedSubmission(filteredSubmissions[0]);
        setSelectedVendor(filteredSubmissions[0]);
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

  const marketNameToSlug = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const switchToMarket = async (marketName: string, isBackward = false) => {
    console.log('Switching to market:', marketName, 'isBackward:', isBackward);
    setSelectedMarketName(marketName);
    setActualSelectedMarket(null); // Clear the actual selected market to allow new market details to show
    
    // Update URL with market name
    const marketSlug = marketNameToSlug(marketName);
    navigate(`/market/${marketSlug}`, { replace: true });
    
    // Update navigation history
    if (!isBackward) {
      // Going forward - add to history
      setMarketNavigationHistory(prev => [...prev, marketName]);
    } else {
      // Going backward - remove last from history
      setMarketNavigationHistory(prev => prev.slice(0, -1));
    }
    
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

  // Handle scroll to top button visibility for desktop/iPad ONLY
  useEffect(() => {
    const handleDesktopScroll = () => {
      const container = desktopScrollRef.current || desktopScrollRef2.current;
      if (container && !isMobile) {
        setShowScrollTop(container.scrollTop > 100);
      }
    };

    const container = desktopScrollRef.current || desktopScrollRef2.current;
    if (container && !isMobile) {
      container.addEventListener('scroll', handleDesktopScroll);
      handleDesktopScroll(); // Initial check
      
      return () => {
        container.removeEventListener('scroll', handleDesktopScroll);
      };
    }
  }, [isMobile, isTablet, desktopScrollRef.current, desktopScrollRef2.current]);

  // Handle scroll to top button visibility for mobile ONLY
  useEffect(() => {
    const handleWindowScroll = () => {
      if (isMobile) {
        setShowMobileScrollTop(window.scrollY > 100);
      }
    };

    if (isMobile) {
      window.addEventListener('scroll', handleWindowScroll);
      handleWindowScroll(); // Initial check
      
      return () => {
        window.removeEventListener('scroll', handleWindowScroll);
      };
    }
  }, [isMobile]);

  const scrollToTopDesktop = () => {
    const container = desktopScrollRef.current || desktopScrollRef2.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToTopMobile = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <>
      {isTablet ? (
        // iPad view - same as desktop layout but narrower
        <div className="min-h-screen bg-background">
          <div className="flex">
            {/* Left column - sticky sidebar */}
            <div className="w-80 h-screen sticky top-0 bg-green-50 border-r overflow-y-auto">
              <div className="space-y-6 px-4 pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <button 
                    className="text-black text-xl font-bold cursor-pointer hover:text-gray-600 transition-colors text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('✅ Market name BUTTON clicked - clearing selected vendor');
                      setSelectedVendor(null);
                    }}
                  >
                    {selectedMarketName || acceptedSubmission.selected_market || acceptedSubmission.search_term || "Market Location"}
                  </button>
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

                {selectedVendor && navigationMarketsOrder.length > 1 && (() => {
                  const currentMarket = selectedMarketName || acceptedSubmission.selected_market;
                  const currentPosition = navigationMarketsOrder.indexOf(currentMarket);
                  
                  return (
                    <div className="mt-4 flex items-center justify-start gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (currentPosition > 0) {
                            const previousMarket = navigationMarketsOrder[currentPosition - 1];
                            switchToMarket(previousMarket, false);
                          }
                        }}
                        disabled={currentPosition <= 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (currentPosition >= 0 && currentPosition < navigationMarketsOrder.length - 1) {
                            const nextMarket = navigationMarketsOrder[currentPosition + 1];
                            switchToMarket(nextMarket, false);
                          }
                        }}
                        disabled={currentPosition < 0 || currentPosition >= navigationMarketsOrder.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Main content - right column */}
            <div ref={desktopScrollRef} className="flex-1 overflow-y-auto h-screen">
              <div className="mx-auto px-4 py-6 max-w-xl">
                  {selectedVendor ? (
          // Show selected vendor details
          <div className="space-y-6">

            {/* Vendor Details */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4 gap-1 md:gap-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate flex-1 min-w-0">{selectedVendor.store_name}</h1>
                <div className="flex items-center gap-0 md:gap-2 flex-shrink-0">
                  <div 
                    className="flex items-center gap-1 md:gap-2 cursor-pointer hover:bg-muted/50 px-1 md:px-2 py-1 rounded-md transition-colors"
                    onClick={() => setIsReviewModalOpen(true)}
                  >
                    <Star className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-400 fill-current" />
                    <span className="text-foreground font-medium text-sm md:text-base">
                      {vendorReviews?.rating ? Number(vendorReviews.rating).toFixed(1) : '0.0'}
                    </span>
                    <span className="text-muted-foreground text-sm md:text-base">
                      ({vendorReviews?.reviewCount ?? 0})
                    </span>
                  </div>
                   {/* Report button */}
                  {selectedVendor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!user) {
                          toast({
                            title: "Authentication required",
                            description: "Please log in to report vendors",
                            variant: "destructive",
                          });
                          return;
                        }
                        setIsReportDialogOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 md:p-2 h-auto"
                    >
                      <Flag className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  )}

                  {/* Message button - TEMPORARILY showing for all vendors for testing */}
                  {selectedVendor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!user) {
                          toast({
                            title: "Authentication required",
                            description: "Please log in to message vendors",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setChatVendorId(selectedVendor.id);  // Use submission ID, not user_id
                        setChatVendorName(selectedVendor.store_name);
                        setIsChatOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 md:p-2 h-auto"
                    >
                      <MessageSquare className="h-4 w-4 md:h-6 md:w-6" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (selectedVendor) {
                        await toggleLike(selectedVendor.id, 'vendor');
                      }
                    }}
                    className={cn(
                      "transition-colors p-1 md:p-2 h-auto",
                      selectedVendor && isLiked(selectedVendor.id, 'vendor')
                        ? "text-red-500 hover:text-red-600"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Heart 
                      className={cn(
                        "h-4 w-4 md:h-6 md:w-6 transition-colors",
                        selectedVendor && isLiked(selectedVendor.id, 'vendor') && "fill-current"
                      )} 
                    />
                  </Button>
                </div>
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
        ) : allVendors.length === 0 ? (
          // Empty state when no vendors at this market
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Store className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Vendors on the Website Yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              No vendors from this market have joined our website yet. Be the first to set up your shop here!
            </p>
            <Button 
              onClick={() => navigate('/my-shop', { state: { prefillMarket: selectedMarketName } })}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Become a Vendor
            </Button>
          </div>
        ) : (
          // Show vendor cards grid
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {allVendors.map((vendor) => (
              <Card 
                key={vendor.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => {
                  setAcceptedSubmission(vendor);
                  setSelectedVendor(vendor);
                  // Check if current market exists in vendor's market list
                  if (selectedMarketName && vendor.selected_markets && Array.isArray(vendor.selected_markets)) {
                    // Handle both old format (strings) and new format (objects)
                    const vendorMarkets = vendor.selected_markets.map((market: any) => 
                      typeof market === 'string' ? market : market.name
                    );
                    // Use exact match to find if this vendor sells at the current market
                    if (vendorMarkets.includes(selectedMarketName)) {
                      // Keep the current market selected and create navigation order with it first
                      const reorderedMarkets = [...vendorMarkets];
                      const currentIdx = reorderedMarkets.indexOf(selectedMarketName);
                      if (currentIdx > 0) {
                        const [market] = reorderedMarkets.splice(currentIdx, 1);
                        reorderedMarkets.unshift(market);
                      }
                      setNavigationMarketsOrder(reorderedMarkets);
                      console.log('Keeping current market:', selectedMarketName, 'Navigation order:', reorderedMarkets);
                    } else {
                      // Vendor doesn't sell at this market, use their primary market
                      setSelectedMarketName(vendor.selected_market || '');
                      setSelectedMarketAddress(vendor.market_address || '');
                      setNavigationMarketsOrder(vendorMarkets);
                      console.log('Switching to vendor primary market:', vendor.selected_market);
                    }
                  } else {
                    // No current market, use vendor's primary market
                    setSelectedMarketName(vendor.selected_market || '');
                    setSelectedMarketAddress(vendor.market_address || '');
                    if (vendor.selected_markets && Array.isArray(vendor.selected_markets)) {
                      // Handle both old format (strings) and new format (objects)
                      const marketNames = vendor.selected_markets.map((market: any) => 
                        typeof market === 'string' ? market : market.name
                      );
                      setNavigationMarketsOrder(marketNames);
                    }
                    console.log('Using vendor primary market:', vendor.selected_market);
                  }
                  setMarketNavigationHistory([]); // Reset navigation history
                }}
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
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 fill-current text-yellow-400" />
                      <span className="text-sm font-semibold">
                        {vendorRatings[vendor.id]?.totalReviews > 0 
                          ? vendorRatings[vendor.id].averageRating.toFixed(1)
                          : '0.0'} {vendorRatings[vendor.id]?.totalReviews > 0 && `(${vendorRatings[vendor.id].totalReviews})`}
                      </span>
                    </div>
                  </div>
                </div>
                
                 {/* Store Information */}
                 <div className="p-4 space-y-3">
                   <div className="flex items-center justify-between">
                     <h3 className="text-lg font-semibold text-foreground text-left">
                       {vendor.store_name}
                     </h3>
                     
                     {/* Action Buttons */}
                     <div className="flex items-center gap-1">
                       {/* Message Button */}
                       <Button
                         variant="ghost"
                         size="sm"
                         className="h-8 w-8 p-0"
                         onClick={(e) => {
                           e.stopPropagation();
                           if (!user) {
                             toast({
                               title: "Authentication required",
                               description: "Please log in to message vendors",
                               variant: "destructive",
                             });
                             return;
                           }
                           setChatVendorId(vendor.id);
                           setChatVendorName(vendor.store_name);
                           setIsChatOpen(true);
                         }}
                       >
                         <MessageSquare className="h-4 w-4 text-muted-foreground" />
                       </Button>

                       {/* Like Button */}
                       <Button
                         variant="ghost"
                         size="sm"
                         className="h-8 w-8 p-0"
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
                               : "text-muted-foreground"
                           )} 
                         />
                       </Button>
                     </div>
                   </div>
                   
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
          </div>
        </div>
      ) : (
        // Desktop and Mobile view - original non-collapsible layout  
        <div className="min-h-screen bg-background">
          <div className="flex flex-col md:flex-row">
            {/* Left column/Top section - sticky on desktop, at top on mobile */}
            <div className="w-full md:w-96 md:h-screen md:sticky md:top-0 bg-green-50 border-b md:border-b-0 md:border-r">
              <div className="space-y-6 px-4 pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      className="text-black text-xl font-bold cursor-pointer hover:text-gray-600 transition-colors text-left"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('✅ Market name BUTTON clicked - clearing selected vendor');
                        setSelectedVendor(null);
                      }}
                    >
                      {selectedMarketName || acceptedSubmission.selected_market || acceptedSubmission.search_term || "Market Location"}
                    </button>
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

                {selectedVendor && navigationMarketsOrder.length > 1 && (() => {
                  const currentMarket = selectedMarketName || acceptedSubmission.selected_market;
                  const currentPosition = navigationMarketsOrder.indexOf(currentMarket);
                  
                  return (
                    <div className="mt-4 flex items-center justify-start gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (currentPosition > 0) {
                            const previousMarket = navigationMarketsOrder[currentPosition - 1];
                            switchToMarket(previousMarket, false);
                          }
                        }}
                        disabled={currentPosition <= 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (currentPosition >= 0 && currentPosition < navigationMarketsOrder.length - 1) {
                            const nextMarket = navigationMarketsOrder[currentPosition + 1];
                            switchToMarket(nextMarket, false);
                          }
                        }}
                        disabled={currentPosition < 0 || currentPosition >= navigationMarketsOrder.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Main content - right column, scrollable - FULL WIDTH ON MOBILE */}
            <div ref={desktopScrollRef2} className="flex-1 w-full overflow-y-auto md:h-screen">
              <div className="mx-auto px-4 py-6 md:max-w-5xl">
                {selectedVendor ? (
                  // Show selected vendor details
                  <div className="space-y-6">
                    {/* Vendor Details */}
                    <div className="mb-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                        <div className="flex items-center justify-between">
                          <h1 className="text-xl font-bold text-foreground">{selectedVendor.store_name}</h1>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "transition-colors md:hidden",
                              selectedVendor && isLiked(selectedVendor.id, 'vendor')
                                ? "text-red-500 hover:text-red-600"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={async () => {
                              if (selectedVendor) {
                                await toggleLike(selectedVendor.id, 'vendor');
                              }
                            }}
                          >
                            <Heart 
                              className={cn(
                                "h-6 w-6 transition-colors",
                                selectedVendor && isLiked(selectedVendor.id, 'vendor') && "fill-current"
                              )} 
                            />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
                            onClick={() => setIsReviewModalOpen(true)}
                          >
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-foreground font-medium">
                              {vendorReviews?.rating ? Number(vendorReviews.rating).toFixed(1) : 'No rating'}
                            </span>
                            <span className="text-muted-foreground">
                              ({vendorReviews?.reviewCount ?? 0})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Report button */}
                            {selectedVendor && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!user) {
                                    toast({
                                      title: "Authentication required",
                                      description: "Please log in to report vendors",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setIsReportDialogOpen(true);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors mr-3"
                              >
                                <Flag className="h-5 w-5" />
                              </Button>
                            )}

                            {selectedVendor && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!user) {
                                    toast({
                                      title: "Authentication required",
                                      description: "Please log in to message vendors",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  setChatVendorId(selectedVendor.id);
                                  setChatVendorName(selectedVendor.store_name);
                                  setIsChatOpen(true);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <MessageSquare className="h-6 w-6" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (selectedVendor) {
                                  await toggleLike(selectedVendor.id, 'vendor');
                                }
                              }}
                              className={cn(
                                "transition-colors hidden md:flex",
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
                        </div>
                      </div>

                      <div className="flex gap-2 mb-4">
                        {selectedVendor.primary_specialty && (
                          <Badge variant="secondary">{selectedVendor.primary_specialty}</Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground mb-4">
                        {selectedVendor.description || "Quality produce from local farmers."}
                      </p>

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
                ) : allVendors.length === 0 ? (
                  // Empty state when no vendors at this market
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                      <Store className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Vendors on the Website Yet</h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      No vendors from this market have joined our website yet. Be the first to set up your shop here!
                    </p>
                    <Button 
                      onClick={() => navigate('/my-shop', { state: { prefillMarket: selectedMarketName } })}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Become a Vendor
                    </Button>
                  </div>
                ) : (
                  // Show vendor cards grid
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {allVendors.map((vendor) => (
                      <Card 
                        key={vendor.id}
                        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
                        onClick={() => {
                          setAcceptedSubmission(vendor);
                          setSelectedVendor(vendor);
                          if (selectedMarketName && vendor.selected_markets && Array.isArray(vendor.selected_markets)) {
                            // Handle both old format (strings) and new format (objects)
                            const vendorMarkets = vendor.selected_markets.map((market: any) => 
                              typeof market === 'string' ? market : market.name
                            );
                            if (vendorMarkets.includes(selectedMarketName)) {
                              const reorderedMarkets = [...vendorMarkets];
                              const currentIdx = reorderedMarkets.indexOf(selectedMarketName);
                              if (currentIdx > 0) {
                                const [market] = reorderedMarkets.splice(currentIdx, 1);
                                reorderedMarkets.unshift(market);
                              }
                              setNavigationMarketsOrder(reorderedMarkets);
                            } else {
                              setSelectedMarketName(vendor.selected_market || '');
                              setSelectedMarketAddress(vendor.market_address || '');
                              setNavigationMarketsOrder(vendorMarkets);
                            }
                          } else {
                            setSelectedMarketName(vendor.selected_market || '');
                            setSelectedMarketAddress(vendor.market_address || '');
                            if (vendor.selected_markets && Array.isArray(vendor.selected_markets)) {
                              // Handle both old format (strings) and new format (objects)
                              const marketNames = vendor.selected_markets.map((market: any) => 
                                typeof market === 'string' ? market : market.name
                              );
                              setNavigationMarketsOrder(marketNames);
                            }
                          }
                          setMarketNavigationHistory([]);
                        }}
                      >
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
                          
                          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 fill-current text-yellow-400" />
                              <span className="text-sm font-semibold">
                                {vendorRatings[vendor.id]?.totalReviews > 0 
                                  ? vendorRatings[vendor.id].averageRating.toFixed(1)
                                  : '0.0'} {vendorRatings[vendor.id]?.totalReviews > 0 && `(${vendorRatings[vendor.id].totalReviews})`}
                              </span>
                            </div>
                          </div>
                          
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
          </div>
        </div>
      )}

      {/* Floating Chat */}
      <FloatingChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        vendorId={chatVendorId}
        vendorName={chatVendorName}
      />

      {/* Report Vendor Dialog */}
      {selectedVendor && (
        <ReportVendorDialog
          open={isReportDialogOpen}
          onClose={() => setIsReportDialogOpen(false)}
          vendorId={selectedVendor.id}
          vendorName={selectedVendor.store_name}
        />
      )}

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
              <DialogHeader className="pb-6 text-left">
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
                          
                          {/* Product Info - Show if this is a product review */}
                          {review.product_id && review.product_name && (
                            <div className="flex items-center gap-3 p-2 bg-muted rounded-md">
                              {review.product_image && (
                                <img 
                                  src={review.product_image} 
                                  alt={review.product_name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground">Reviewed product:</p>
                                <p className="text-sm font-medium">{review.product_name}</p>
                              </div>
                            </div>
                          )}
                          
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

                          {/* Edit button for user's own reviews */}
                          {user && review.user_id === user.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewReview({ rating: review.rating, comment: review.comment });
                                setEditingReviewId(review.id);
                                setExistingReviewPhotos(review.photos || []);
                                setShowReviewForm(true);
                              }}
                              className="w-full mt-3"
                            >
                              <Pencil className="h-3 w-3 mr-2" />
                              Edit This Review
                            </Button>
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
                
                {/* Leave a Review Button */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setNewReview({ rating: 5, comment: '' });
                      setEditingReviewId(null);
                      setSelectedPhotos([]);
                      setExistingReviewPhotos([]);
                      setShowReviewForm(true);
                    }}
                    className="w-full"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Leave a Review
                  </Button>
                </div>
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

      {/* Scroll to Top Button - Desktop/iPad ONLY */}
      {showScrollTop && !isMobile && (
        <Button
          onClick={scrollToTopDesktop}
          className="fixed bottom-24 right-4 z-[100] h-12 w-12 rounded-full shadow-lg"
          size="icon"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Scroll to Top Button - Mobile ONLY */}
      {showMobileScrollTop && isMobile && (
        <Button
          onClick={scrollToTopMobile}
          className="fixed bottom-24 right-4 z-[100] h-12 w-12 rounded-full shadow-lg"
          size="icon"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </>
  );
};

export default VendorDuplicate;