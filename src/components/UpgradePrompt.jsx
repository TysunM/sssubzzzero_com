import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Star, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const UpgradePrompt = ({ 
  isOpen, 
  onClose, 
  feature, 
  title = "Upgrade to Premium",
  description = "Unlock this feature and more with Premium"
}) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleUpgrade = () => {
    navigate('/pricing');
    onClose();
  };

  if (!isOpen) return null;

  const premiumFeatures = [
    'Unlimited subscription tracking',
    'Payment due date alerts',
    'Automated cancellation assistance',
    'Advanced spending analytics',
    'Export data and reports',
    'Priority customer support'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-200 ${
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center mb-2">
            <Star className="h-6 w-6 mr-2" />
            <Badge className="bg-white/20 text-white border-white/30">
              Premium Feature
            </Badge>
          </div>
          
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="text-blue-100">{description}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {feature && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">
                {feature.name || 'Premium Feature'}
              </h4>
              <p className="text-blue-700 text-sm">
                {feature.description || 'This feature is available with Premium subscription.'}
              </p>
            </div>
          )}

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              What you'll get with Premium:
            </h4>
            <ul className="space-y-2">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-700">
                  <div className="h-2 w-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">Premium Plan</p>
                <p className="text-green-700 text-sm">Everything you need</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900">$4.99</p>
                <p className="text-green-700 text-sm">/month</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to Premium
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Cancel anytime. No long-term commitments.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;

