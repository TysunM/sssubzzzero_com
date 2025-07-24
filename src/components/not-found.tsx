import { Link } from 'wouter';
import NavigationHeader from '@/components/navigation-header';
import AdBanner from '@/components/ads/AdBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Banner Ad */}
      <AdBanner position="top" size="medium" />
      
      <NavigationHeader user={null} />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardContent className="pt-16 pb-16">
              <div className="text-6xl font-bold text-slate-300 mb-4">404</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                Page Not Found
              </h1>
              <p className="text-slate-600 mb-8">
                The page you're looking for doesn't exist or has been moved.
              </p>
              
              <div className="space-y-4">
                <Link href="/">
                  <Button className="w-full">
                    <Home className="mr-2 w-4 h-4" />
                    Go Home
                  </Button>
                </Link>
                
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full">
                    <Search className="mr-2 w-4 h-4" />
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

