import { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';

interface AdBannerProps {
  position: 'top' | 'bottom' | 'inline';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const adContent = {
  top: {
    title: "🚀 Boost Your Business",
    description: "Reach 10,000+ subscription-savvy users daily",
    cta: "Advertise Here",
    gradient: "from-blue-600 to-purple-600"
  },
  bottom: {
    title: "💰 Smart Financial Tools",
    description: "Discover apps that help you save money",
    cta: "Learn More",
    gradient: "from-green-600 to-blue-600"
  },
  inline: {
    title: "📱 Featured App",
    description: "The #1 budgeting app trusted by millions",
    cta: "Try Free",
    gradient: "from-purple-600 to-pink-600"
  }
};

export default function AdBanner({ position, size = 'medium', className = '' }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  const content = adContent[position];
  
  const sizeClasses = {
    small: 'h-16 text-sm',
    medium: 'h-20 text-base',
    large: 'h-24 text-lg'
  };

  const handleAdClick = () => {
    // Track ad click for analytics
    console.log(`Ad clicked: ${position} banner`);
    // In production, this would track the click and redirect to advertiser
    window.open('https://example.com/advertiser-landing', '_blank');
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    // Track ad dismissal
    console.log(`Ad dismissed: ${position} banner`);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`
        relative w-full ${sizeClasses[size]} 
        bg-gradient-to-r ${content.gradient}
        flex items-center justify-between px-6 py-3
        cursor-pointer transition-all duration-300 ease-in-out
        hover:shadow-lg hover:scale-[1.02]
        ${position === 'top' ? 'sticky top-0 z-50' : ''}
        ${className}
      `}
      onClick={handleAdClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ad Content */}
      <div className="flex items-center space-x-4 text-white">
        <div className="flex-1">
          <div className="font-bold">{content.title}</div>
          <div className="text-sm opacity-90">{content.description}</div>
        </div>
        
        <div className={`
          px-4 py-2 bg-white/20 rounded-lg font-semibold
          transition-all duration-200
          ${isHovered ? 'bg-white/30 transform scale-105' : ''}
        `}>
          {content.cta}
          <ExternalLink className="inline ml-2 w-4 h-4" />
        </div>
      </div>

      {/* Close Button (for non-top banners) */}
      {position !== 'top' && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Ad Label */}
      <div className="absolute bottom-1 left-2 text-xs text-white/60">
        Ad
      </div>
    </div>
  );
}

