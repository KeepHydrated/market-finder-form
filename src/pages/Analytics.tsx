import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const AUTHORIZED_EMAIL = 'nadiachibri@gmail.com';

  // Check if user is authorized
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || user.email !== AUTHORIZED_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Page Views</h1>
        <p className="text-muted-foreground">Track visitor engagement across different time periods</p>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">7</div>
              <p className="text-xs text-muted-foreground">vs 21 yesterday</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">57</div>
              <p className="text-xs text-muted-foreground">vs 126 last week</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">355</div>
              <p className="text-xs text-muted-foreground">vs 3042 last month</p>
            </CardContent>
          </Card>

          <Card className="min-w-[200px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">3397</div>
              <p className="text-xs text-muted-foreground">All time page views</p>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default Analytics;
