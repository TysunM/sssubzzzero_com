import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/api';

export default function SubscribePage() {
  const [bankConnected, setBankConnected] = useState(false);
  const apiRequest = useApi();

  const connectBank = async () => {
    try {
      const { link_token } = await apiRequest('POST', '/api/plaid/link-token', {});
      
      const { default: Plaid } = await import('plaid-link');
      if (!Plaid) throw new Error('Plaid SDK unavailable');
      
      const handler = Plaid.create({
        token: link_token,
        onSuccess: async (public_token: string) => {
          await apiRequest('POST', '/api/plaid/exchange-token', { public_token });
          setBankConnected(true);
          toast({ title: 'Bank Connected', description: 'Account linked successfully' });
        },
        onExit: () => toast({ 
          title: 'Connection Closed', 
          variant: 'destructive' 
        })
      });
      
      handler.open();
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bank Connection</h1>
      <Button 
        onClick={connectBank} 
        disabled={bankConnected}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {bankConnected ? '✓ Account Connected' : 'Connect Bank Account'}
      </Button>
    </div>
  );
}
