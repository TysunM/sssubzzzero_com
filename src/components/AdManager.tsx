import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdAnalytics {
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate
  revenue: number;
}

interface AdContextType {
  analytics: AdAnalytics;
  trackImpression: (adId: string, position: string) => void;
  trackClick: (adId: string, position: string) => void;
  isAdBlockerDetected: boolean;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export const useAds = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
};

interface AdProviderProps {
  children: ReactNode;
}

export function AdProvider({ children }: AdProviderProps) {
  const [analytics, setAnalytics] = useState<AdAnalytics>({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    revenue: 0
  });
  
  const [isAdBlockerDetected, setIsAdBlockerDetected] = useState(false);

  // Detect ad blocker
  useEffect(() => {
    const detectAdBlocker = () => {
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox';
      testAd.style.position = 'absolute';
      testAd.style.left = '-10000px';
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        if (testAd.offsetHeight === 0) {
          setIsAdBlockerDetected(true);
        }
        document.body.removeChild(testAd);
      }, 100);
    };

    detectAdBlocker();
  }, []);

  const trackImpression = (adId: string, position: string) => {
    setAnalytics(prev => ({
      ...prev,
      impressions: prev.impressions + 1,
      ctr: prev.clicks / (prev.impressions + 1) * 100
    }));
    
    // Send to analytics service
    console.log(`Ad impression: ${adId} at ${position}`);
    
    // In production, send to your analytics service
    // fetch('/api/analytics/impression', {
    //   method: 'POST',
    //   body: JSON.stringify({ adId, position, timestamp: Date.now() })
    // });
  };

  const trackClick = (adId: string, position: string) => {
    setAnalytics(prev => ({
      ...prev,
      clicks: prev.clicks + 1,
      ctr: (prev.clicks + 1) / prev.impressions * 100,
      revenue: prev.revenue + 0.25 // Estimated revenue per click
    }));
    
    // Send to analytics service
    console.log(`Ad click: ${adId} at ${position}`);
    
    // In production, send to your analytics service
    // fetch('/api/analytics/click', {
    //   method: 'POST',
    //   body: JSON.stringify({ adId, position, timestamp: Date.now() })
    // });
  };

  return (
    <AdContext.Provider value={{
      analytics,
      trackImpression,
      trackClick,
      isAdBlockerDetected
    }}>
      {children}
      {isAdBlockerDetected && <AdBlockerMessage />}
    </AdContext.Provider>
  );
}

function AdBlockerMessage() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">💡</div>
        <div className="flex-1">
          <div className="font-semibold mb-1">Support SubZero</div>
          <div className="text-sm opacity-90 mb-3">
            We noticed you're using an ad blocker. SubZero is free thanks to our advertisers. 
            Please consider whitelisting us to support the service.
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsVisible(false)}
              className="text-xs bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition-colors"
            >
              Dismiss
            </button>
            <button 
              onClick={() => window.open('https://help.getadblock.com/hc/en-us/articles/360062733293', '_blank')}
              className="text-xs bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              How to Whitelist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for tracking ad visibility
export function useAdVisibility(adId: string, position: string) {
  const { trackImpression } = useAds();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackImpression(adId, position);
          }
        });
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(adId);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [adId, position, trackImpression]);
}

// Ad performance dashboard component
export function AdDashboard() {
  const { analytics } = useAds();
  
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">Ad Performance</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{analytics.impressions}</div>
          <div className="text-xs text-gray-500">Impressions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{analytics.clicks}</div>
          <div className="text-xs text-gray-500">Clicks</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{analytics.ctr.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">CTR</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">${analytics.revenue.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Revenue</div>
        </div>
      </div>
    </div>
  );
}

