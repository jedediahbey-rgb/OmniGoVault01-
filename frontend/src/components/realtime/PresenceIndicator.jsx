/**
 * Presence Indicator Component
 * Shows who is currently viewing/editing a document or workspace
 */

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

// Generate consistent color from user ID
const getUserColor = (userId) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-yellow-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500'
  ];
  const hash = userId?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
  return colors[hash % colors.length];
};

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export function PresenceAvatar({ user, size = 'md', showTyping = true }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <div
              className={cn(
                'rounded-full flex items-center justify-center text-white font-medium border-2 border-vault-dark',
                getUserColor(user.user_id),
                sizeClasses[size]
              )}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(user.name)
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-vault-dark" />
            {/* Typing indicator */}
            {showTyping && user.is_typing && (
              <span className="absolute -bottom-1 -right-1 flex space-x-0.5">
                <span className="w-1 h-1 bg-vault-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-vault-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-vault-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-vault-dark border-vault-gold/20">
          <p className="text-white font-medium">{user.name || 'Unknown User'}</p>
          {user.is_typing && <p className="text-vault-gold text-xs">Typing...</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PresenceBar({ users, maxVisible = 5, size = 'md' }) {
  if (!users || users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <PresenceAvatar key={user.user_id} user={user} size={size} />
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              'rounded-full flex items-center justify-center bg-vault-navy text-vault-muted font-medium border-2 border-vault-dark',
              size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm'
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
      <span className="ml-3 text-sm text-vault-muted">
        {users.length} {users.length === 1 ? 'person' : 'people'} viewing
      </span>
    </div>
  );
}

export function PresenceDot({ isOnline = false, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span
      className={cn(
        'rounded-full',
        sizeClasses[size],
        isOnline ? 'bg-green-500' : 'bg-gray-500'
      )}
    />
  );
}

export default PresenceBar;
