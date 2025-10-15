import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Page Views</h1>
        <p className="text-muted-foreground">Track visitor engagement across different time periods</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">7</div>
            <p className="text-sm text-muted-foreground">vs 21 yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">57</div>
            <p className="text-sm text-muted-foreground">vs 126 last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">355</div>
            <p className="text-sm text-muted-foreground">vs 3042 last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">3397</div>
            <p className="text-sm text-muted-foreground">All time page views</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
