import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { useEffect } from "react";

export const GlobalHeader = () => {
  const { user, profile, refreshProfile } = useAuth();
  
  // Listen for profile updates
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);
  
  return <Header user={user} profile={profile} />;
};