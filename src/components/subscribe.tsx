import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import NavigationHeader from '@/components/navigation-header';
import MobileNavigation from '@/components/mobile-navigation';
import AdBanner from '@/components/ads/AdBanner';
import AdInline from '@/components/ads/AdInline';
import AdSidebar from '@/components/ads/AdSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Check, Mail, Eye, Search, ArrowRight, Sparkles, Shield, AlertCircle, Link } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function Subscribe() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [discoveryStep, setDiscoveryStep] = useState<'select' | 'scanning' | 'complete'>('select');
  const [emailConnected, setEmailConnected] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [foundSubscriptions, setFoundSubscriptions] = useState<any[]>([]);

  // Check Gmail connection status on load
  useEffect(() => {
    if (user) {
      checkGmailConnection();
    }
  }, [user]);

  const checkGmailConnection = async () => {
    try {
      const response = await apiRequest("GET", "/gmail/status");
      if (response.connected) {
        setEmailConnected(true);
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
    }
  };

  // Gmail OAuth integration
  const connectGmail = async () => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to connect Gmail.",
          variant: "destructive",
        });
        return;
      }

      // Get OAuth URL from our backend
      const response = await apiRequest("GET", "/auth/google/url");
      const { authUrl } = response;
      
      if (!authUrl) {
        toast({
          title: "Configuration Error",
          description: "Gmail integration is not properly configured. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Open OAuth popup
      const popup = window.open(authUrl, 'gmail-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again.",
          variant: "destructive",
        });
        return;
      }

      // Listen for OAuth completion via postMessage
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GMAIL_AUTH_SUCCESS' && event.data.success) {
          setEmailConnected(true);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          
          toast({
            title: "Gmail Connected!",
            description: "Your Gmail account has been successfully connected. You can now discover subscriptions.",
            duration: 5000,
          });
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Check if popup is closed without success
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          
          // Check connection status
          setTimeout(() => checkGmailConnection(), 1000);
        }
      }, 1000);
    } catch (error) {
      console.error('Gmail connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Gmail. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Start the discovery process
  const startDiscovery = async () => {
    if (!emailConnected) {
      toast({
        title: "Connect Gmail first",
        description: "Please connect your Gmail account to discover subscriptions.",
        variant: "destructive",
      });
      return;
    }

    setDiscoveryStep('scanning');
    setScanProgress(0);

    try {
      // Simulate scanning progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Call Gmail discovery API
      const response = await apiRequest("POST", "/discover/gmail");

      clearInterval(progressInterval);
      setScanProgress(100);
      setFoundSubscriptions(response.subscriptions || []);
      setDiscoveryStep('complete');

      toast({
        title: "Discovery Complete",
        description: `Found ${response.subscriptions?.length || 0} subscriptions`,
      });

    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Failed to discover subscriptions. Please try again.",
        variant: "destructive",
      });
      setDiscoveryStep('select');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to discover subscriptions</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Banner Ad */}
      <AdBanner position="top" size="medium" />
      
      <NavigationHeader user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Discover Your Hidden Subscriptions
              </h1>
              <p className="text-xl text-slate-600 mb-2">
                Connect your Gmail to find all recurring charges automatically
              </p>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                100% Free • Bank-Level Security
              </Badge>
            </div>

            {discoveryStep === 'select' && (
              <div className="max-w-2xl mx-auto mb-8">
                {/* Gmail Connection */}
                <Card className={`cursor-pointer transition-all ${emailConnected ? 'ring-2 ring-green-500 bg-green-50' : 'hover:shadow-lg'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Mail className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <span>Connect Gmail</span>
                        {emailConnected && <Check className="inline ml-2 text-green-600" size={20} />}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      Scan your email for subscription confirmations, billing receipts, and renewal notices.
                    </p>
                    <ul className="text-sm text-slate-500 space-y-1 mb-4">
                      <li>• Netflix, Spotify, Adobe confirmations</li>
                      <li>• App Store and Google Play receipts</li>
                      <li>• Subscription renewal notices</li>
                      <li>• Trial-to-paid conversions</li>
                    </ul>
                    <Button 
                      onClick={connectGmail}
                      disabled={emailConnected}
                      className="w-full"
                      variant={emailConnected ? "outline" : "default"}
                    >
                      {emailConnected ? (
                        <><Check className="mr-2" size={16} /> Connected</>
                      ) : (
                        <><Link className="mr-2" size={16} /> Connect Gmail</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Inline Ad */}
            <AdInline variant="banner" />

            {/* Security Notice */}
            <Alert className="mb-6 border-blue-200 bg-blue-50 max-w-2xl mx-auto">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Bank-level security:</strong> We use read-only access with 256-bit encryption. 
                We never store your emails or have access to send messages.
              </AlertDescription>
            </Alert>

            {/* Start Discovery Button */}
            {discoveryStep === 'select' && (
              <div className="text-center">
                <Button 
                  onClick={startDiscovery}
                  disabled={!emailConnected}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 text-lg"
                >
                  <Search className="mr-2" size={20} />
                  Start Discovery Process
                  <ArrowRight className="ml-2" size={20} />
                </Button>
                {!emailConnected && (
                  <p className="text-sm text-slate-500 mt-2">
                    Connect Gmail to begin
                  </p>
                )}
              </div>
            )}

            {/* Scanning Progress */}
            {discoveryStep === 'scanning' && (
              <Card className="mb-6 max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="text-purple-600" size={24} />
                    <span>AI Discovery in Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={scanProgress} className="w-full" />
                    <div className="text-center">
                      <p className="text-slate-600">
                        {scanProgress < 30 && "Analyzing email patterns..."}
                        {scanProgress >= 30 && scanProgress < 60 && "Scanning for subscription receipts..."}
                        {scanProgress >= 60 && scanProgress < 90 && "Identifying recurring charges..."}
                        {scanProgress >= 90 && "Finalizing discovery..."}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">{scanProgress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discovery Results */}
            {discoveryStep === 'complete' && (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Check className="text-green-600" size={24} />
                    <span>Discovery Complete</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">
                    Found {foundSubscriptions.length} subscriptions. They've been added to your dashboard.
                  </p>
                  <div className="flex space-x-4">
                    <Button onClick={() => window.location.href = "/"}>
                      View Dashboard
                    </Button>
                    <Button variant="outline" onClick={() => setDiscoveryStep('select')}>
                      Discover More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar with Ads */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <AdSidebar />
            </div>
          </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
}

