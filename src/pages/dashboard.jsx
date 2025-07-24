import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  DollarSign,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Calendar,
  Plus,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [cancellationStats, setCancellationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [analyticsRes, subscriptionsRes, cancellationsRes] = await Promise.all([
          apiClient.getSubscriptionAnalytics(),
          apiClient.getSubscriptions({ status: 'active' }),
          apiClient.getCancellationStats(),
        ]);

        setAnalytics(analyticsRes);
        setSubscriptions(subscriptionsRes.subscriptions || []);
        setCancellationStats(cancellationsRes);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const categoryData = analytics?.category_breakdown
    ? Object.entries(analytics.category_breakdown).map(([category, data], index) => ({
        name: category.replace('_', ' ').toUpperCase(),
        value: data.amount,
        count: data.count,
        color: COLORS[index % COLORS.length],
      }))
    : [];

  const monthlyTrend = [
    { month: 'Jan', amount: analytics?.total_monthly_spend * 0.9 || 0 },
    { month: 'Feb', amount: analytics?.total_monthly_spend * 0.95 || 0 },
    { month: 'Mar', amount: analytics?.total_monthly_spend || 0 },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.first_name || 'User'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's an overview of your subscription spending and savings.
            </p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/subscriptions">
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics?.total_monthly_spend?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">↓ 12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.subscription_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-blue-600">+2</span> new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Spending</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics?.total_annual_spend?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected for this year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${analytics?.potential_savings?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated monthly savings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>
                Your subscription spending breakdown by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Monthly Spend']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No subscription data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Spending Trend</CardTitle>
              <CardDescription>
                Your monthly subscription spending over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Subscriptions & Upcoming Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Subscriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Subscriptions</CardTitle>
                <CardDescription>Your latest subscription activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/subscriptions">
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions.slice(0, 5).map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {subscription.service_name || subscription.merchant_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {subscription.billing_cycle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${subscription.amount}</p>
                      <Badge variant="secondary" className="text-xs">
                        {subscription.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {subscriptions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No subscriptions found</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link to="/subscriptions">Add your first subscription</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Bills */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bills</CardTitle>
              <CardDescription>Bills due in the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.upcoming_bills?.slice(0, 5).map((bill) => (
                  <div key={bill.subscription_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{bill.service_name}</p>
                        <p className="text-sm text-gray-500">
                          {bill.days_until > 0 ? `In ${bill.days_until} days` : 'Due today'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${bill.amount}</p>
                      <p className="text-sm text-gray-500">{bill.billing_date}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No upcoming bills</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cancellation Stats */}
        {cancellationStats && (
          <Card>
            <CardHeader>
              <CardTitle>Cancellation Overview</CardTitle>
              <CardDescription>
                Your subscription cancellation activity and savings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {cancellationStats.total_requests}
                  </div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {cancellationStats.completed_requests}
                  </div>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {cancellationStats.pending_requests}
                  </div>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${cancellationStats.total_annual_savings?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-sm text-gray-600">Annual Savings</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Success Rate</span>
                  <span>{cancellationStats.success_rate}%</span>
                </div>
                <Progress value={cancellationStats.success_rate} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

