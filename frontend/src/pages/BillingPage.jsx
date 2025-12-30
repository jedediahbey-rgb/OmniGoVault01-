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
  Sparkles,
  ExternalLink,
  Flame,
  Star,
  Zap,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Animated tier icons with unique, impressive themes and dynamic effects
const AnimatedTierIcon = ({ tier }) => {
  const iconConfig = {
    0: {
      // Testamentary - Thunder/Zap with pulse animation
      icon: <Zap className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700',
      glowClass: 'shadow-slate-400/50',
    },
    1: {
      // Revocable - Sparkle/Growth with animation
      icon: <Sparkle className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
      glowClass: 'shadow-emerald-500/50',
    },
    2: {
      // Irrevocable - Diamond/Gem (precious, unchangeable)
      icon: <Gem className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600',
      glowClass: 'shadow-blue-500/60',
    },
    3: {
      // Dynasty - Crown with flames (ultimate power)
      icon: <Crown className="w-6 h-6" />,
      bgClass: 'bg-gradient-to-br from-amber-400 via-purple-500 to-pink-600',
      glowClass: 'shadow-purple-500/70',
    }
  };

  const config = iconConfig[tier];

  // Animation variants for each tier
  const pulseAnimation = {
    scale: [1, 1.05, 1],
    opacity: [0.9, 1, 0.9],
  };

  const glowAnimation = {
    0: { // Testamentary - electric pulse
      boxShadow: [
        '0 0 15px rgba(148, 163, 184, 0.3)',
        '0 0 25px rgba(148, 163, 184, 0.6)',
        '0 0 15px rgba(148, 163, 184, 0.3)'
      ]
    },
    1: { // Revocable - emerald glow
      boxShadow: [
        '0 0 15px rgba(52, 211, 153, 0.3)',
        '0 0 30px rgba(52, 211, 153, 0.6)',
        '0 0 15px rgba(52, 211, 153, 0.3)'
      ]
    },
    2: { // Irrevocable - blue shimmer
      boxShadow: [
        '0 0 15px rgba(59, 130, 246, 0.3)',
        '0 0 30px rgba(59, 130, 246, 0.7)',
        '0 0 15px rgba(59, 130, 246, 0.3)'
      ]
    },
    3: { // Dynasty - purple-gold epic glow
      boxShadow: [
        '0 0 20px rgba(168, 85, 247, 0.4)',
        '0 0 40px rgba(251, 191, 36, 0.6)',
        '0 0 20px rgba(168, 85, 247, 0.4)'
      ]
    }
  };

  return (
    <motion.div
      className={`relative p-3 rounded-xl ${config.bgClass} shadow-lg ${config.glowClass}`}
      animate={{
        ...pulseAnimation,
        ...glowAnimation[tier]
      }}
      transition={{
        duration: tier === 3 ? 2 : 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      whileHover={{ 
        scale: 1.15, 
        rotate: tier === 3 ? [0, -5, 5, 0] : 0,
      }}
    >
      {/* Inner glow effect */}
      <motion.div 
        className="absolute inset-0 rounded-xl"
        animate={{
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: tier === 0 ? 'radial-gradient(circle, rgba(148,163,184,0.3) 0%, transparent 70%)' :
                      tier === 1 ? 'radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)' :
                      tier === 2 ? 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' :
                      'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)'
        }}
      />
      <div className="relative text-white drop-shadow-lg">
        {config.icon}
      </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch pt-2">
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
      <Card className={`relative flex flex-col h-full overflow-hidden transition-all duration-300 border-2
        ${isCurrentPlan 
          ? 'border-vault-gold shadow-lg shadow-vault-gold/30 ring-2 ring-vault-gold/30' 
          : tierBorderColors[plan.tier]
        }
        ${tierCardBg[plan.tier]}
        ${tierGlowColors[plan.tier]}
        group-hover:shadow-2xl
      `}>
        {/* Animated background glow for all tiers */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
          ${plan.tier === 0 ? 'bg-gradient-to-br from-slate-500/5 via-transparent to-slate-500/5' : ''}
          ${plan.tier === 1 ? 'bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/10' : ''}
          ${plan.tier === 2 ? 'bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-blue-500/10' : ''}
          ${plan.tier === 3 ? 'bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-amber-500/15' : ''}
        `} />

        {/* Top glow line - colored per tier */}
        <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300
          ${plan.tier === 0 ? 'bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600' : ''}
          ${plan.tier === 1 ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600' : ''}
          ${plan.tier === 2 ? 'bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600' : ''}
          ${plan.tier === 3 ? 'bg-gradient-to-r from-purple-500 via-pink-400 to-amber-400' : ''}
        `} />

        {isCurrentPlan && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-vault-gold text-vault-navy font-semibold shadow-lg">
              ✓ Current Plan
            </Badge>
          </div>
        )}
        
        {/* Popular badge for tier 1 */}
        {plan.tier === 1 && !isCurrentPlan && (
          <motion.div 
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
          >
            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/50">
              ✨ Most Popular
            </Badge>
          </motion.div>
        )}

        {/* Elite badge for Dynasty */}
        {plan.tier === 3 && !isCurrentPlan && (
          <motion.div 
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, delay: 0.4 }}
          >
            <Badge className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white font-semibold shadow-lg shadow-purple-500/50">
              👑 Elite
            </Badge>
          </motion.div>
        )}
        
        <CardHeader className={`relative z-10 text-center ${isCurrentPlan || plan.tier === 1 || plan.tier === 3 ? 'pt-10' : 'pt-5'} pb-2`}>
          {/* Centered Icon */}
          <div className="flex justify-center mb-3">
            <AnimatedTierIcon tier={plan.tier} />
          </div>
          
          {/* Centered Title */}
          <CardTitle className={`text-xl font-bold mb-1
            ${plan.tier === 0 ? 'text-slate-200' : ''}
            ${plan.tier === 1 ? 'text-emerald-100' : ''}
            ${plan.tier === 2 ? 'text-blue-100' : ''}
            ${plan.tier === 3 ? 'text-purple-100' : ''}
          `}>{plan.name}</CardTitle>
          
          {/* Centered Description */}
          <CardDescription className="text-vault-muted text-xs min-h-[32px]">
            {plan.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-1 relative z-10 px-5">
          {/* Price - Centered */}
          <div className="text-center py-3">
            {isEnterprise ? (
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                  Custom
                </span>
                <p className="text-sm text-purple-300/70 mt-1">Contact for pricing</p>
              </div>
            ) : isFree ? (
              <div>
                <span className="text-4xl font-bold text-slate-200">$0</span>
                <span className="text-slate-400 text-sm ml-1">/month</span>
              </div>
            ) : (
              <div>
                <span className={`text-4xl font-bold
                  ${plan.tier === 1 ? 'text-emerald-300' : ''}
                  ${plan.tier === 2 ? 'text-blue-300' : ''}
                `}>${price}</span>
                <span className="text-vault-muted text-sm ml-1">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                {billingCycle === 'yearly' && (
                  <p className="text-emerald-400 text-xs mt-1 font-medium">
                    🎉 Save 17% annually
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator className={`
            ${plan.tier === 0 ? 'bg-slate-600/40' : ''}
            ${plan.tier === 1 ? 'bg-emerald-500/30' : ''}
            ${plan.tier === 2 ? 'bg-blue-500/30' : ''}
            ${plan.tier === 3 ? 'bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-amber-500/30' : ''}
          `} />

          {/* Entitlements - Left aligned with consistent spacing */}
          <ul className="space-y-2.5 text-sm pl-1">
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
              label="Templates"
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

        {/* Footer with aligned buttons */}
        <CardFooter className="mt-auto pt-3 pb-5 relative z-10">
          <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {isCurrentPlan ? (
              <Button disabled className="w-full h-11 bg-vault-gold/20 text-vault-gold border border-vault-gold/40 font-semibold">
                ✓ Current Plan
              </Button>
            ) : isEnterprise ? (
              <Button 
                onClick={onContactEnterprise}
                className="w-full h-11 bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 hover:from-purple-500 hover:via-pink-400 hover:to-amber-400 text-white font-bold shadow-lg shadow-purple-500/40 transition-all"
              >
                Contact Sales <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            ) : isFree ? (
              <Button className="w-full h-11 bg-slate-700/80 hover:bg-slate-600/80 text-slate-200 border border-slate-500/50 font-semibold">
                Free Forever
              </Button>
            ) : (
              <Button 
                onClick={handleUpgradeClick}
                disabled={loading}
                className={`w-full h-11 ${tierButtonColors[plan.tier]} font-bold transition-all`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Upgrade <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            )}
          </motion.div>
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
