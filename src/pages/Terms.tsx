import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms and Conditions | From Farmers Markets"
        description="Read the terms and conditions for using From Farmers Markets, our marketplace connecting you with local farmers market vendors."
        path="/terms"
      />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 1, 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using From Farmers Markets, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Use of the Platform</h2>
            <p className="text-muted-foreground leading-relaxed">
              From Farmers Markets is a marketplace connecting buyers with small businesses and vendors at farmers markets across the United States. You may use the platform to browse, purchase products, and communicate with vendors. You agree not to misuse the platform or engage in any fraudulent activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information when creating an account and to update your information as needed. You are responsible for all activity that occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Purchases and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              All purchases are processed through our secure payment provider, Stripe. Prices are set by individual vendors and are listed in US dollars. We are not responsible for pricing errors made by vendors. Refund and return policies are handled on a per-vendor basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Vendor Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vendors are responsible for the accuracy of their product listings, fulfilling orders in a timely manner, and complying with all applicable local, state, and federal regulations. From Farmers Markets is not responsible for the quality, safety, or legality of products sold by vendors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on the platform, including logos, designs, and text, is the property of From Farmers Markets or its content suppliers. Vendors retain ownership of their product images and descriptions. You may not reproduce, distribute, or create derivative works without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              From Farmers Markets acts as a marketplace platform and is not a party to transactions between buyers and vendors. We are not liable for any damages arising from the use of the platform, including but not limited to product quality, shipping delays, or disputes between buyers and vendors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violations of these terms or for any conduct that we determine to be harmful to the platform or its users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms and Conditions from time to time. We will notify users of significant changes. Your continued use of the platform after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us through the live chat on our website or email us at hello@fromfarmersmarkets.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
