import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Play, Music, Palette, Github, X, Crown, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Subscription } from "@shared/schema";

interface SubscriptionCardProps {
  subscription: Subscription;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  isPremium?: boolean;
}

const getServiceIcon = (name: string, category: string) => {
  const serviceName = name.toLowerCase();
  
  if (serviceName.includes("netflix")) {
    return <Play className="text-white" size={20} />;
  } else if (serviceName.includes("spotify")) {
    return <Music className="text-white" size={20} />;
  } else if (serviceName.includes("adobe")) {
    return <Palette className="text-white" size={20} />;
  } else if (serviceName.includes("github")) {
    return <Github className="text-white" size={20} />;
  }
  
  // Fallback based on category
  switch (category) {
    case "entertainment":
      return <Play className="text-white" size={20} />;
    case "productivity":
      return <Palette className="text-white" size={20} />;
    case "software":
      return <Github className="text-white" size={20} />;
    default:
      return <div className="w-5 h-5 bg-white rounded-full" />;
  }
};

const getServiceColor = (name: string, category: string) => {
  const serviceName = name.toLowerCase();
  
  if (serviceName.includes("netflix")) {
    return "bg-red-600";
  } else if (serviceName.includes("spotify")) {
    return "bg-green-500";
  } else if (serviceName.includes("adobe")) {
    return "bg-red-700";
  } else if (serviceName.includes("github")) {
    return "bg-slate-900";
  }
  
  // Fallback based on category
  switch (category) {
    case "entertainment":
      return "bg-purple-600";
    case "productivity":
      return "bg-blue-600";
    case "software":
      return "bg-indigo-600";
    case "health":
      return "bg-green-600";
    default:
      return "bg-slate-600";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusColor = (status: string, cancellationStatus?: string) => {
  if (cancellationStatus === 'pending') {
    return "bg-orange-100 text-orange-800";
  }
  if (cancellationStatus === 'cancelled') {
    return "bg-red-100 text-red-800";
  }
  if (cancellationStatus === 'failed') {
    return "bg-yellow-100 text-yellow-800";
  }
  
  switch (status) {
    case "active":
      return "bg-secondary/10 text-secondary";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusText = (status: string, cancellationStatus?: string) => {
  if (cancellationStatus === 'pending') {
    return "Cancelling";
  }
  if (cancellationStatus === 'cancelled') {
    return "Cancelled";
  }
  if (cancellationStatus === 'failed') {
    return "Cancel Failed";
  }
  
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function SubscriptionCard({ 
  subscription, 
  onDelete, 
  isDeleting,
  isPremium = false
}: SubscriptionCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const iconColor = getServiceColor(subscription.name, subscription.category);
  const icon = getServiceIcon(subscription.name, subscription.category);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/subscriptions/${subscription.id}/cancel`);
    },
    onSuccess: () => {
      toast({
        title: "Cancellation Initiated",
        description: "We've started processing your cancellation request. You'll receive confirmation within 24 hours.",
      });
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to initiate cancellation. Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleCancelSubscription = async () => {
    cancelMutation.mutate();
  };

  return (
    <Card className="hover:bg-slate-50 transition-colors">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3">
          {/* Header with icon, name, and price */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={`${iconColor} p-2 rounded-lg flex-shrink-0`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 truncate">{subscription.name}</h4>
                <p className="text-slate-600 text-sm truncate">
                  {subscription.category.charAt(0).toUpperCase() + subscription.category.slice(1)}
                  {subscription.description && ` • ${subscription.description}`}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-semibold text-slate-900">
                ${subscription.amount}
              </p>
              <p className="text-slate-600 text-sm capitalize">
                {subscription.frequency}
              </p>
            </div>
          </div>

          {/* Status and next billing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="text-xs text-slate-500 truncate">
                Next: {formatDate(subscription.nextBillingDate)}
              </span>
              <Badge className={`${getStatusColor(subscription.status, subscription.cancellationStatus || undefined)} text-xs`}>
                {subscription.cancellationStatus === 'pending' && (
                  <Clock className="mr-1" size={10} />
                )}
                {getStatusText(subscription.status, subscription.cancellationStatus || undefined)}
              </Badge>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-primary h-8 w-8 p-0"
              >
                <Edit size={14} />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={subscription.cancellationStatus === 'pending' ? "secondary" : "destructive"}
                    size="sm"
                    className="text-white h-8 px-2 text-xs"
                    disabled={
                      cancelMutation.isPending || 
                      subscription.cancellationStatus === 'pending' || 
                      subscription.cancellationStatus === 'cancelled' ||
                      subscription.status === 'cancelled'
                    }
                  >
                    {subscription.cancellationStatus === 'pending' ? (
                      <>
                        <Clock size={12} className="mr-1 animate-pulse" />
                        <span className="hidden sm:inline">Cancelling</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <X size={12} className="mr-1" />
                        Cancel
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      {subscription.cancellationStatus === 'pending' ? (
                        <Clock className="text-orange-500 animate-pulse" size={20} />
                      ) : subscription.cancellationStatus === 'failed' ? (
                        <X className="text-yellow-500" size={20} />
                      ) : (
                        <X className="text-orange-500" size={20} />
                      )}
                      <span>
                        {subscription.cancellationStatus === 'pending'
                          ? `Cancelling ${subscription.name}`
                          : subscription.cancellationStatus === 'failed'
                          ? `Retry Cancellation for ${subscription.name}?`
                          : `Cancel ${subscription.name}?`}
                      </span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {subscription.cancellationStatus === 'pending' ? (
                        <>
                          Your cancellation request is being processed. Our automated system is contacting {subscription.name} 
                          to cancel your subscription. You'll receive confirmation within 24 hours.
                        </>
                      ) : subscription.cancellationStatus === 'failed' ? (
                        <>
                          The automatic cancellation failed. Our team will manually process this cancellation within 24 hours, 
                          or you can try the automated process again.
                        </>
                      ) : (
                        <>
                          Our automated cancellation service will contact {subscription.name} directly to cancel your subscription.
                          You'll receive confirmation within 24 hours via email.
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                    {subscription.cancellationStatus !== 'pending' && subscription.cancellationStatus !== 'cancelled' && (
                      <AlertDialogAction 
                        onClick={handleCancelSubscription}
                        disabled={cancelMutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {cancelMutation.isPending ? "Processing..." : 
                          (subscription.cancellationStatus === 'failed' ? "Retry Cancellation" : "Yes, Cancel Subscription")}
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-accent h-8 w-8 p-0"
                onClick={() => onDelete(subscription.id)}
                disabled={isDeleting}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
