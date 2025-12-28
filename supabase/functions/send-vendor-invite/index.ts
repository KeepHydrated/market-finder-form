import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VendorInviteRequest {
  emails: string[];
  marketName: string;
  marketId: number;
  senderName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, marketName, marketId, senderName }: VendorInviteRequest = await req.json();

    if (!emails || emails.length === 0) {
      throw new Error("No email addresses provided");
    }

    if (!marketName || !marketId) {
      throw new Error("Market name and ID are required");
    }

    const signupLink = `https://fromfarmersmarkets.com/vendor-signup/${marketId}`;
    
    const results = [];
    const errors = [];

    for (const email of emails) {
      try {
        const emailResponse = await resend.emails.send({
          from: "From Farmers Markets <noreply@fromfarmersmarkets.com>",
          to: [email],
          subject: `You're invited to sell at ${marketName}!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #16a34a; margin-bottom: 10px;">🌽 From Farmers Markets</h1>
              </div>
              
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                <h2 style="color: #166534; margin-top: 0;">You're Invited to Join ${marketName}!</h2>
                
                <p>Hello!</p>
                
                <p>${senderName ? `${senderName} has invited you` : "You've been invited"} to become a vendor at <strong>${marketName}</strong> through From Farmers Markets.</p>
                
                <p>Join our growing community of local farmers, artisans, and producers to:</p>
                
                <ul style="color: #166534;">
                  <li>Reach more customers in your area</li>
                  <li>Manage your products and orders online</li>
                  <li>Connect directly with buyers</li>
                  <li>Grow your local business</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${signupLink}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Apply to Become a Vendor</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">Or copy this link: <a href="${signupLink}" style="color: #16a34a;">${signupLink}</a></p>
              </div>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                <p>© ${new Date().getFullYear()} From Farmers Markets. All rights reserved.</p>
                <p>Connecting local vendors with their communities.</p>
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Email sent successfully to ${email}:`, emailResponse);
        results.push({ email, success: true, id: emailResponse.id });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${email}:`, emailError);
        errors.push({ email, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.length, 
        failed: errors.length,
        results,
        errors 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-vendor-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
