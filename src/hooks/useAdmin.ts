import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  console.log("useAdmin: Hook initialized", { 
    hasUser: !!user, 
    userId: user?.id,
    userEmail: user?.email,
    isAdmin, 
    loading 
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log("useAdmin: checkAdminStatus called", { 
        hasUser: !!user, 
        userId: user?.id,
        userEmail: user?.email
      });
      
      if (!user) {
        console.log("useAdmin: No user, setting isAdmin to false");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log("useAdmin: Checking admin status for user:", user.id, user.email);

      try {
        console.log("useAdmin: Starting database query for user:", user.id);
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        console.log("useAdmin: Database query complete", { data, error });

        if (error) {
          console.error("useAdmin: Database error:", error);
          throw error;
        }
        
        const isAdminUser = !!data;
        console.log("useAdmin: Setting isAdmin to:", isAdminUser);
        setIsAdmin(isAdminUser);
      } catch (error) {
        console.error("useAdmin: Error in admin check:", error);
        setIsAdmin(false);
      } finally {
        console.log("useAdmin: Admin check complete, setting loading to false");
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};
