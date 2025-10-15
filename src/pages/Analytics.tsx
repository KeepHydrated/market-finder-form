import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
    </div>
  );
};

export default Analytics;
