import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { vendor_id } = await req.json();
    if (!vendor_id) throw new Error("vendor_id is required");

    // Check vendor belongs to user
    const { data: vendor, error: vendorError } = await supabaseClient
      .from('submissions')
      .select('id, store_name, stripe_account_id')
      .eq('id', vendor_id)
      .eq('user_id', user.id)
      .single();

    if (vendorError || !vendor) throw new Error("Vendor not found or not owned by user");
    logStep("Vendor found", { vendorId: vendor.id, storeName: vendor.store_name });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://fromfarmersmarkets.lovable.app";

    let accountId = vendor.stripe_account_id;

    if (!accountId) {
      // Create a new Standard Connect account
      const account = await stripe.accounts.create({
        type: 'standard',
        email: user.email!,
        metadata: {
          vendor_id: vendor.id,
          store_name: vendor.store_name,
        },
      });
      accountId = account.id;
      logStep("Created Stripe Connect account", { accountId });

      // Save to database
      await supabaseClient
        .from('submissions')
        .update({ stripe_account_id: accountId })
        .eq('id', vendor.id);
    } else {
      logStep("Using existing Stripe Connect account", { accountId });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/my-shop?section=setup`,
      return_url: `${origin}/my-shop?section=setup&stripe_connected=true`,
      type: 'account_onboarding',
    });

    logStep("Created account link", { url: accountLink.url });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
