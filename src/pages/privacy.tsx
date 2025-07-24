import NavigationHeader from '@/components/navigation-header';
import AdBanner from '@/components/ads/AdBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Banner Ad */}
      <AdBanner position="top" size="medium" />
      
      <NavigationHeader user={null} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-slate-600">Last updated: January 1, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <h2>1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, connect your email, or contact us for support.
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Discover and track your subscriptions</li>
              <li>Send you technical notices and support messages</li>
              <li>Display relevant advertisements</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
            </p>

            <h2>4. Email Access</h2>
            <p>
              When you connect your Gmail account, we access your emails solely to identify subscription-related messages. We do not read, store, or share the content of your personal emails.
            </p>

            <h2>5. Advertising</h2>
            <p>
              We work with advertising partners to display relevant ads. These partners may use cookies and similar technologies to collect information about your browsing activities.
            </p>

            <h2>6. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2>7. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2>8. Cookies</h2>
            <p>
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver targeted advertisements.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@subzero.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

