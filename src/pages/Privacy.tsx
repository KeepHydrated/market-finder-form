import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";

const Privacy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy | From Farmers Markets"
        description="Learn how From Farmers Markets collects, uses, and protects your personal information."
        path="/privacy"
      />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 1, 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you use From Farmers Markets, we may collect personal information you provide directly, such as your name, email address, shipping address, and payment details when making purchases. We also collect usage data such as pages visited, interactions with the site, and device information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect to process orders, communicate with you about your purchases, improve our platform, and connect buyers with vendors. We may also use your location data to show you farmers markets and vendors near you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share your information with vendors when you place an order so they can fulfill it. We also share data with payment processors (such as Stripe) to handle transactions securely. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your preferences, and understand how you use our platform. You can control cookie settings through your browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, update, or delete your personal information at any time through your account settings. You may also contact us to request a copy of your data or to have it deleted entirely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through the live chat on our website or email us at hello@fromfarmersmarkets.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
