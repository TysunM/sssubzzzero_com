import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, TrendingUp, List, Clock } from "lucide-react";

interface StatsOverviewProps {
  stats?: {
    monthlyTotal: number;
    yearlyTotal: number;
    activeCount: number;
    upcomingRenewals: number;
  };
  isLoading: boolean;
}

const handleNavigation = (path: string) => {
  window.location.href = path;
};

export default function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card 
        className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200 hover:border-blue-300"
        onClick={() => handleNavigation('/analytics')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Monthly</p>
              <p className="text-2xl font-bold text-slate-900">
                ${stats?.monthlyTotal.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <CreditCard className="text-primary" size={24} />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <span className="text-slate-600">Monthly spending • Click to view analytics</span>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200 hover:border-green-300"
        onClick={() => handleNavigation('/analytics')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Yearly</p>
              <p className="text-2xl font-bold text-slate-900">
                ${stats?.yearlyTotal.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg">
              <TrendingUp className="text-secondary" size={24} />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <span className="text-slate-600">Yearly projection • Click to view trends</span>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200 hover:border-yellow-400"
        onClick={() => handleNavigation('/subscriptions')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Active Subscriptions</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.activeCount || 0}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <List className="text-yellow-600" size={24} />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <span className="text-slate-600">Currently active • Click to manage</span>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200 hover:border-purple-300"
        onClick={() => handleNavigation('/subscriptions')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Upcoming Renewals</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.upcomingRenewals || 0}
              </p>
            </div>
            <div className="bg-accent/10 p-3 rounded-lg">
              <Clock className="text-accent" size={24} />
            </div>
          </div>
          <div className="flex items-center mt-3 text-sm">
            <span className="text-slate-600">Next 7 days • Click to view details</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
