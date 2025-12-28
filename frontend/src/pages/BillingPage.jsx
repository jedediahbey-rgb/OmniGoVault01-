import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Check, 
  X, 
  Zap, 
  Crown, 
  Building2, 
  Loader2,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Users,
  FolderOpen,
  HardDrive,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Plan tier icons
const tierIcons = {
  0: <Zap className="w-5 h-5" />,
  1: <Sparkles className="w-5 h-5" />,
  2: <Crown className="w-5 h-5" />,
  3: <Building2 className="w-5 h-5" />
};

// Plan tier colors
const tierColors = {
  0: 'text-gray-400 bg-gray-400/10',
  1: 'text-blue-400 bg-blue-400/10',
  2: 'text-vault-gold bg-vault-gold/10',
  3: 'text-purple-400 bg-purple-400/10'
};

const BillingPage = () => {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [userProfile, setUserProfile] = useState(null);

  // Check for checkout success/cancel from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const success = params.get('success');
    const canceled = params.get('canceled');

    if (sessionId && success === 'true') {
      pollCheckoutStatus(sessionId);
    } else if (canceled === 'true') {
      toast.error('Checkout canceled');
      // Clean URL
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  const pollCheckoutStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.info('Payment verification pending. Refresh to check status.');
      window.history.replaceState({}, '', '/billing');
      return;
    }

    try {
      const response = await axios.get(`${BACKEND_URL}/api/billing/checkout/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        toast.success('Payment successful! Your plan has been upgraded.');
        window.history.replaceState({}, '', '/billing');
        fetchData();
        return;
      } else if (response.data.status === 'expired') {
        toast.error('Payment session expired. Please try again.');
        window.history.replaceState({}, '', '/billing');
        return;
      }

      // Continue polling
      setTimeout(() => pollCheckoutStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, usageRes, profileRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/billing/subscription`),
        axios.get(`${BACKEND_URL}/api/billing/plans`),
        axios.get(`${BACKEND_URL}/api/billing/usage`),
        axios.get(`${BACKEND_URL}/api/user/profile`).catch(() => ({ data: null }))
      ]);

      setSubscription(subRes.data);
      setPlans(plansRes.data.plans || []);
      setUsage(usageRes.data);
      setUserProfile(profileRes.data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpgrade = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/billing/checkout`, {
        plan_id: planId,
        billing_cycle: billingCycle,
        origin_url: window.location.origin
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleContactEnterprise = () => {
    toast.info('Enterprise inquiries: Contact us at enterprise@omnigovault.com');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-navy p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-vault-gold mx-auto mb-4" />
          <p className="text-vault-muted">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find(p => p.plan_id === subscription?.plan_id);

  return (
    <div className="min-h-screen bg-vault-navy p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-vault-gold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Billing & Subscription
          </h1>
          <p className="text-vault-muted mt-1">Manage your subscription and view usage</p>
        </div>

        {/* Current Plan Card */}
        <Card className="bg-vault-dark border-vault-gold/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tierColors[subscription?.plan_tier || 0]}`}>
                  {tierIcons[subscription?.plan_tier || 0]}
                </div>
                <div>
                  <CardTitle className="text-vault-light">
                    {subscription?.plan_name || 'Free'} Plan
                  </CardTitle>
                  <CardDescription className="text-vault-muted">
                    {subscription?.status === 'active' ? (
                      <Badge variant="outline" className="border-green-500/50 text-green-400 mt-1">
                        Active
                      </Badge>
                    ) : subscription?.status === 'past_due' ? (
                      <Badge variant="outline" className="border-red-500/50 text-red-400 mt-1">
                        Past Due
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-vault-muted/50 text-vault-muted mt-1">
                        {subscription?.status || 'Free Tier'}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              {subscription?.cancel_at_period_end && (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Cancels at period end
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vaults Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-vault-muted flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Vaults
                  </span>
                  <span className="text-vault-light">
                    {usage?.vaults?.current || 0} / {usage?.vaults?.unlimited ? '∞' : (usage?.vaults?.limit || 1)}
                  </span>
                </div>
                <Progress 
                  value={usage?.vaults?.unlimited ? 10 : ((usage?.vaults?.current || 0) / (usage?.vaults?.limit || 1)) * 100} 
                  className="h-2 bg-vault-navy"
                />
              </div>

              {/* Team Members Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-vault-muted flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Members
                  </span>
                  <span className="text-vault-light">
                    {usage?.teamMembers?.current || 0} / {usage?.teamMembers?.unlimited ? '∞' : (usage?.teamMembers?.limit || 1)}
                  </span>
                </div>
                <Progress 
                  value={usage?.teamMembers?.unlimited ? 10 : ((usage?.teamMembers?.current || 0) / (usage?.teamMembers?.limit || 1)) * 100} 
                  className="h-2 bg-vault-navy"
                />
              </div>

              {/* Storage Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-vault-muted flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Storage
                  </span>
                  <span className="text-vault-light">
                    {((usage?.storage?.usedMB || 0) / 1000).toFixed(2)} GB / {usage?.storage?.unlimited ? '∞' : `${((usage?.storage?.limitMB || 100) / 1000).toFixed(1)} GB`}
                  </span>
                </div>
                <Progress 
                  value={usage?.storage?.unlimited ? 10 : ((usage?.storage?.usedMB || 0) / (usage?.storage?.limitMB || 100)) * 100} 
                  className="h-2 bg-vault-navy"
                />
              </div>
            </div>

            {/* Feature Entitlements */}
            <Separator className="my-6 bg-vault-gold/10" />
            <div className="flex flex-wrap gap-3">
              <FeatureBadge 
                enabled={subscription?.entitlements?.['features.analytics.enabled']} 
                label="Analytics" 
                icon={<BarChart3 className="w-3 h-3" />}
              />
              <FeatureBadge 
                enabled={subscription?.entitlements?.['features.api.enabled']} 
                label="API Access" 
                icon={<Zap className="w-3 h-3" />}
              />
              <FeatureBadge 
                enabled={subscription?.entitlements?.['features.templates.enabled']} 
                label="Templates" 
                icon={<Sparkles className="w-3 h-3" />}
              />
              <FeatureBadge 
                enabled={subscription?.entitlements?.['features.prioritySupport.enabled']} 
                label="Priority Support" 
                icon={<Crown className="w-3 h-3" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Plans Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-vault-light">Available Plans</h2>
            
            {/* Billing Cycle Toggle */}
            <Tabs value={billingCycle} onValueChange={setBillingCycle} className="w-auto">
              <TabsList className="bg-vault-dark border border-vault-gold/20">
                <TabsTrigger value="monthly" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="yearly" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
                  Yearly <Badge className="ml-1 bg-green-500/20 text-green-400 text-xs">Save 17%</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.plan_id}
                plan={plan}
                isCurrentPlan={plan.plan_id === subscription?.plan_id}
                billingCycle={billingCycle}
                onUpgrade={() => handleUpgrade(plan.plan_id)}
                onContactEnterprise={handleContactEnterprise}
                loading={checkoutLoading === plan.plan_id}
              />
            ))}
          </div>
        </div>

        {/* FAQ / Help */}
        <Card className="bg-vault-dark border-vault-gold/20">
          <CardHeader>
            <CardTitle className="text-vault-light text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-vault-muted">
            <p>• All plans include a 14-day money-back guarantee</p>
            <p>• Enterprise plans include custom SLAs and dedicated support</p>
            <p>• Contact support@omnigovault.com for billing questions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Feature Badge Component
const FeatureBadge = ({ enabled, label, icon }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
    enabled 
      ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
      : 'bg-vault-navy/50 text-vault-muted border border-vault-gold/10'
  }`}>
    {enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    {icon}
    {label}
  </div>
);

// Plan Card Component
const PlanCard = ({ plan, isCurrentPlan, billingCycle, onUpgrade, onContactEnterprise, loading }) => {
  const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const isEnterprise = plan.tier === 3;
  const isFree = plan.tier === 0;

  return (
    <Card className={`bg-vault-dark border relative ${
      isCurrentPlan 
        ? 'border-vault-gold shadow-lg shadow-vault-gold/10' 
        : 'border-vault-gold/20 hover:border-vault-gold/40'
    } transition-all`}>
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-vault-gold text-vault-navy font-semibold">
            Current Plan
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${tierColors[plan.tier]}`}>
            {tierIcons[plan.tier]}
          </div>
          <CardTitle className="text-vault-light">{plan.name}</CardTitle>
        </div>
        <CardDescription className="text-vault-muted text-sm">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div className="text-center py-2">
          {isEnterprise ? (
            <div className="text-vault-light">
              <span className="text-2xl font-bold">Custom</span>
              <p className="text-sm text-vault-muted mt-1">Contact for pricing</p>
            </div>
          ) : isFree ? (
            <div>
              <span className="text-3xl font-bold text-vault-light">$0</span>
              <span className="text-vault-muted text-sm">/month</span>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-vault-light">${price}</span>
              <span className="text-vault-muted text-sm">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
            </div>
          )}
        </div>

        <Separator className="bg-vault-gold/10" />

        {/* Entitlements */}
        <ul className="space-y-2 text-sm">
          <EntitlementItem 
            label={`${plan.entitlements['vaults.max'] === -1 ? 'Unlimited' : plan.entitlements['vaults.max']} Vaults`}
            included={true}
          />
          <EntitlementItem 
            label={`${plan.entitlements['teamMembers.max'] === -1 ? 'Unlimited' : plan.entitlements['teamMembers.max']} Team Members`}
            included={true}
          />
          <EntitlementItem 
            label={plan.entitlements['storage.maxMB'] === -1 ? 'Unlimited Storage' : `${plan.entitlements['storage.maxMB'] / 1000} GB Storage`}
            included={true}
          />
          <EntitlementItem 
            label="Analytics"
            included={plan.entitlements['features.analytics.enabled']}
          />
          <EntitlementItem 
            label="API Access"
            included={plan.entitlements['features.api.enabled']}
          />
          <EntitlementItem 
            label="Premium Templates"
            included={plan.entitlements['features.templates.enabled']}
          />
          <EntitlementItem 
            label="Priority Support"
            included={plan.entitlements['features.prioritySupport.enabled']}
          />
        </ul>
      </CardContent>

      <CardFooter>
        {isCurrentPlan ? (
          <Button disabled className="w-full bg-vault-gold/20 text-vault-gold">
            Current Plan
          </Button>
        ) : isEnterprise ? (
          <Button 
            onClick={onContactEnterprise}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Contact Sales <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        ) : isFree ? (
          <Button disabled variant="outline" className="w-full border-vault-gold/30 text-vault-muted">
            Free Forever
          </Button>
        ) : (
          <Button 
            onClick={onUpgrade}
            disabled={loading}
            className="w-full bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Upgrade <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// Entitlement Item Component
const EntitlementItem = ({ label, included }) => (
  <li className={`flex items-center gap-2 ${included ? 'text-vault-light' : 'text-vault-muted'}`}>
    {included ? (
      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
    ) : (
      <X className="w-4 h-4 text-vault-muted/50 flex-shrink-0" />
    )}
    {label}
  </li>
);

export default BillingPage;
