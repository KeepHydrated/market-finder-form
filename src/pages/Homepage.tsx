import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface AcceptedSubmission {
  id: string;
  store_name: string;
  primary_specialty: string;
  website: string;
  description: string;
  selected_market: string;
  search_term: string;
  market_address?: string;
  market_days?: string[];
  created_at: string;
}

const Homepage = () => {
  const { user, profile } = useAuth();
  const [acceptedSubmissions, setAcceptedSubmissions] = useState<AcceptedSubmission[]>([]);

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
      
      setAcceptedSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching accepted submissions:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />
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
              <Card key={submission.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-semibold">{submission.store_name}</h3>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Accepted
                    </Badge>
                  </div>
                  
                  {submission.primary_specialty && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Specialty: </span>
                      <span className="text-sm">{submission.primary_specialty}</span>
                    </div>
                  )}
                  
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {submission.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Market: </span>
                      <span className="text-sm">{submission.selected_market || submission.search_term}</span>
                    </div>
                    
                    {submission.market_address && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Address: </span>
                        <span className="text-sm">{submission.market_address}</span>
                      </div>
                    )}
                    
                    {submission.market_days && submission.market_days.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Days: </span>
                        <span className="text-sm">{submission.market_days.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  
                  {submission.website && (
                    <div className="pt-2">
                      <a 
                        href={submission.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Visit Website →
                      </a>
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