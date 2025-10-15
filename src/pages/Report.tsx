import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Report {
  id: string;
  reporter_id: string;
  vendor_id: string;
  reason: string;
  description: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ReportData {
  report: Report;
  reporterProfile: Profile | null;
  vendorProfile: Profile | null;
  reporterEmail: string;
  vendorEmail: string;
}

const Report = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.email !== 'nadiachibri@gmail.com') {
        navigate('/');
        return;
      }
      
      setAuthorized(true);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authorized) return;

    const fetchAllReports = async () => {
      // Fetch all reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError || !reportsData) {
        console.error('Error fetching reports:', reportsError);
        setLoading(false);
        return;
      }

      // Fetch associated data for each report
      const reportsWithData: ReportData[] = await Promise.all(
        reportsData.map(async (report) => {
          let reporterProfile: Profile | null = null;
          let vendorProfile: Profile | null = null;
          let reporterEmail = 'Email not available';
          let vendorEmail = 'Email not available';

          // Fetch reporter profile
          if (report.reporter_id) {
            const { data: reporterData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', report.reporter_id)
              .single();
            
            if (reporterData) {
              reporterProfile = reporterData;
            }
          }

          // Fetch vendor profile
          const { data: vendorData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', report.vendor_id)
            .single();
          
          if (vendorData) {
            vendorProfile = vendorData;
          }

          return {
            report,
            reporterProfile,
            vendorProfile,
            reporterEmail,
            vendorEmail,
          };
        })
      );

      setReports(reportsWithData);
      setLoading(false);
    };

    fetchAllReports();
  }, [authorized]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatReason = (reason: string) => {
    return reason
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-foreground">No reports found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="space-y-8">
        {reports.map(({ report, reporterProfile, vendorProfile, reporterEmail, vendorEmail }) => (
          <div key={report.id} className="border rounded-lg p-6 bg-card">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Reported By:</h2>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2">Person Reported:</h2>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2">Report:</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-3 p-2 rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(reporterProfile?.full_name || null)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <p className="font-medium text-foreground">
                      {reporterProfile?.full_name || 'Anonymous User'}
                    </p>
                    <p className="text-sm text-muted-foreground">{reporterEmail}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 p-2 rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(vendorProfile?.full_name || null)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <p className="font-medium text-foreground">
                      {vendorProfile?.full_name || 'Unknown Vendor'}
                    </p>
                    <p className="text-sm text-muted-foreground">{vendorEmail}</p>
                  </div>
                </div>
              </div>
              <div>
                <div>
                  <p className="text-foreground font-semibold">{formatReason(report.reason)}</p>
                  {report.description && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Report;

