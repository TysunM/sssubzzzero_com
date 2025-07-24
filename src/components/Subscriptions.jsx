import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { Plus, Search, Filter, Calendar, DollarSign, AlertCircle, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import UpgradePrompt from '../components/UpgradePrompt.jsx';
import SubscriptionLimitBanner from '../components/SubscriptionLimitBanner.jsx';

const Subscriptions = () => {
  const { user, token } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [featureAccess, setFeatureAccess] = useState({});
  const [subscriptionLimits, setSubscriptionLimits] = useState({});
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState(null);

  useEffect(() => {
    if (user && token) {
      fetchSubscriptions();
      fetchCategories();
    }
  }, [user, token]);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
        setFeatureAccess(data.feature_access || {});
        setSubscriptionLimits(data.subscription_limits || {});
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/subscriptions/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleAddSubscription = () => {
    if (!subscriptionLimits.can_add_more) {
      setUpgradeFeature({
        name: 'Unlimited Subscriptions',
        description: 'Add unlimited subscriptions to track all your services.'
      });
      setShowUpgradePrompt(true);
      return;
    }
    
    // Navigate to add subscription form
    console.log('Navigate to add subscription');
  };

  const handleCancelSubscription = async (subscriptionId) => {
    if (!featureAccess.cancellation_assistance) {
      setUpgradeFeature({
        name: 'Automated Cancellation',
        description: 'Get automated assistance to cancel your subscriptions quickly and easily.'
      });
      setShowUpgradePrompt(true);
      return;
    }

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'User requested cancellation'
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchSubscriptions(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.merchant_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || sub.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      entertainment: '🎬',
      productivity: '💼',
      fitness: '💪',
      news: '📰',
      shopping: '🛍️',
      utilities: '⚡',
      education: '📚',
      finance: '💰',
      other: '📱'
    };
    return iconMap[category] || '📱';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
        <p className="text-gray-600">
          Manage and track all your recurring subscriptions in one place.
        </p>
      </div>

      {/* Subscription Limit Banner */}
      <SubscriptionLimitBanner 
        subscriptionLimits={subscriptionLimits}
        showUpgradePrompt={true}
      />

      {/* Plan Status */}
      {subscriptionLimits.plan_name && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Badge variant={subscriptionLimits.is_premium ? 'default' : 'secondary'}>
                {subscriptionLimits.plan_name} Plan
              </Badge>
              <span className="ml-3 text-sm text-gray-600">
                {subscriptionLimits.current_subscriptions} of {subscriptionLimits.max_subscriptions || '∞'} subscriptions used
              </span>
            </div>
            {!subscriptionLimits.is_premium && (
              <Button
                onClick={() => setShowUpgradePrompt(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Add Subscription Button */}
        <Button
          onClick={handleAddSubscription}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      {/* Subscriptions Grid */}
      {filteredSubscriptions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <DollarSign className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Start by adding your first subscription to track your spending.'
            }
          </p>
          {(!searchTerm && selectedCategory === 'all') && (
            <Button
              onClick={handleAddSubscription}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Subscription
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubscriptions.map((subscription) => (
            <div key={subscription.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {getCategoryIcon(subscription.category)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{subscription.service_name}</h3>
                    <p className="text-sm text-gray-600">{subscription.merchant_name}</p>
                  </div>
                </div>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status}
                </Badge>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(subscription.amount)}
                </div>
                <div className="text-sm text-gray-600">
                  per {subscription.billing_cycle}
                </div>
              </div>

              {/* Next Billing */}
              <div className="mb-4 flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Next billing: {formatDate(subscription.next_billing_date)}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => console.log('Edit subscription', subscription.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleCancelSubscription(subscription.id)}
                >
                  Cancel
                </Button>
              </div>

              {/* Premium Feature Indicators */}
              {!featureAccess.payment_alerts && subscription.next_billing_date && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Upgrade for payment alerts
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature={upgradeFeature}
      />
    </div>
  );
};

export default Subscriptions;

