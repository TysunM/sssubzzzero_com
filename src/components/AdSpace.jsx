import { useEffect, useRef } from 'react';

/**
 * Real Ad Space Component - Embeds actual advertiser code
 * This component creates a container where real ad code can be injected
 */
export function AdSpace({ 
  id, 
  width = '100%', 
  height = '250px', 
  className = '', 
  adCode = '', 
  placeholder = true 
}) {
  const adRef = useRef(null);

  useEffect(() => {
    if (adCode && adRef.current) {
      // Inject real ad code into the container
      adRef.current.innerHTML = adCode;
      
      // Execute any scripts in the ad code
      const scripts = adRef.current.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        script.parentNode.replaceChild(newScript, script);
      });
    }
  }, [adCode]);

  return (
    <div 
      id={id}
      className={`ad-space ${className}`}
      style={{ 
        width, 
        height,
        border: placeholder && !adCode ? '2px dashed #e2e8f0' : 'none',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: placeholder && !adCode ? '#f8fafc' : 'transparent',
        position: 'relative'
      }}
    >
      {placeholder && !adCode ? (
        <div className="text-center text-gray-500 p-4">
          <div className="text-sm font-medium">Ad Space Available</div>
          <div className="text-xs mt-1">
            {width} × {height}
          </div>
          <div className="text-xs mt-2 text-blue-600">
            Contact us for advertising opportunities
          </div>
        </div>
      ) : (
        <div ref={adRef} className="w-full h-full" />
      )}
    </div>
  );
}

/**
 * Top Banner Ad - Most lucrative position
 */
export function TopBannerAd({ adCode }) {
  return (
    <div className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-2">
      <div className="container mx-auto px-4">
        <AdSpace
          id="top-banner-ad"
          width="100%"
          height="60px"
          adCode={adCode}
          className="text-white"
          placeholder={true}
        />
      </div>
    </div>
  );
}

/**
 * Sidebar Ad - Persistent advertising space
 */
export function SidebarAd({ adCode, position = 'right' }) {
  return (
    <div className={`sidebar-ad ${position === 'left' ? 'order-first' : 'order-last'}`}>
      <div className="sticky top-4">
        <AdSpace
          id={`sidebar-ad-${position}`}
          width="300px"
          height="600px"
          adCode={adCode}
          className="shadow-lg rounded-lg"
          placeholder={true}
        />
      </div>
    </div>
  );
}

/**
 * Inline Content Ad - Native advertising integration
 */
export function InlineAd({ adCode, size = 'medium' }) {
  const sizes = {
    small: { width: '100%', height: '150px' },
    medium: { width: '100%', height: '250px' },
    large: { width: '100%', height: '400px' }
  };

  return (
    <div className="my-8">
      <div className="text-xs text-gray-400 mb-2 text-center">Advertisement</div>
      <AdSpace
        id={`inline-ad-${Date.now()}`}
        width={sizes[size].width}
        height={sizes[size].height}
        adCode={adCode}
        className="rounded-lg shadow-sm"
        placeholder={true}
      />
    </div>
  );
}

/**
 * Footer Ad - Additional revenue stream
 */
export function FooterAd({ adCode }) {
  return (
    <div className="w-full border-t border-gray-200 bg-gray-50 py-4">
      <div className="container mx-auto px-4">
        <AdSpace
          id="footer-ad"
          width="100%"
          height="120px"
          adCode={adCode}
          placeholder={true}
        />
      </div>
    </div>
  );
}

/**
 * Mobile Banner Ad - Mobile-optimized advertising
 */
export function MobileBannerAd({ adCode }) {
  return (
    <div className="block md:hidden w-full py-2 bg-gray-50 border-y border-gray-200">
      <AdSpace
        id="mobile-banner-ad"
        width="100%"
        height="80px"
        adCode={adCode}
        placeholder={true}
      />
    </div>
  );
}

