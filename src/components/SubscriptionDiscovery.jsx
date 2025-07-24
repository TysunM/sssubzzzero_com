import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Banknote, 
  Mail, 
  Shield, 
  CheckCircle, 
  Loader2,
  CreditCard,
  AlertCircle
} from 'lucide-react'

const SubscriptionDiscovery = () => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [discoveredSubs, setDiscoveredSubs] = useState([])

  const steps = [
    { id: 1, title: 'Choose Discovery Method', description: 'Select how to find your subscriptions' },
    { id: 2, title: 'Connect Accounts', description: 'Securely link your accounts' },
    { id: 3, title: 'Review Results', description: 'Confirm discovered subscriptions' }
  ]

  const mockDiscoveredSubs = [
    { name: 'Netflix', cost: 15.49, source: 'bank', confidence: 'high' },
    { name: 'Spotify Premium', cost: 9.99, source: 'email', confidence: 'high' },
    { name: 'Adobe Creative Cloud', cost: 52.99, source: 'bank', confidence: 'medium' },
    { name: 'Microsoft 365', cost: 6.99, source: 'email', confidence: 'high' },
    { name: 'Dropbox Plus', cost: 9.99, source: 'bank', confidence: 'medium' }
  ]

  const handleBankConnect = () => {
    setLoading(true)
    setTimeout(() => {
      setDiscoveredSubs(mockDiscoveredSubs.filter(sub => sub.source === 'bank'))
      setLoading(false)
      setStep(3)
    }, 3000)
  }

  const handleEmailConnect = () => {
    setLoading(true)
    setTimeout(() => {
      setDiscoveredSubs(mockDiscoveredSubs.filter(sub => sub.source === 'email'))
      setLoading(false)
      setStep(3)
    }, 2500)
  }

  const handleBothConnect = () => {
    setLoading(true)
    setTimeout(() => {
      setDiscoveredSubs(mockDiscoveredSubs)
      setLoading(false)
      setStep(3)
    }, 4000)
  }

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold">SubZero</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.id ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > s.id ? 'bg-blue-600' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{steps[step - 1].title}</h1>
            <p className="text-muted-foreground">{steps[step - 1].description}</p>
          </div>
        </motion.div>

        {/* Step 1: Choose Method */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStep(2)}>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <CardTitle>Bank Account Analysis</CardTitle>
                  <CardDescription>
                    Connect your bank account to automatically find recurring charges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Most accurate detection
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Finds all payment methods
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Bank-level security
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStep(2)}>
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center text-green-600 mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <CardTitle>Email Scanning</CardTitle>
                  <CardDescription>
                    Scan your email for subscription receipts and confirmations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Quick setup
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Finds trial subscriptions
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      No financial data shared
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      🚀 Recommended: Use Both Methods
                    </h3>
                    <p className="text-purple-700 dark:text-purple-300">
                      Get the most comprehensive results by combining bank and email analysis
                    </p>
                  </div>
                  <Button 
                    onClick={() => setStep(2)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Use Both
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">Your data is secure</h4>
                    <p className="text-sm text-muted-foreground">
                      We use bank-level encryption and never store your login credentials. 
                      All connections are read-only and can be revoked at any time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Connect Accounts */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing your accounts...</h3>
                  <p className="text-muted-foreground mb-4">
                    This may take a few moments while we securely scan for subscriptions
                  </p>
                  <Progress value={66} className="w-full max-w-md mx-auto" />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleBankConnect}>
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 mx-auto mb-4">
                      <Banknote className="w-8 h-8" />
                    </div>
                    <CardTitle>Connect Bank Account</CardTitle>
                    <CardDescription>
                      Powered by Plaid - used by millions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button className="w-full">Connect Securely</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleEmailConnect}>
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center text-green-600 mx-auto mb-4">
                      <Mail className="w-8 h-8" />
                    </div>
                    <CardTitle>Connect Email</CardTitle>
                    <CardDescription>
                      Gmail, Outlook, and more
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full">Connect Email</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200 dark:border-purple-800" onClick={handleBothConnect}>
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center text-purple-600 mx-auto mb-4">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <CardTitle>Connect Both</CardTitle>
                    <CardDescription>
                      Most comprehensive results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      Connect All
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Review Results */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                  Found {discoveredSubs.length} Subscriptions
                </CardTitle>
                <CardDescription>
                  Review and confirm the subscriptions we discovered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {discoveredSubs.map((sub, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{sub.name}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {sub.source === 'bank' ? 'Bank' : 'Email'}
                            </Badge>
                            <Badge className={`text-xs ${getConfidenceColor(sub.confidence)}`}>
                              {sub.confidence} confidence
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${sub.cost}</div>
                        <div className="text-sm text-muted-foreground">monthly</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Total Monthly Cost</h4>
                      <p className="text-sm text-muted-foreground">
                        Based on discovered subscriptions
                      </p>
                    </div>
                    <div className="text-2xl font-bold">
                      ${discoveredSubs.reduce((sum, sub) => sum + sub.cost, 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 mt-6">
                  <Button className="flex-1">
                    Add All Subscriptions
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Review Individually
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">What's next?</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      We'll continue monitoring your accounts for new subscriptions and send you alerts 
                      when we detect changes or upcoming bills.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default SubscriptionDiscovery

