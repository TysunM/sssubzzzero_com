    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const validatedData = updateSubscriptionSchema.parse(req.body);
      const subscription = await storage.updateSubscription(id, validatedData, userId);
      res.json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
      } else {
        console.error("Error updating subscription:", error);
        res.status(500).json({ message: "Failed to update subscription" });
      }
    }
  });

  app.delete("/api/subscriptions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.deleteSubscription(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  // Google OAuth routes
  app.get('/api/auth/google/callback', async (req: any, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).send('<script>window.close();</script>');
      }

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).send('<script>alert("Google OAuth not configured"); window.close();</script>');
      }

      // Get user ID from state or session
      let userId = state as string;
      if (!userId && req.session?.userId) {
        userId = req.session.userId;
      }
      
      if (!userId) {
        return res.status(400).send('<script>alert("User session not found"); window.close();</script>');
      }

      // Use our OAuth service to exchange code for tokens
      const { exchangeCodeForTokens } = require('./services/oauth.service');
      await exchangeCodeForTokens(code as string, userId);

      // Signal success to parent window
      res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'GMAIL_AUTH_SUCCESS', 
              success: true
            }, '*');
          }
          window.close();
        </script>
      `);
    } catch (error) {
      console.error('Gmail OAuth callback error:', error);
      res.status(500).send('<script>alert("Authentication failed"); window.close();</script>');
    }
  });

  // Get Google Client ID for frontend
  app.get('/api/auth/google/client-id', (req, res) => {
    res.json({ 
      clientId: GOOGLE_CLIENT_ID || null,
      configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
    });
  });

  // Get Google OAuth URL
  app.get('/api/auth/google/url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { getGoogleAuthUrl } = require('./services/oauth.service');
      const authUrl = getGoogleAuthUrl(userId);
      
      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating OAuth URL:', error);
      res.status(500).json({ error: 'Failed to generate authentication URL' });
    }
  });

  // Check Gmail connection status
  app.get('/api/gmail/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isTokenValid } = require('./services/oauth.service');
      const isConnected = await isTokenValid(userId);
      
      res.json({ 
        connected: isConnected,
        userId: userId 
      });
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      res.json({ connected: false });
    }
  });

  // Gmail subscription discovery endpoint
  app.post('/api/discover/gmail', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      console.log(`Starting Gmail discovery for user: ${userId}`);
      
      // Use our comprehensive analysis service
      const { analyzeEmailsForSubscriptions } = require('./services/analysis.service');
      const discoveredSubscriptions = await analyzeEmailsForSubscriptions(userId);
      
      console.log(`Gmail analysis completed. Found ${discoveredSubscriptions.length} subscriptions`);
      
      res.json({
        success: true,
        subscriptions: discoveredSubscriptions,
        totalFound: discoveredSubscriptions.length,
        source: 'gmail',
        analyzed: true
      });
    } catch (error) {
      console.error('Gmail discovery error:', error);
      
      let errorMessage = 'Failed to scan Gmail for subscriptions';
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('No Gmail tokens found')) {
          errorMessage = 'Gmail not connected. Please connect your Gmail account first.';
          statusCode = 403;
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage = 'Gmail token expired. Please reconnect your Gmail account.';
          statusCode = 401;
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          errorMessage = 'Gmail API quota exceeded. Please try again later.';
          statusCode = 429;
        }
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API Configuration verification (backend only)
  app.get('/api/admin/config-status', isAuthenticated, async (req: any, res) => {
    try {
      const configStatus = {
        google: {
          configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
          clientId: GOOGLE_CLIENT_ID ? 'Configured' : 'Missing',
          secret: GOOGLE_CLIENT_SECRET ? 'Configured' : 'Missing'
        },
        plaid: {
          configured: !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
          environment: process.env.PLAID_ENV || 'sandbox'
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(configStatus);
    } catch (error) {
      console.error("Error checking config status:", error);
      res.status(500).json({ error: "Failed to check configuration status" });
    }
  });

  // Subscription discovery route - now completely free!
  app.post("/api/discover-subscriptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Simulate AI discovery process (in production, this would integrate with email/bank APIs)
      const discoveredSubscriptions = [
        {
          name: "Netflix",
          description: "Video streaming service",
          amount: 15.99,
          frequency: "monthly",
          category: "Entertainment",
          nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          status: "active",
          notes: "Discovered from email confirmation - billing@netflix.com"
        },
        {
          name: "Spotify Premium",