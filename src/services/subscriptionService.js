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

// Mock subscription data for development
const mockSubscriptions = [
  {
    id: 1,
    name: 'Netflix',
    category: 'Entertainment',
    monthlyAmount: 15.49,
    yearlyAmount: 185.88,
    nextBillingDate: '2024-07-15',
    status: 'active',
    icon: 'netflix',
    color: '#E50914',
    description: 'Premium streaming plan',
    billingCycle: 'monthly',
    discoveredVia: 'bank',
  },
  {
    id: 2,
    name: 'Spotify',
    category: 'Entertainment',
    monthlyAmount: 9.99,
    yearlyAmount: 119.88,
    nextBillingDate: '2024-07-07',
    status: 'active',
    icon: 'spotify',
    color: '#1DB954',
    description: 'Premium music streaming',
    billingCycle: 'monthly',
    discoveredVia: 'email',
  },
  {
    id: 3,
    name: 'Adobe Creative Cloud',
    category: 'Productivity',
    monthlyAmount: 52.99,
    yearlyAmount: 635.88,
    nextBillingDate: '2024-07-14',
    status: 'active',
    icon: 'adobe',
    color: '#FF0000',
    description: 'All apps plan',
    billingCycle: 'monthly',
    discoveredVia: 'bank',
  },
  {
    id: 4,
    name: 'OneDrive',
    category: 'Cloud Storage',
    monthlyAmount: 6.99,
    yearlyAmount: 83.88,
    nextBillingDate: '2024-07-20',
    status: 'active',
    icon: 'cloud',
    color: '#0078D4',
    description: '1TB storage plan',
    billingCycle: 'monthly',
    discoveredVia: 'email',
  },
];

const mockUpcomingBills = [
  { id: 1, name: 'Spotify', amount: 9.99, date: '2024-07-07', daysUntil: 2 },
  { id: 2, name: 'Adobe Creative Cloud', amount: 52.99, date: '2024-07-14', daysUntil: 9 },
  { id: 3, name: 'Netflix', amount: 15.49, date: '2024-07-15', daysUntil: 10 },
  { id: 4, name: 'OneDrive', amount: 6.99, date: '2024-07-20', daysUntil: 15 },
];

class SubscriptionService {
  async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('authToken');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getSubscriptions() {
    try {
      // In development, return mock data
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
        return mockSubscriptions;
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.get('/subscriptions', { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load subscriptions');
    }
  }

  async getUpcomingBills() {
    try {
      // In development, return mock data
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockUpcomingBills;
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.get('/subscriptions/upcoming-bills', { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load upcoming bills');
    }
  }

  async discoverSubscriptions(options = {}) {
    try {
      // In development, simulate discovery process
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate discovery time
        
        // Return some "discovered" subscriptions
        const discoveredSubs = [
          {
            id: Date.now() + 1,
            name: 'YouTube Premium',
            category: 'Entertainment',
            monthlyAmount: 11.99,
            yearlyAmount: 143.88,
            nextBillingDate: '2024-08-01',
            status: 'active',
            icon: 'youtube',
            color: '#FF0000',
            description: 'Ad-free videos and music',
            billingCycle: 'monthly',
            discoveredVia: options.includeBankData ? 'bank' : 'email',
          },
          {
            id: Date.now() + 2,
            name: 'Dropbox',
            category: 'Cloud Storage',
            monthlyAmount: 9.99,
            yearlyAmount: 119.88,
            nextBillingDate: '2024-08-05',
            status: 'active',
            icon: 'dropbox',
            color: '#0061FF',
            description: 'Plus plan - 2TB storage',
            billingCycle: 'monthly',
            discoveredVia: options.includeEmailData ? 'email' : 'bank',
          },
        ];

        return discoveredSubs;
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/subscriptions/discover', options, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to discover subscriptions');
    }
  }

  async addSubscription(subscriptionData) {
    try {
      // In development, simulate adding subscription
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          id: Date.now(),
          ...subscriptionData,
          status: 'active',
          discoveredVia: 'manual',
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/subscriptions', subscriptionData, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to add subscription');
    }
  }

  async updateSubscription(id, subscriptionData) {
    try {
      // In development, simulate update
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { id, ...subscriptionData };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.put(`/subscriptions/${id}`, subscriptionData, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to update subscription');
    }
  }

  async deleteSubscription(id) {
    try {
      // In development, simulate deletion
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      await api.delete(`/subscriptions/${id}`, { headers });
      return { success: true };
    } catch (error) {
      throw new Error('Failed to delete subscription');
    }
  }

  async cancelSubscription(id, reason) {
    try {
      // In development, simulate cancellation
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          success: true,
          message: 'Cancellation request submitted',
          confirmationNumber: `CNF-${Date.now()}`,
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post(`/subscriptions/${id}/cancel`, { reason }, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to cancel subscription');
    }
  }

  async getSpendingAnalytics(period = 'monthly') {
    try {
      // In development, return mock analytics
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const monthlyData = [
          { month: 'Jan', amount: 78.46 },
          { month: 'Feb', amount: 84.46 },
          { month: 'Mar', amount: 84.46 },
          { month: 'Apr', amount: 84.46 },
          { month: 'May', amount: 84.46 },
          { month: 'Jun', amount: 84.46 },
        ];

        const categoryData = [
          { category: 'Entertainment', amount: 25.48, percentage: 30.2 },
          { category: 'Productivity', amount: 52.99, percentage: 62.7 },
          { category: 'Cloud Storage', amount: 6.99, percentage: 8.3 },
        ];

        return {
          monthlyData,
          categoryData,
          totalMonthly: 84.46,
          totalYearly: 1013.52,
          averagePerService: 21.12,
          activeSubscriptions: 4,
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.get(`/subscriptions/analytics?period=${period}`, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load analytics');
    }
  }

  async connectBankAccount(plaidToken) {
    try {
      // In development, simulate bank connection
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          success: true,
          accountId: `bank_${Date.now()}`,
          bankName: 'Chase Bank',
          accountType: 'checking',
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/accounts/connect-bank', { plaidToken }, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to connect bank account');
    }
  }

  async connectEmailAccount(emailProvider, accessToken) {
    try {
      // In development, simulate email connection
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
          success: true,
          accountId: `email_${Date.now()}`,
          provider: emailProvider,
          email: 'user@example.com',
        };
      }

      // Production API call
      const headers = await this.getAuthHeaders();
      const response = await api.post('/accounts/connect-email', { 
        provider: emailProvider, 
        accessToken 
      }, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to connect email account');
    }
  }
}

export const subscriptionService = new SubscriptionService();

