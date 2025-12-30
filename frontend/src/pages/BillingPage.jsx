import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Check, 
  X, 
  FileText,
  Shield, 
  Gem,
  Castle,
  Loader2,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Users,
  FolderOpen,
  HardDrive,
  Sparkle,
  ExternalLink,
  Flame,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Animated tier icons with unique, impressive themes
const AnimatedTierIcon = ({ tier }) => {
  const iconConfig = {
    0: {
      // Testamentary - Simple document/scroll
      icon: <FileText className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-slate-500 to-slate-700',
      glowClass: 'shadow-slate-500/30',
      animationClass: ''
    },
    1: {
      // Revocable - Sparkle/Growth with animation
      icon: <Sparkle className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
      glowClass: 'shadow-emerald-500/40',
      animationClass: 'animate-pulse'
    },
    2: {
      // Irrevocable - Shield with protective glow
      icon: <Shield className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600',
      glowClass: 'shadow-blue-500/50',
      animationClass: ''
    },
    3: {
      // Dynasty - EPIC Castle/Gem with animated gradient
      icon: <Castle className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-purple-500 via-pink-500 to-amber-400',
      glowClass: 'shadow-purple-500/50',
      animationClass: ''
    }
  };

  const config = iconConfig[tier];

  return (
    <motion.div
      className={`p-3 rounded-xl ${config.bgClass} shadow-lg ${config.glowClass} ${config.animationClass}`}
      whileHover={{ 
        scale: 1.15, 
        rotate: tier === 3 ? [0, -5, 5, 0] : 0,
        boxShadow: tier === 3 ? '0 0 30px rgba(168, 85, 247, 0.6)' : undefined
      }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <div className="text-white drop-shadow-lg">
        {config.icon}
      </div>
      {/* Dynasty special glow ring */}
      {tier === 3 && (
        <motion.div 
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-400/20"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

// Background gradient for each tier card
const tierCardBg = {
  0: 'bg-gradient-to-b from-slate-900/80 to-slate-950/90',
  1: 'bg-gradient-to-b from-emerald-950/40 to-slate-950/90',
  2: 'bg-gradient-to-b from-blue-950/40 to-slate-950/90',
  3: 'bg-gradient-to-b from-purple-950/50 via-pink-950/30 to-slate-950/90'
};

// Plan tier colors
const tierColors = {
  0: 'text-slate-400 bg-slate-400/10',
  1: 'text-emerald-400 bg-emerald-400/10',
  2: 'text-blue-400 bg-blue-400/10',
  3: 'text-purple-400 bg-purple-400/10'
};

// Plan tier border colors for cards with hover glow
const tierBorderColors = {
  0: 'border-slate-600/50 hover:border-slate-500/70',
  1: 'border-emerald-500/50 hover:border-emerald-400/80 hover:shadow-emerald-500/20',
  2: 'border-blue-500/50 hover:border-blue-400/80 hover:shadow-blue-500/20',
  3: 'border-purple-500/50 hover:border-purple-400/80 hover:shadow-purple-500/30'
};

// Plan tier button colors with gradients
const tierButtonColors = {
  0: 'bg-slate-700/60 text-slate-300 border border-slate-600/50',
  1: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/30',
  2: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/30',
  3: 'bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 hover:from-purple-500 hover:via-pink-400 hover:to-amber-400 text-white shadow-lg shadow-purple-500/30'
};

// Card glow colors based on tier
const tierGlowColors = {
  0: '',
  1: 'group-hover:shadow-lg group-hover:shadow-emerald-500/20',
  2: 'group-hover:shadow-lg group-hover:shadow-blue-500/20',
  3: 'group-hover:shadow-xl group-hover:shadow-purple-500/30'
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
      // Fetch plans first (public endpoint - always works)
      const plansRes = await axios.get(`${BACKEND_URL}/api/billing/plans`);
      setPlans(plansRes.data.plans || []);
      
      // Try to fetch authenticated data (may fail if not logged in)
      const [subRes, usageRes, profileRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/billing/subscription`).catch(() => ({ data: null })),
        axios.get(`${BACKEND_URL}/api/billing/usage`).catch(() => ({ data: null })),
        axios.get(`${BACKEND_URL}/api/user/profile`).catch(() => ({ data: null }))
      ]);

      if (subRes.data) setSubscription(subRes.data);
      if (usageRes.data) setUsage(usageRes.data);
      if (profileRes.data) setUserProfile(profileRes.data);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-vault-gold flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Billing & Subscription
            </h1>
            <p className="text-vault-muted mt-1">Manage your subscription and view usage</p>
          </div>
          
          {/* OMNICOMPETENT Badge */}
          {userProfile?.is_omnicompetent && (
            <div className="flex items-center gap-2">
              {userProfile.global_roles?.map((role) => (
                (role === 'OMNICOMPETENT' || role === 'OMNICOMPETENT_OWNER') && (
                  <Badge 
                    key={role}
                    variant="outline" 
                    className={`${
                      role === 'OMNICOMPETENT_OWNER' 
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse' 
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    } text-sm px-3 py-1`}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {role === 'OMNICOMPETENT_OWNER' ? 'Owner - All Features Free' : 'All Features Free'}
                  </Badge>
                )
              ))}
            </div>
          )}
        </div>

        {/* Current Plan Card */}
        <Card className="bg-vault-dark border-vault-gold/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AnimatedTierIcon tier={subscription?.plan_tier || 0} />
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
          <div className="flex items-center justify-between flex-wrap gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {plans.map((plan) => (
              <PlanCard
                key={plan.plan_id}
                plan={plan}
                isCurrentPlan={plan.plan_id === subscription?.plan_id}
                billingCycle={billingCycle}
                onUpgrade={() => handleUpgrade(plan.plan_id)}
                onContactEnterprise={handleContactEnterprise}
                loading={checkoutLoading === plan.plan_id}
                isAuthenticated={!!subscription}
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

// Plan Card Component with Premium Visual Effects
const PlanCard = ({ plan, isCurrentPlan, billingCycle, onUpgrade, onContactEnterprise, loading, isAuthenticated }) => {
  const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const isEnterprise = plan.tier === 3;
  const isFree = plan.tier === 0;

  const handleUpgradeClick = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to upgrade your plan');
      return;
    }
    onUpgrade();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: plan.tier * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="group h-full"
    >
      <Card className={`relative flex flex-col h-full overflow-hidden transition-all duration-300
        ${isCurrentPlan 
          ? 'border-vault-gold shadow-lg shadow-vault-gold/20 ring-2 ring-vault-gold/30' 
          : tierBorderColors[plan.tier]
        }
        bg-gradient-to-b from-vault-dark to-vault-navy/80
        ${tierGlowColors[plan.tier]}
        group-hover:shadow-xl
      `}>
        {/* Animated background gradient for premium tiers */}
        {plan.tier >= 2 && (
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
            ${plan.tier === 2 ? 'bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/5' : ''}
            ${plan.tier === 3 ? 'bg-gradient-to-br from-purple-500/10 via-amber-500/5 to-purple-500/10' : ''}
          `} />
        )}

        {/* Top glow line */}
        <div className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-300
          ${plan.tier === 0 ? 'bg-gradient-to-r from-transparent via-gray-500/50 to-transparent group-hover:via-gray-400' : ''}
          ${plan.tier === 1 ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent group-hover:via-emerald-400' : ''}
          ${plan.tier === 2 ? 'bg-gradient-to-r from-transparent via-blue-500/50 to-transparent group-hover:via-blue-400' : ''}
          ${plan.tier === 3 ? 'bg-gradient-to-r from-purple-500/50 via-amber-500/50 to-purple-500/50 group-hover:from-purple-400 group-hover:via-amber-400 group-hover:to-purple-400' : ''}
        `} />

        {isCurrentPlan && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-vault-gold text-vault-navy font-semibold shadow-lg animate-pulse">
              Current Plan
            </Badge>
          </div>
        )}
        
        {/* Popular badge for tier 1 */}
        {plan.tier === 1 && !isCurrentPlan && (
          <motion.div 
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
          >
            <Badge className="bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/30">
              ✨ Popular
            </Badge>
          </motion.div>
        )}

        {/* Elite badge for Dynasty */}
        {plan.tier === 3 && !isCurrentPlan && (
          <motion.div 
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, delay: 0.4 }}
          >
            <Badge className="bg-gradient-to-r from-purple-500 to-amber-500 text-white font-semibold shadow-lg">
              👑 Elite
            </Badge>
          </motion.div>
        )}
        
        <CardHeader className="pb-4 pt-6 relative z-10">
          <div className="flex items-center gap-3">
            <AnimatedTierIcon tier={plan.tier} />
            <CardTitle className="text-vault-light text-lg">{plan.name}</CardTitle>
          </div>
          <CardDescription className="text-vault-muted text-sm min-h-[40px] mt-2">
            {plan.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-1 relative z-10">
          {/* Price with animation */}
          <motion.div 
            className="text-center py-3"
            whileHover={{ scale: 1.02 }}
          >
            {isEnterprise ? (
              <div className="text-vault-light">
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                  Custom
                </span>
                <p className="text-sm text-vault-muted mt-1">Contact for pricing</p>
              </div>
            ) : isFree ? (
              <div>
                <span className="text-4xl font-bold text-vault-light">$0</span>
                <span className="text-vault-muted text-sm">/month</span>
              </div>
            ) : (
              <div>
                <span className="text-4xl font-bold text-vault-light">${price}</span>
                <span className="text-vault-muted text-sm">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                {billingCycle === 'yearly' && (
                  <motion.p 
                    className="text-emerald-400 text-xs mt-1 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    🎉 Save 17% annually
                  </motion.p>
                )}
              </div>
            )}
          </motion.div>

          <Separator className={`
            ${plan.tier === 0 ? 'bg-gray-500/20' : ''}
            ${plan.tier === 1 ? 'bg-emerald-500/20' : ''}
            ${plan.tier === 2 ? 'bg-blue-500/20' : ''}
            ${plan.tier === 3 ? 'bg-gradient-to-r from-purple-500/20 via-amber-500/20 to-purple-500/20' : ''}
          `} />

          {/* Entitlements with hover effects */}
          <ul className="space-y-2.5 text-sm">
            <EntitlementItem 
              label={`${plan.entitlements['vaults.max'] === -1 ? 'Unlimited' : plan.entitlements['vaults.max']} Vaults`}
              included={true}
              tier={plan.tier}
            />
            <EntitlementItem 
              label={`${plan.entitlements['teamMembers.max'] === -1 ? 'Unlimited' : plan.entitlements['teamMembers.max']} Team Members`}
              included={true}
              tier={plan.tier}
            />
            <EntitlementItem 
              label={plan.entitlements['storage.maxMB'] === -1 ? 'Unlimited Storage' : `${plan.entitlements['storage.maxMB'] / 1000} GB Storage`}
              included={true}
              tier={plan.tier}
            />
            <EntitlementItem 
              label="Analytics"
              included={plan.entitlements['features.analytics.enabled']}
              tier={plan.tier}
            />
            <EntitlementItem 
              label="API Access"
              included={plan.entitlements['features.api.enabled']}
              tier={plan.tier}
            />
            <EntitlementItem 
              label="Premium Templates"
              included={plan.entitlements['features.templates.enabled']}
              tier={plan.tier}
            />
            <EntitlementItem 
              label="Priority Support"
              included={plan.entitlements['features.prioritySupport.enabled']}
              tier={plan.tier}
            />
          </ul>
        </CardContent>

        {/* Fixed height footer for button alignment */}
        <CardFooter className="mt-auto pt-4 relative z-10">
          {isCurrentPlan ? (
            <Button disabled className="w-full bg-vault-gold/20 text-vault-gold border border-vault-gold/30">
              ✓ Current Plan
            </Button>
          ) : isEnterprise ? (
            <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={onContactEnterprise}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 hover:from-purple-700 hover:via-pink-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-purple-500/20"
              >
                Contact Sales <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          ) : isFree ? (
            <Button disabled variant="outline" className="w-full border-gray-500/30 text-gray-400">
              Free Forever
            </Button>
          ) : (
            <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleUpgradeClick}
                disabled={loading}
                className={`w-full ${tierButtonColors[plan.tier]} font-semibold shadow-lg transition-all duration-300
                  ${plan.tier === 1 ? 'shadow-emerald-500/20 hover:shadow-emerald-500/40' : ''}
                  ${plan.tier === 2 ? 'shadow-blue-500/20 hover:shadow-blue-500/40' : ''}
                `}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Upgrade <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></>
                )}
              </Button>
            </motion.div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// Entitlement Item Component
const EntitlementItem = ({ label, included, tier = 0 }) => {
  const checkColors = {
    0: 'text-gray-400',
    1: 'text-emerald-400',
    2: 'text-blue-400',
    3: 'text-purple-400'
  };
  
  return (
    <motion.li 
      className={`flex items-center gap-2 ${included ? 'text-vault-light' : 'text-vault-muted/60'}`}
      whileHover={{ x: included ? 3 : 0 }}
      transition={{ duration: 0.2 }}
    >
      {included ? (
        <Check className={`w-4 h-4 ${checkColors[tier]} flex-shrink-0`} />
      ) : (
        <X className="w-4 h-4 text-vault-muted/30 flex-shrink-0" />
      )}
      <span className={!included ? 'line-through' : ''}>{label}</span>
    </motion.li>
  );
};

export default BillingPage;
