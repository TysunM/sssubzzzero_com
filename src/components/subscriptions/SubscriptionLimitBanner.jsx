import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Zap, X } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

const SubscriptionLimitBanner = ({ 
  subscriptionLimits, 
  onDismiss,
  showUpgradePrompt = true 
}) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!subscriptionLimits || isDismissed || subscriptionLimits.is_premium) {
    return null;
  }

  const { current_subscriptions, max_subscriptions, can_add_more } = subscriptionLimits;
  const isNearLimit = current_subscriptions >= max_subscriptions - 1;
  const isAtLimit = current_subscriptions >= max_subscriptions;

  if (!isNearLimit && !isAtLimit) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <Alert className={`mb-6 border-l-4 ${
      isAtLimit 
        ? 'border-l-red-500 bg-red-50 border-red-200' 
        : 'border-l-yellow-500 bg-yellow-50 border-yellow-200'
    }`}>
      <AlertTriangle className={`h-4 w-4 ${
        isAtLimit ? 'text-red-600' : 'text-yellow-600'
      }`} />
      
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          <AlertDescription className={`${
            isAtLimit ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {isAtLimit ? (
              <>
                <strong>Subscription limit reached!</strong> You've used all {max_subscriptions} of your free subscriptions.
              </>
            ) : (
              <>
                <strong>Almost at your limit!</strong> You're using {current_subscriptions} of {max_subscriptions} free subscriptions.
              </>
            )}
            {showUpgradePrompt && (
              <span className="ml-2">
                Upgrade to Premium for unlimited subscriptions and premium features.
              </span>
            )}
          </AlertDescription>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {showUpgradePrompt && (
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
          
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className={`${
              isAtLimit 
                ? 'text-red-600 hover:text-red-700 hover:bg-red-100' 
                : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
};

export default SubscriptionLimitBanner;

