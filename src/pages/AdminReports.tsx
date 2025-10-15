import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flag, CheckCircle, XCircle } from "lucide-react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";

interface Report {
  id: string;
  reporter_id: string;
  vendor_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_email?: string;
  vendor_name?: string;
}

export default function AdminReports() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
    }
  }, [isAdmin]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data: reportsData, error } = await supabase
        .from("reports")
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(full_name),
          vendor:submissions!reports_vendor_id_fkey(store_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reportsWithInfo = (reportsData || []).map((report: any) => ({
        ...report,
        reporter_email: report.reporter?.full_name || "Unknown User",
        vendor_name: report.vendor?.store_name || "Unknown Vendor",
      }));

      setReports(reportsWithInfo);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Report marked as ${newStatus}`,
      });

      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive",
      });
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <GlobalHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Reports Management</h1>
          <p className="text-muted-foreground">
            Review and manage vendor reports
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        Report against {report.vendor_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Reported by: {report.reporter_email}</span>
                        <span>•</span>
                        <span>
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        report.status === "pending"
                          ? "secondary"
                          : report.status === "resolved"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold mb-1">Reason:</p>
                    <p className="text-muted-foreground">{report.reason}</p>
                  </div>
                  {report.description && (
                    <div>
                      <p className="font-semibold mb-1">Additional Details:</p>
                      <p className="text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {report.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateReportStatus(report.id, "resolved")
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateReportStatus(report.id, "dismissed")
                          }
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                      </>
                    )}
                    {report.status !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateReportStatus(report.id, "pending")
                        }
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
