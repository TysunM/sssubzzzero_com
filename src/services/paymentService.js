import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configure base URL - in production this would be your deployed backend
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-production-api.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Subscription tier configurations
export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      'Track up to 3 subscriptions',
      'View monthly and yearly spending',
      'Basic subscription discovery',
      'Manual subscription management',
    ],
    limitations: [
      'No bill reminders',
      'No spending alerts',
      'Limited to 3 subscriptions',
      'No advanced analytics',
    ],
  },
  pro: {
    id: 'pro',
    name: 'SubZero Pro',
    price: 4.99,
    priceId: 'price_1234567890', // This would be your actual Stripe price ID
    features: [
      'Unlimited subscriptions',
      'Smart bill reminders',
      'Spending alerts and budgets',
      'Advanced analytics and insights',
      'Priority customer support',
      'Export data to CSV',
      'Subscription cancellation assistance',
      'Custom categories and tags',
    ],
    limitations: [],
  },
};

class PaymentService {
  async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('authToken');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getCurrentSubscription() {
    try {
      // In development, return mock subscription data
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate different subscription states
        const mockStates = [
          { tier: 'free', status: 'active', expiresAt: null },
          { tier: 'pro', status: 'active', expiresAt: '2024-08-15T00:00:00Z' },
          { tier: 'pro', status: 'cancelled', expiresAt: '2024-07-30T00:00:00Z' },
        ];
        
        return mockStates[0]; // Default to free tier
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.get('/subscription/current', { headers });
      return response.data;
    } catch (error) {
      console.error('Failed to get current subscription:', error);
      // Default to free tier on error
      return { tier: 'free', status: 'active', expiresAt: null };
    }
  }

  async createCheckoutSession(priceId, successUrl, cancelUrl) {
    try {
      // In development, simulate checkout session creation
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          sessionId: `cs_test_${Date.now()}`,
          url: `https://checkout.stripe.com/pay/cs_test_${Date.now()}`,
          success: true,
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/subscription/create-checkout-session', {
        priceId,
        successUrl,
        cancelUrl,
      }, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  async createPortalSession(returnUrl) {
    try {
      // In development, simulate portal session creation
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
          url: `https://billing.stripe.com/session/${Date.now()}`,
          success: true,
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/subscription/create-portal-session', {
        returnUrl,
      }, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  async cancelSubscription(reason = '') {
    try {
      // In development, simulate cancellation
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return {
          success: true,
          message: 'Subscription cancelled successfully',
          expiresAt: '2024-08-15T00:00:00Z', // End of current billing period
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/subscription/cancel', {
        reason,
      }, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async reactivateSubscription() {
    try {
      // In development, simulate reactivation
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        return {
          success: true,
          message: 'Subscription reactivated successfully',
          status: 'active',
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/subscription/reactivate', {}, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  async getInvoices(limit = 10) {
    try {
      // In development, return mock invoices
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockInvoices = [
          {
            id: 'in_1234567890',
            date: '2024-06-15T00:00:00Z',
            amount: 4.99,
            status: 'paid',
            description: 'SubZero Pro - Monthly',
            downloadUrl: 'https://example.com/invoice.pdf',
          },
          {
            id: 'in_0987654321',
            date: '2024-05-15T00:00:00Z',
            amount: 4.99,
            status: 'paid',
            description: 'SubZero Pro - Monthly',
            downloadUrl: 'https://example.com/invoice.pdf',
          },
        ];
        
        return mockInvoices;
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.get(`/subscription/invoices?limit=${limit}`, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get invoices:', error);
      return [];
    }
  }

  async updatePaymentMethod(paymentMethodId) {
    try {
      // In development, simulate payment method update
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          message: 'Payment method updated successfully',
          paymentMethod: {
            id: paymentMethodId,
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2025,
            },
          },
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/subscription/update-payment-method', {
        paymentMethodId,
      }, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to update payment method:', error);
      throw new Error('Failed to update payment method');
    }
  }

  async getUsageStats() {
    try {
      // In development, return mock usage stats
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 400));
        
        return {
          subscriptionsCount: 2,
          subscriptionsLimit: 3,
          notificationsEnabled: false,
          analyticsEnabled: false,
          exportEnabled: false,
          supportLevel: 'basic',
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.get('/subscription/usage', { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        subscriptionsCount: 0,
        subscriptionsLimit: 3,
        notificationsEnabled: false,
        analyticsEnabled: false,
        exportEnabled: false,
        supportLevel: 'basic',
      };
    }
  }

  // Helper methods
  getTierInfo(tierId) {
    return SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.free;
  }

  isFeatureAvailable(feature, userTier = 'free') {
    const tierInfo = this.getTierInfo(userTier);
    
    const featureMap = {
      billReminders: userTier === 'pro',
      spendingAlerts: userTier === 'pro',
      unlimitedSubscriptions: userTier === 'pro',
      advancedAnalytics: userTier === 'pro',
      exportData: userTier === 'pro',
      prioritySupport: userTier === 'pro',
      cancellationAssistance: userTier === 'pro',
      customCategories: userTier === 'pro',
    };
    
    return featureMap[feature] || false;
  }

  getSubscriptionLimit(userTier = 'free') {
    return userTier === 'pro' ? Infinity : 3;
  }

  formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  calculateAnnualSavings(monthlyPrice) {
    const annualPrice = monthlyPrice * 10; // 2 months free
    const monthlyAnnual = monthlyPrice * 12;
    return monthlyAnnual - annualPrice;
  }
}

export const paymentService = new PaymentService();

