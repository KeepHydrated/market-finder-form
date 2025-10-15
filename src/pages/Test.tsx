import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

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

const Test = () => {
  const { reportId } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [reporterProfile, setReporterProfile] = useState<Profile | null>(null);
  const [vendorProfile, setVendorProfile] = useState<Profile | null>(null);
  const [reporterEmail, setReporterEmail] = useState<string>('');
  const [vendorEmail, setVendorEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!reportId) return;

      // Fetch report
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError || !reportData) {
        console.error('Error fetching report:', reportError);
        setLoading(false);
        return;
      }

      setReport(reportData);

      // Fetch reporter profile
      if (reportData.reporter_id) {
        const { data: reporterData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', reportData.reporter_id)
          .single();
        
        if (reporterData) {
          setReporterProfile(reporterData);
        }

        // Fetch reporter email from submissions
        const { data: reporterSubmission } = await supabase
          .from('submissions')
          .select('user_id')
          .eq('user_id', reportData.reporter_id)
          .single();
        
        if (reporterSubmission) {
          setReporterEmail('Email not available');
        }
      }

      // Fetch vendor profile
      const { data: vendorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', reportData.vendor_id)
        .single();
      
      if (vendorData) {
        setVendorProfile(vendorData);
      }

      // Fetch vendor info from submissions
      const { data: vendorSubmission } = await supabase
        .from('submissions')
        .select('store_name')
        .eq('user_id', reportData.vendor_id)
        .single();
      
      if (vendorSubmission) {
        setVendorEmail('Email not available');
      }

      setLoading(false);
    };

    fetchReportData();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-foreground">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-foreground">Report not found</p>
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Reported By:</h2>
        </div>
        <div className="rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Person Reported:</h2>
        </div>
        <div className="rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Report:</h2>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 border rounded-lg p-6 bg-card">
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
            <p className="text-foreground font-semibold">{report.reason}</p>
            {report.description && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;

