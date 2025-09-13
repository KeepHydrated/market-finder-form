import { useState, useEffect } from "react";
import { Store, MapPin, Clock, Star, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/ProductGrid";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

const Vendor = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [acceptedSubmission, setAcceptedSubmission] = useState<AcceptedSubmission | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchAcceptedSubmission();
  }, []);

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

  const formatSchedule = (marketDays?: string[], marketHours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>) => {
    if (!marketDays || !marketHours) return "Schedule TBD";
    
    const firstDay = marketDays[0];
    const hours = marketHours[firstDay];
    if (!hours) return "Schedule TBD";
    
    const dayNames = {
      'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 
      'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'
    };
    
    const fullDayName = dayNames[firstDay.toLowerCase() as keyof typeof dayNames] || firstDay;
    return `${fullDayName}, ${hours.start}:00 ${hours.startPeriod} - ${hours.end}:00 ${hours.endPeriod}`;
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
    <div className="min-h-screen bg-background flex">
      {/* Left column - narrow width */}
      <div className="w-64 bg-card border-r p-6">
        <div className="space-y-6">
          <div>
            <span className="text-foreground text-xl font-bold">
              {acceptedSubmission.selected_market || acceptedSubmission.search_term || "Market Location"}
            </span>
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
      <div className="flex-1">
        {/* Top row under header */}
        <div className="bg-card border-b p-8">
          <div className="space-y-4">
            {/* Title row with rating and heart icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-foreground">{acceptedSubmission.store_name}</h1>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-foreground font-medium">4.9</span>
                  <span className="text-muted-foreground">(45 reviews)</span>
                </div>
              </div>
              <Heart className="h-6 w-6 text-muted-foreground" />
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
            <h2 className="text-3xl font-bold text-foreground">Products</h2>
            
            {/* Product Grid */}
            {acceptedSubmission.products && acceptedSubmission.products.length > 0 ? (
              <ProductGrid products={acceptedSubmission.products} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No products available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vendor;