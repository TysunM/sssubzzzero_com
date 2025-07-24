import { useState } from 'react';
import { ExternalLink, X, Zap, DollarSign, Smartphone } from 'lucide-react';

interface AdInlineProps {
  variant?: 'card' | 'banner' | 'native';
  className?: string;
}

const inlineAds = [
  {
    id: 1,
    type: 'app',
    title: "💰 Honey - Automatic Coupons",
    description: "Save money on your subscriptions with automatic coupon codes. Join 17 million members saving every day.",
    image: "🍯",
    cta: "Add to Browser - Free",
    highlight: "Save $126/year on average",
    icon: <DollarSign className="w-5 h-5" />
  },
  {
    id: 2,
    type: 'service',
    title: "⚡ Truebill - Cancel Subscriptions",
    description: "Found unwanted subscriptions? Truebill can cancel them for you automatically. No more forgotten charges.",
    image: "⚡",
    cta: "Start Free Scan",
    highlight: "Cancel in 1-click",
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 3,
    type: 'app',
    title: "📱 Mint - Budget Tracker",
    description: "Track all your subscriptions and spending in one place. See where your money goes with beautiful charts.",
    image: "🌿",
    cta: "Download Free",
    highlight: "Used by 25M+ people",
    icon: <Smartphone className="w-5 h-5" />
  }
];

export default function AdInline({ variant = 'card', className = '' }: AdInlineProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentAd] = useState(() => Math.floor(Math.random() * inlineAds.length));
  
  const ad = inlineAds[currentAd];

  const handleAdClick = () => {
    console.log(`Inline ad clicked: ${ad.id}`);
    window.open('https://example.com/advertiser-landing', '_blank');
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  if (variant === 'banner') {
    return (
      <div className={`relative my-6 ${className}`}>
        <div 
          onClick={handleAdClick}
          className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">{ad.image}</div>
              <div>
                <div className="font-semibold text-gray-900">{ad.title}</div>
                <div className="text-sm text-gray-600">{ad.description}</div>
                <div className="text-xs text-green-600 font-medium mt-1">{ad.highlight}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <span className="text-sm font-medium">{ad.cta}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button 
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="absolute top-2 left-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
            Sponsored
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'native') {
    return (
      <div className={`my-4 ${className}`}>
        <div 
          onClick={handleAdClick}
          className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-all duration-200"
        >
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{ad.image}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className="font-medium text-gray-900">{ad.title}</div>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Ad
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">{ad.description}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-green-600 font-medium">{ad.highlight}</div>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
                  <span>{ad.cta}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`relative my-6 ${className}`}>
      <div 
        onClick={handleAdClick}
        className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
      >
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{ad.image}</div>
              <div>
                <div className="font-bold">{ad.title}</div>
                <div className="text-sm opacity-90">{ad.highlight}</div>
              </div>
            </div>
            {ad.icon}
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">{ad.description}</p>
          <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:shadow-md transition-all duration-200 group-hover:scale-105 flex items-center justify-center space-x-2">
            <span className="font-medium">{ad.cta}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <button 
          onClick={handleClose}
          className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="absolute bottom-2 left-2 text-xs text-gray-500">
          Sponsored
        </div>
      </div>
    </div>
  );
}

