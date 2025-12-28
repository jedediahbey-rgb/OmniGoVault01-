import React from 'react';
import { cn } from '../lib/utils';

/**
 * SkeletonCard - Placeholder card for loading states
 * Matches the visual structure of portfolio/vault cards
 */

export const SkeletonPulse = ({ className }) => (
  <div 
    className={cn(
      'animate-pulse bg-vault-gold/5 rounded',
      className
    )} 
  />
);

export const SkeletonCard = ({ variant = 'default' }) => {
  if (variant === 'stat') {
    return (
      <div className="bg-vault-dark border border-vault-gold/10 rounded-xl p-6">
        <SkeletonPulse className="h-4 w-20 mb-3" />
        <SkeletonPulse className="h-8 w-16 mb-2" />
        <SkeletonPulse className="h-3 w-24" />
      </div>
    );
  }

  if (variant === 'portfolio') {
    return (
      <div className="bg-vault-dark border border-vault-gold/10 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-10 h-10 rounded-lg" />
            <div>
              <SkeletonPulse className="h-5 w-32 mb-2" />
              <SkeletonPulse className="h-3 w-48" />
            </div>
          </div>
          <SkeletonPulse className="w-8 h-8 rounded-lg" />
        </div>
        <div className="flex gap-4 mt-4">
          <SkeletonPulse className="h-6 w-20 rounded-full" />
          <SkeletonPulse className="h-6 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  if (variant === 'activity') {
    return (
      <div className="flex items-center gap-4 py-3">
        <SkeletonPulse className="w-8 h-8 rounded-full" />
        <div className="flex-1">
          <SkeletonPulse className="h-4 w-3/4 mb-2" />
          <SkeletonPulse className="h-3 w-1/2" />
        </div>
        <SkeletonPulse className="h-3 w-16" />
      </div>
    );
  }

  // Default card
  return (
    <div className="bg-vault-dark border border-vault-gold/10 rounded-xl p-6">
      <SkeletonPulse className="h-5 w-32 mb-3" />
      <SkeletonPulse className="h-4 w-full mb-2" />
      <SkeletonPulse className="h-4 w-2/3" />
    </div>
  );
};

/**
 * DashboardSkeleton - Full skeleton layout for dashboard
 */
export const DashboardSkeleton = () => (
  <div className="p-8 animate-in fade-in duration-300">
    {/* Header skeleton */}
    <div className="mb-8">
      <SkeletonPulse className="h-8 w-64 mb-2" />
      <SkeletonPulse className="h-4 w-48" />
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} variant="stat" />
      ))}
    </div>

    {/* Main content grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Portfolios section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <SkeletonPulse className="h-6 w-32" />
          <SkeletonPulse className="h-9 w-28 rounded-lg" />
        </div>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} variant="portfolio" />
        ))}
      </div>

      {/* Sidebar section */}
      <div className="space-y-4">
        <SkeletonPulse className="h-6 w-28 mb-4" />
        <div className="bg-vault-dark border border-vault-gold/10 rounded-xl p-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} variant="activity" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonCard;
