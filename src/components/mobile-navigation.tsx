import { useLocation } from 'wouter';
import { 
  Home, 
  CreditCard, 
  Search, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export default function MobileNavigation() {
  const [location] = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    { name: 'Discover', href: '/discover', icon: Search },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <nav className="flex items-center justify-around py-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <a
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : ''}`} />
              <span className="text-xs font-medium">{item.name}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

