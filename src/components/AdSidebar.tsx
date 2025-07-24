import { useState } from 'react';
import { ExternalLink, Star, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AdSidebarProps {
  className?: string;
}

const sidebarAds = [
  {
    id: 1,
    title: "💳 Smart Credit Card",
    description: "Earn 5% cashback on subscriptions",
    features: ["No annual fee", "5% on streaming", "2% on everything"],
    cta: "Apply Now",
    rating: 4.9,
    gradient: "from-emerald-500 to-teal-600",
    icon: <TrendingUp className="w-6 h-6" />
  },
  {
    id: 2,
    title: "🛡️ Identity Protection",
    description: "Monitor your subscriptions for fraud",
    features: ["Real-time alerts", "Credit monitoring", "Identity theft protection"],
    cta: "Start Free Trial",
    rating: 4.8,
    gradient: "from-blue-500 to-indigo-600",
    icon: <Shield className="w-6 h-6" />
  },
  {
    id: 3,
    title: "📊 Investment App",
    description: "Invest your subscription savings",
    features: ["$0 commissions", "Fractional shares", "Auto-investing"],
    cta: "Get Started",
    rating: 4.7,
    gradient: "from-purple-500 to-pink-600",
    icon: <Star className="w-6 h-6" />
  }
];

export default function AdSidebar({ className = '' }: AdSidebarProps) {
  const [currentAd, setCurrentAd] = useState(0);

  const handleAdClick = (adId: number) => {
    console.log(`Sidebar ad clicked: ${adId}`);
    window.open('https://example.com/advertiser-landing', '_blank');
  };

  const nextAd = () => {
    setCurrentAd((prev) => (prev + 1) % sidebarAds.length);
  };

  const ad = sidebarAds[currentAd];

  return (
    <div className={`w-full max-w-sm space-y-4 ${className}`}>
      {/* Main Featured Ad */}
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <div 
          className={`h-32 bg-gradient-to-br ${ad.gradient} relative`}
          onClick={() => handleAdClick(ad.id)}
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          <div className="absolute top-4 left-4 text-white">
            {ad.icon}
          </div>
          <div className="absolute bottom-4 left-4 text-white">
            <div className="font-bold text-lg">{ad.title}</div>
            <div className="flex items-center space-x-1 text-sm">
              <Star className="w-4 h-4 fill-current" />
              <span>{ad.rating}</span>
            </div>
          </div>
          <div className="absolute top-2 right-2 text-xs text-white/70 bg-black/20 px-2 py-1 rounded">
            Sponsored
          </div>
        </div>
        
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-3">{ad.description}</p>
          
          <ul className="space-y-1 mb-4">
            {ad.features.map((feature, index) => (
              <li key={index} className="text-xs text-gray-500 flex items-center">
                <div className="w-1 h-1 bg-green-500 rounded-full mr-2" />
                {feature}
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => handleAdClick(ad.id)}
            className={`
              w-full py-2 px-4 rounded-lg font-semibold text-white
              bg-gradient-to-r ${ad.gradient}
              hover:shadow-md transition-all duration-200
              flex items-center justify-center space-x-2
            `}
          >
            <span>{ad.cta}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </CardContent>
      </Card>

      {/* Ad Rotation Indicator */}
      <div className="flex justify-center space-x-2">
        {sidebarAds.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentAd(index)}
            className={`
              w-2 h-2 rounded-full transition-colors
              ${index === currentAd ? 'bg-blue-500' : 'bg-gray-300'}
            `}
          />
        ))}
      </div>

      {/* Compact Ad List */}
      <div className="space-y-2">
        {sidebarAds.slice(0, 2).map((compactAd, index) => (
          <div 
            key={compactAd.id}
            onClick={() => handleAdClick(compactAd.id)}
            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${compactAd.gradient} text-white`}>
                {compactAd.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{compactAd.title}</div>
                <div className="text-xs text-gray-500 truncate">{compactAd.description}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">Sponsored</div>
          </div>
        ))}
      </div>

      {/* Auto-rotation */}
      <script>
        {setTimeout(nextAd, 10000)} {/* Rotate every 10 seconds */}
      </script>
    </div>
  );
}

