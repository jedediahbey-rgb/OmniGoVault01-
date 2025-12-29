import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bell,
  BellRinging,
  FileText,
  Signature,
  ChatCircle,
  UserPlus,
  CheckCircle,
  X,
  DotsThree,
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const API = process.env.REACT_APP_BACKEND_URL;

// Notification type configurations
const NOTIFICATION_CONFIG = {
  DOCUMENT_SHARED: {
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    title: 'Document Shared',
    message: (n) => `A document has been shared with you in ${n.vault_name || 'a vault'}`,
  },
  SIGNATURE_REQUESTED: {
    icon: Signature,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    title: 'Signature Requested',
    message: (n) => `Your signature is requested on "${n.document_title}"`,
  },
  DOCUMENT_SIGNED: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    title: 'Document Signed',
    message: (n) => `${n.actor_name || 'Someone'} signed "${n.document_title}"`,
  },
  COMMENT_ADDED: {
    icon: ChatCircle,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    title: 'New Comment',
    message: (n) => `${n.actor_name || 'Someone'} commented on "${n.document_title}"`,
  },
  INVITATION_RECEIVED: {
    icon: UserPlus,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    title: 'Workspace Invitation',
    message: (n) => `You've been invited to join "${n.vault_name}"`,
  },
};

/**
 * Notification Bell Component
 * 
 * Displays in the header with unread count badge.
 * Clicking opens a dropdown with recent notifications.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/api/notifications`, {
        withCredentials: true,
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      // Silently fail - notifications are non-critical
      console.debug('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(
        `${API}/api/notifications/${notificationId}/read`,
        {},
        { withCredentials: true }
      );
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(
        `${API}/api/notifications/read-all`,
        {},
        { withCredentials: true }
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.notification_id);
    }

    // Navigate based on notification type
    if (notification.vault_id) {
      if (notification.document_id) {
        navigate(`/vault/workspace/${notification.vault_id}?doc=${notification.document_id}`);
      } else {
        navigate(`/vault/workspace/${notification.vault_id}`);
      }
    }

    setOpen(false);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString();
  };

  const BellIcon = unreadCount > 0 ? BellRinging : Bell;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5" weight={unreadCount > 0 ? 'fill' : 'regular'} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-vault-navy border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="font-medium text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-vault-gold hover:text-vault-gold/80 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-10 h-10 text-white/10 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => {
                    const config = NOTIFICATION_CONFIG[notification.type] || {
                      icon: Bell,
                      color: 'text-white/40',
                      bg: 'bg-white/5',
                      title: 'Notification',
                      message: () => notification.message,
                    };
                    const Icon = config.icon;

                    return (
                      <button
                        key={notification.notification_id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full flex gap-3 p-4 text-left hover:bg-white/5 transition-colors ${
                          !notification.read ? 'bg-vault-gold/5' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.color}`} weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-white">
                              {config.title}
                            </p>
                            <span className="text-xs text-white/30">
                              {formatTimestamp(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                            {config.message(notification)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-vault-gold flex-shrink-0 mt-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm text-vault-gold hover:text-vault-gold/80 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
