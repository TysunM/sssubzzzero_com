import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Mail,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  DollarSign,
  Calendar,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth.jsx';
import Layout from '../components/Layout';

export default function DiscoverSubscriptions() {
  const [step, setStep] = useState('intro'); // intro, connecting, analyzing, results
  const [bankConnected, setBankConnected] = useState(false);
  const [emailConnected, setEmailConnected] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has existing connections
    checkExistingConnections();
  }, []);

  const checkExistingConnections = async () => {
    try {
      const connections = await apiClient.getConnectedAccounts();
      setBankConnected(connections.bank_accounts?.length > 0);
      setEmailConnected(connections.email_connected);
    } catch (error) {
      console.error('Failed to check connections:', error);
    }
  };

  const connectBankAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create Plaid Link token
      const response = await apiClient.createPlaidLinkToken();
      const linkToken = response.link_token;
      
      // Initialize Plaid Link (in a real app, you'd use the Plaid Link SDK)
      // For demo purposes, we'll simulate the connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBankConnected(true);
      setProgress(prev => Math.min(prev + 50, 100));
      
    } catch (error) {
      setError('Failed to connect bank account. Please try again.');
      console.error('Bank connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get Gmail OAuth URL
      const response = await apiClient.getGmailAuthUrl();
      
      // In a real app, you'd redirect to Google OAuth
      // For demo purposes, we'll simulate the connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailConnected(true);
      setProgress(prev => Math.min(prev + 50, 100));
      
    } catch (error) {
      setError('Failed to connect email account. Please try again.');
      console.error('Email connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startDiscovery = async () => {
    if (!bankConnected && !emailConnected) {
      setError('Please connect at least one account to discover subscriptions.');
      return;
    }

    try {
      setStep('analyzing');
      setLoading(true);
      setError(null);
      setProgress(0);

      // Simulate discovery progress
      const progressSteps = [
        { message: 'Analyzing bank transactions...', progress: 25 },
        { message: 'Scanning email for subscriptions...', progress: 50 },
        { message: 'Identifying recurring payments...', progress: 75 },
        { message: 'Generating insights...', progress: 100 },
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setProgress(step.progress);
      }

      // Call discovery API
      const results = await apiClient.discoverSubscriptions({
        include_bank: bankConnected,
        include_email: emailConnected,
      });

      setDiscoveryResults(results);
      setStep('results');
      
    } catch (error) {
      setError('Failed to discover subscriptions. Please try again.');
      console.error('Discovery error:', error);
      setStep('connecting');
    } finally {
      setLoading(false);
    }
  };

  const saveDiscoveredSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Save selected subscriptions
      await apiClient.saveDiscoveredSubscriptions(discoveryResults.subscriptions);
      
      // Navigate to subscriptions page
      navigate('/subscriptions', { 
        state: { message: 'Subscriptions discovered and saved successfully!' }
      });
      
    } catch (error) {
      setError('Failed to save subscriptions. Please try again.');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderIntroStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Find Your Subscriptions
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Connect your accounts to automatically discover and track all your subscriptions. 
          We'll analyze your transactions and emails to find recurring payments you might have forgotten about.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Bank Account Analysis</CardTitle>
                <CardDescription>Secure transaction scanning</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Identifies recurring payments
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Detects subscription amounts
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Tracks billing cycles
              </li>
              <li className="flex items-center">
                <Shield className="h-4 w-4 text-blue-600 mr-2" />
                Bank-level security
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Email Scanning</CardTitle>
                <CardDescription>Receipt and billing analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Finds subscription receipts
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Discovers trial conversions
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Identifies renewal dates
              </li>
              <li className="flex items-center">
                <Shield className="h-4 w-4 text-blue-600 mr-2" />
                Read-only access
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button 
          onClick={() => setStep('connecting')} 
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          Get Started
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <p className="text-sm text-gray-500 mt-3">
          Your data is encrypted and never stored permanently
        </p>
      </div>
    </div>
  );

  const renderConnectingStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Connect Your Accounts
        </h1>
        <p className="text-gray-600">
          Choose which accounts to connect for subscription discovery
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 mb-8">
        <Card className={`border-2 ${bankConnected ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  bankConnected ? 'bg-green-600' : 'bg-gray-100'
                }`}>
                  <CreditCard className={`h-6 w-6 ${bankConnected ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold">Bank Account</h3>
                  <p className="text-sm text-gray-600">
                    {bankConnected ? 'Connected securely' : 'Connect to analyze transactions'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {bankConnected && <CheckCircle className="h-5 w-5 text-green-600" />}
                <Button
                  onClick={connectBankAccount}
                  disabled={loading || bankConnected}
                  variant={bankConnected ? "outline" : "default"}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : bankConnected ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : null}
                  {bankConnected ? 'Reconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${emailConnected ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  emailConnected ? 'bg-green-600' : 'bg-gray-100'
                }`}>
                  <Mail className={`h-6 w-6 ${emailConnected ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold">Email Account</h3>
                  <p className="text-sm text-gray-600">
                    {emailConnected ? 'Connected securely' : 'Connect to scan receipts'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {emailConnected && <CheckCircle className="h-5 w-5 text-green-600" />}
                <Button
                  onClick={connectEmail}
                  disabled={loading || emailConnected}
                  variant={emailConnected ? "outline" : "default"}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : emailConnected ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : null}
                  {emailConnected ? 'Reconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button 
          onClick={startDiscovery}
          disabled={(!bankConnected && !emailConnected) || loading}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Discover Subscriptions
        </Button>
      </div>
    </div>
  );

  const renderAnalyzingStep = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Discovering Your Subscriptions
      </h1>
      <p className="text-gray-600 mb-8">
        We're analyzing your accounts to find all your recurring payments and subscriptions.
      </p>
      
      <div className="space-y-4">
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-gray-500">
          {progress < 25 && 'Analyzing bank transactions...'}
          {progress >= 25 && progress < 50 && 'Scanning email for subscriptions...'}
          {progress >= 50 && progress < 75 && 'Identifying recurring payments...'}
          {progress >= 75 && 'Generating insights...'}
        </p>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discovery Complete!
        </h1>
        <p className="text-gray-600">
          We found {discoveryResults?.subscriptions?.length || 0} subscriptions and analyzed your spending patterns.
        </p>
      </div>

      {discoveryResults && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${discoveryResults.analysis?.total_monthly?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Across all subscriptions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Annual Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${discoveryResults.analysis?.total_annual?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Projected yearly spend
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ${discoveryResults.recommendations?.reduce((sum, rec) => sum + (rec.potential_savings || 0), 0)?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Estimated monthly
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Discovered Subscriptions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Discovered Subscriptions</CardTitle>
              <CardDescription>
                Review and confirm the subscriptions we found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {discoveryResults.subscriptions?.map((subscription, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{subscription.merchant_name}</h4>
                        <p className="text-sm text-gray-500">
                          {subscription.service_name} • {subscription.billing_cycle}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {subscription.detection_source}
                          </Badge>
                          <Badge 
                            variant={subscription.confidence_score > 0.8 ? "default" : "outline"}
                            className="text-xs"
                          >
                            {Math.round(subscription.confidence_score * 100)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${subscription.amount}</p>
                      <p className="text-sm text-gray-500">{subscription.category}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No subscriptions found</p>
                    <p className="text-sm">Try connecting additional accounts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {discoveryResults.recommendations?.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Ways to optimize your subscription spending
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {discoveryResults.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{rec.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                          <Badge 
                            variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                            className="mt-2"
                          >
                            {rec.priority} priority
                          </Badge>
                        </div>
                        {rec.potential_savings > 0 && (
                          <div className="text-right ml-4">
                            <p className="font-semibold text-green-600">
                              ${rec.potential_savings.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">potential savings</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <Button 
              onClick={saveDiscoveredSubscriptions}
              disabled={loading}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Save Subscriptions
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {step === 'intro' && renderIntroStep()}
          {step === 'connecting' && renderConnectingStep()}
          {step === 'analyzing' && renderAnalyzingStep()}
          {step === 'results' && renderResultsStep()}
        </div>
      </div>
    </Layout>
  );
}

