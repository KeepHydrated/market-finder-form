import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeName, specialty, markets, vendorId, quantity = 100 } = await req.json();
    
    const gelatoApiKey = Deno.env.get("GELATO_API_KEY");
    if (!gelatoApiKey) {
      throw new Error("Gelato API key not configured");
    }

    // Create the order payload for Gelato
    const orderPayload = {
      orderReferenceId: `vendor-${vendorId}-${Date.now()}`,
      customerReferenceId: vendorId,
      items: [
        {
          itemReferenceId: `card-${vendorId}`,
          productUid: "cards_350gsm", // Standard business card product
          files: [
            {
              url: `${req.headers.get("origin")}/api/generate-card-pdf?vendorId=${vendorId}`,
              type: "default"
            }
          ],
          quantity: quantity,
        }
      ],
      shippingAddress: {
        // This should be collected from the vendor
        firstName: storeName.split(" ")[0],
        lastName: storeName.split(" ").slice(1).join(" ") || "Store",
        addressLine1: "To be configured",
        city: "To be configured",
        postCode: "00000",
        country: "US"
      }
    };

    console.log("Creating Gelato order:", orderPayload);

    // Create order in Gelato
    const response = await fetch("https://api.gelato.com/v4/orders", {
      method: "POST",
      headers: {
        "X-API-KEY": gelatoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gelato API error:", errorText);
      throw new Error(`Gelato API error: ${response.status} - ${errorText}`);
    }

    const orderData = await response.json();
    console.log("Gelato order created:", orderData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: orderData.orderId,
        orderReferenceId: orderData.orderReferenceId,
        message: "Business cards order created successfully" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating Gelato order:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to create business cards order"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
