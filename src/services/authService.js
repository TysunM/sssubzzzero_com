import axios from 'axios';

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

// Mock data for development
const mockUsers = [
  {
    id: 1,
    email: 'demo@subzero.com',
    name: 'Demo User',
    subscriptionTier: 'free',
    subscriptionCount: 2,
  },
];

class AuthService {
  async login(email, password) {
    try {
      // In development, use mock authentication
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        if (email === 'demo@subzero.com' && password === 'demo123') {
          return {
            token: 'mock-jwt-token',
            user: mockUsers[0],
          };
        } else {
          throw new Error('Invalid email or password');
        }
      }

      // Production API call
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      } else if (error.request) {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error(error.message || 'Login failed');
      }
    }
  }

  async register(email, password, name) {
    try {
      // In development, use mock registration
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        const newUser = {
          id: Date.now(),
          email,
          name,
          subscriptionTier: 'free',
          subscriptionCount: 0,
        };

        return {
          token: 'mock-jwt-token',
          user: newUser,
        };
      }

      // Production API call
      const response = await api.post('/auth/register', {
        email,
        password,
        name,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Registration failed');
      } else if (error.request) {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error(error.message || 'Registration failed');
      }
    }
  }

  async getCurrentUser(token) {
    try {
      // In development, return mock user
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockUsers[0];
      }

      // Production API call
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error('Failed to get user information');
    }
  }

  async updateProfile(token, profileData) {
    try {
      // In development, return updated mock user
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { ...mockUsers[0], ...profileData };
      }

      // Production API call
      const response = await api.put('/auth/profile', profileData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  }

  async forgotPassword(email) {
    try {
      // In development, simulate success
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { message: 'Password reset email sent' };
      }

      // Production API call
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw new Error('Failed to send password reset email');
    }
  }
}

export const authService = new AuthService();

