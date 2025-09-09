import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, ArrowLeft, Globe } from "lucide-react";
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

const VendorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [submission, setSubmission] = useState<AcceptedSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSubmissionDetails();
    }
  }, [id]);

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
    return entries.map(([day, time]) => 
      `${getDayFullName(day)}: ${time.start} ${time.startPeriod} - ${time.end} ${time.endPeriod}`
    );
  };

  const fetchSubmissionDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', id)
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
      
      setSubmission(parsedSubmission);
    } catch (error) {
      console.error('Error fetching submission details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} profile={profile} />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} profile={profile} />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Vendor not found.</p>
            <Button onClick={() => navigate('/homepage')} className="mt-4">
              Back to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />
      <div className="container mx-auto px-4 py-12">
        <Button
          variant="outline"
          onClick={() => navigate('/homepage')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Markets
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vendor Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{submission.store_name}</CardTitle>
                <Badge variant="secondary" className="w-fit">
                  {submission.primary_specialty}
                </Badge>
              </CardHeader>
              <CardContent>
                {submission.description && (
                  <p className="text-muted-foreground mb-4">{submission.description}</p>
                )}
                {submission.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4" />
                    <a 
                      href={submission.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {submission.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products */}
            {submission.products && submission.products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submission.products.map((product, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        {product.images && product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name || 'Product'} 
                            className="w-full h-48 object-cover rounded-md"
                          />
                        )}
                        <h4 className="font-semibold">{product.name}</h4>
                        {product.description && (
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        )}
                        {product.price && (
                          <p className="font-medium text-primary">${product.price}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Market Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Location</h4>
                  <p className="text-lg font-semibold">{submission.selected_market || submission.search_term}</p>
                  {submission.market_address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      {submission.market_address}
                    </div>
                  )}
                </div>

                {submission.market_days && submission.market_days.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Market Days</h4>
                    <div className="flex flex-wrap gap-1">
                      {submission.market_days.map((day) => (
                        <Badge key={day} variant="outline">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {submission.market_hours && (
                  <div>
                    <h4 className="font-medium mb-2">Hours</h4>
                    <div className="space-y-1">
                      {formatMarketHours(submission.market_hours)?.map((hourStr, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {hourStr}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;