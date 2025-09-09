import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { useToast } from "@/hooks/use-toast";

const Submissions = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <AuthForm onSuccess={() => {
          toast({
            title: "Welcome!",
            description: "You've successfully signed in.",
          });
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                Submissions
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu user={user} profile={profile} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-4">Submissions</h2>
            <p className="text-muted-foreground">
              This page will contain your submission history and status.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Submissions;