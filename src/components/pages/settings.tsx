import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NavigationHeader from '@/components/navigation-header';
import MobileNavigation from '@/components/mobile-navigation';
import AdBanner from '@/components/ads/AdBanner';
import AdSidebar from '@/components/ads/AdSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bell, 
  Shield, 
  Mail, 
  Smartphone,
  CreditCard,
  Download,
  Trash2
} from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    billing: true,
    marketing: false
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Banner Ad */}
      <AdBanner position="top" size="medium" />
      
      <NavigationHeader user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Account Settings
              </h1>
              <p className="text-slate-600">
                Manage your account preferences and privacy settings
              </p>
            </div>

            {/* Account Information */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Account Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={user?.name || ''} placeholder="Your name" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={user?.email || ''} placeholder="your@email.com" disabled />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-slate-600">Receive updates about your subscriptions via email</div>
                  </div>
                  <Switch 
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Push Notifications</div>
                    <div className="text-sm text-slate-600">Get notified on your device about billing reminders</div>
                  </div>
                  <Switch 
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Billing Alerts</div>
                    <div className="text-sm text-slate-600">Important notifications about upcoming charges</div>
                  </div>
                  <Switch 
                    checked={notifications.billing}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, billing: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Marketing Updates</div>
                    <div className="text-sm text-slate-600">Tips and news about subscription management</div>
                  </div>
                  <Switch 
                    checked={notifications.marketing}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Connected Accounts */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Connected Accounts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">Gmail</div>
                      <div className="text-sm text-slate-600">{user?.email}</div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">Bank Account</div>
                      <div className="text-sm text-slate-600">Connect for automatic discovery</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Privacy & Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Data Export</div>
                    <div className="text-sm text-slate-600">Download all your subscription data</div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 w-4 h-4" />
                    Export Data
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Delete Account</div>
                    <div className="text-sm text-slate-600">Permanently delete your account and all data</div>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="mr-2 w-4 h-4" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button onClick={logout} variant="outline">
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
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

