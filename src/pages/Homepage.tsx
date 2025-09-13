import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
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

const Homepage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);

  useEffect(() => {
    fetchAcceptedSubmissions();
  }, []);

  const getDayFullName = (day: string) => {
    const dayMap: Record<string, string> = {
      'Mon': 'Monday',
      'Tue': 'Tuesday', 
      'Wed': 'Wednesday',
      'Thu': 'Thursday',
      'Fri': 'Friday',
      'Sat': 'Saturday',
      'Sun': 'Sunday'
    };
    return dayMap[day] || day;
  };

  const formatMarketHours = (hours?: Record<string, { start: string; end: string; startPeriod: 'AM' | 'PM'; endPeriod: 'AM' | 'PM' }>) => {
    if (!hours || Object.keys(hours).length === 0) return null;
    
    const entries = Object.entries(hours);
    if (entries.length === 1) {
      const [day, time] = entries[0];
      return `${getDayFullName(day)}: ${time.start} ${time.startPeriod} - ${time.end} ${time.endPeriod}`;
    }
    
    return entries.map(([day, time]) => 
      `${getDayFullName(day)}: ${time.start} ${time.startPeriod} - ${time.end} ${time.endPeriod}`
    ).join(', ');
  };

  const fetchAcceptedSubmissions = async () => {
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
      
      setAcceptedSubmissions(parsedSubmissions);
    } catch (error) {
      console.error('Error fetching accepted submissions:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Accepted Vendors</h1>
          <p className="text-muted-foreground">Meet our approved farmers market vendors</p>
        </div>

        {acceptedSubmissions.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground">No accepted submissions yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {acceptedSubmissions.map((submission) => (
              <Card 
                key={submission.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate(`/vendor/${submission.id}`)}
              >
                {/* Product Image */}
                <div className="aspect-video bg-muted relative">
                  {submission.products && submission.products.length > 0 && submission.products[0].images && submission.products[0].images.length > 0 ? (
                    <img 
                      src={submission.products[0].images[0]} 
                      alt={submission.products[0].name || 'Product'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image Available
                    </div>
                  )}
                </div>
                
                {/* Market Information */}
                <div className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold">
                    {submission.selected_market || submission.search_term}
                  </h3>
                  
                  {submission.market_address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      {submission.market_address}
                    </div>
                  )}
                  
                  {submission.market_days && submission.market_days.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {submission.market_days.join(', ')}
                    </div>
                  )}
                  
                  {submission.market_hours && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mt-0.5" />
                      {formatMarketHours(submission.market_hours)}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Homepage;