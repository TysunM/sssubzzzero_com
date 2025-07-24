import NavigationHeader from '@/components/navigation-header';
import AdBanner from '@/components/ads/AdBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Banner Ad */}
      <AdBanner position="top" size="medium" />
      
      <NavigationHeader user={null} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Terms of Service</CardTitle>
            <p className="text-center text-slate-600">Last updated: January 1, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using SubZero, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              SubZero is a free subscription management platform that helps users discover, track, and manage their recurring subscriptions. Our service is supported by advertising revenue.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              To use certain features of our service, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information.
            </p>

            <h2>4. Privacy and Data</h2>
            <p>
              We respect your privacy. Our data collection and use practices are outlined in our Privacy Policy. By using our service, you consent to the collection and use of information as described.
            </p>

            <h2>5. Advertising</h2>
            <p>
              SubZero is a free service supported by advertising. By using our platform, you agree to view advertisements that may be targeted based on your usage patterns and preferences.
            </p>

            <h2>6. Prohibited Uses</h2>
            <p>
              You may not use our service for any unlawful purpose or to solicit others to perform unlawful acts. You may not violate any local, state, national, or international law.
            </p>

            <h2>7. Limitation of Liability</h2>
            <p>
              SubZero shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
            </p>

            <h2>8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website.
            </p>

            <h2>9. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at legal@subzero.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

