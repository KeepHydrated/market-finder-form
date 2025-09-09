import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";

const Homepage = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Homepage</h1>
          <p className="text-muted-foreground">This is a blank homepage.</p>
        </div>
      </div>
    </div>
  );
};

export default Homepage;