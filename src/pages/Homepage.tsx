import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
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
  const navigate = useNavigate();
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcceptedSubmissions();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Featured Vendors</h1>
          <p className="text-muted-foreground">Discover our approved farmers market vendors</p>
        </div>

        {acceptedSubmissions.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground">No featured vendors yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {acceptedSubmissions.map((submission) => (
              <Card 
                key={submission.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate('/vendor')}
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
                  
                  {/* Like Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white rounded-full shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle like functionality here
                    }}
                  >
                    <Heart className="h-4 w-4 text-gray-600" />
                  </Button>
                </div>
                
                {/* Store Information */}
                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground text-left">
                    {submission.store_name}
                  </h3>
                  
                  {submission.primary_specialty && (
                    <p className="text-sm text-muted-foreground text-left">
                      {submission.primary_specialty}
                    </p>
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