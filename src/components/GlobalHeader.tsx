import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";

export const GlobalHeader = () => {
  const { user, profile } = useAuth();
  
  return <Header user={user} profile={profile} />;
};