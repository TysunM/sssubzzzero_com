import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NavigationHeader from '@/components/navigation-header';
import MobileNavigation from '@/components/mobile-navigation';
import AdBanner from '@/components/ads/AdBanner';
import AdInline from '@/components/ads/AdInline';
import AdSidebar from '@/components/ads/AdSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  DollarSign, 
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface Subscription {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  category: string;
  status: string;
  description?: string;
  website?: string;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    // Load demo subscriptions
    const demoSubscriptions: Subscription[] = [
      {
        id: 1,
        name: "Netflix",
        amount: 15.99,
        frequency: "monthly",
        nextBillingDate: "2025-01-15",
        category: "Entertainment",
        status: "active",
        description: "Video streaming service",
        website: "netflix.com"
      },
      {
        id: 2,
        name: "Spotify Premium",
        amount: 9.99,
        frequency: "monthly",
        nextBillingDate: "2025-01-10",
        category: "Music",
        status: "active",
        description: "Music streaming service",
        website: "spotify.com"
      },
      {
        id: 3,
        name: "Adobe Creative Cloud",
        amount: 52.99,
        frequency: "monthly",
        nextBillingDate: "2025-01-20",
        category: "Software",
        status: "active",
        description: "Creative software suite",
        website: "adobe.com"
      },
      {
        id: 4,
        name: "Amazon Prime",
        amount: 139,
        frequency: "yearly",
        nextBillingDate: "2025-03-15",
        category: "Shopping",
        status: "active",
        description: "Prime membership benefits",
        website: "amazon.com"
      },
      {
        id: 5,
        name: "GitHub Pro",
        amount: 4,
        frequency: "monthly",
        nextBillingDate: "2025-01-08",
        category: "Software",
        status: "active",
        description: "Code repository hosting",
        website: "github.com"
      },
      {
        id: 6,
        name: "Figma Professional",
        amount: 12,
        frequency: "monthly",
        nextBillingDate: "2025-01-25",
        category: "Software",
        status: "active",
        description: "Design collaboration tool",
        website: "figma.com"
      }
    ];

    setSubscriptions(demoSubscriptions);
  }, []);

  // Filter and sort subscriptions
  const filteredSubscriptions = subscriptions
    .filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sub.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || sub.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'date':
          return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const categories = ['all', ...Array.from(new Set(subscriptions.map(sub => sub.category)))];
  const totalMonthly = subscriptions
    .filter(sub => sub.frequency === 'monthly')
    .reduce((sum, sub) => sum + sub.amount, 0);
  const totalYearly = subscriptions
    .filter(sub => sub.frequency === 'yearly')
    .reduce((sum, sub) => sum + sub.amount, 0);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Entertainment': 'bg-red-100 text-red-800',
      'Music': 'bg-green-100 text-green-800',
      'Software': 'bg-blue-100 text-blue-800',
      'Shopping': 'bg-orange-100 text-orange-800',
      'Fitness': 'bg-purple-100 text-purple-800',
      'News': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

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
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  My Subscriptions
                </h1>
                <p className="text-slate-600">
                  Manage all your recurring subscriptions in one place
                </p>
              </div>
              <Button className="mt-4 md:mt-0">
                <Plus className="mr-2 w-4 h-4" />
                Add Subscription
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subscriptions.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active services
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(totalMonthly + totalYearly/12).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Per month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Yearly Total</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(totalMonthly * 12 + totalYearly).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Annual cost
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Inline Ad */}
            <AdInline variant="banner" />

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search subscriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full md:w-48">
                      <Filter className="mr-2 w-4 h-4" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="date">Next Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Subscriptions Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {filteredSubscriptions.map((subscription) => (
                <Card key={subscription.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                          {subscription.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{subscription.name}</CardTitle>
                          <p className="text-sm text-slate-600">{subscription.description}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Amount</span>
                        <span className="font-semibold text-lg">
                          ${subscription.amount}
                          <span className="text-sm text-slate-500">/{subscription.frequency}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Next Billing</span>
                        <span className="text-sm">
                          {new Date(subscription.nextBillingDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Category</span>
                        <Badge className={getCategoryColor(subscription.category)}>
                          {subscription.category}
                        </Badge>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="mr-2 w-3 h-3" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <ExternalLink className="mr-2 w-3 h-3" />
                          Visit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSubscriptions.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-slate-400 mb-4">
                    <Search className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No subscriptions found
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {searchTerm || filterCategory !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Start by discovering subscriptions or adding them manually'
                    }
                  </p>
                  <Button>
                    <Plus className="mr-2 w-4 h-4" />
                    Add Your First Subscription
                  </Button>
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

