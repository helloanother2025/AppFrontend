import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from './ThemeContext';
import { useUser } from './UserContext';
import { type TransportMode } from '../utils/rideMapper';
import { notificationsAPI } from '../api/notifications';

const NOTIFICATION_PREFS_KEY = 'notificationPreferences';

export interface UserSnippet {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  rating: number;
}

export interface NotificationItem {
  id: string;
  type: 'join_request' | 'join_request_sent' | 'friend_request' | 'ride_update' | 'message' | 'ride_cancelled' | 'passenger_removed' | 'payment_request' | 'ride_edited';
  title: string;
  body: string;
  time: string;
  read: boolean;
  fromUser?: UserSnippet;
  rideId?: string;
  requestId?: string;
  actionTarget?: 'ride_details' | 'ride_join_requests' | 'user_profile' | 'none';
}

export interface NotificationPreferences {
  muteRideUpdates: boolean;
  muteChatNotifications: boolean;
  mutePaymentReminders: boolean;
}

export interface Review {
  id: string;
  rideId: string;
  reviewer: UserSnippet;
  reviewee: UserSnippet;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  read: boolean;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  read: boolean;
  reported?: boolean;
  flaggedAsSpam?: boolean;
}

export interface GroupChat {
  id: string;
  rideId: string;
  rideName: string;
  participants: UserSnippet[];
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: GroupMessage[];
}

export interface Chat {
  id: string;
  participant: UserSnippet;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: Message[];
}



type AppContextValue = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  isDemoMode: boolean;
  setIsDemoMode: (value: boolean) => void;
  currentUserAvatar: string | null;
  setCurrentUserAvatar: (value: string | null) => void;
  notifications: NotificationItem[];
  notificationPreferences: NotificationPreferences;
  unreadCount: number;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  refreshNotifications: () => Promise<void>;
  updateNotificationPreferences: (next: Partial<NotificationPreferences>) => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'time' | 'read'>) => void;
  groupChats: GroupChat[];
  setGroupChats: React.Dispatch<React.SetStateAction<GroupChat[]>>;
  sendGroupMessage: (chatId: string, text: string, senderId: string) => void;
  markChatRead: (chatId: string) => void;
  blockedUsers: string[];
  blockUser: (userId: string) => void;
  reportMessage: (messageId: string, reason?: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const { isAuthenticated } = useUser();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    muteRideUpdates: false,
    muteChatNotifications: false,
    mutePaymentReminders: false,
  });
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const shouldMuteNotificationType = useCallback((type: NotificationItem['type']) => {
    if (notificationPreferences.mutePaymentReminders && type === 'payment_request') return true;
    if (notificationPreferences.muteChatNotifications && type === 'message') return true;
    if (
      notificationPreferences.muteRideUpdates &&
      (type === 'ride_update' || type === 'ride_cancelled' || type === 'ride_edited' || type === 'passenger_removed')
    ) {
      return true;
    }
    return false;
  }, [notificationPreferences]);

  useEffect(() => {
    let active = true;

    const loadNotificationPreferences = async () => {
      try {
        const saved = await SecureStore.getItemAsync(NOTIFICATION_PREFS_KEY);
        if (!saved || !active) return;
        const parsed = JSON.parse(saved) as Partial<NotificationPreferences>;
        setNotificationPreferences((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch {
        // Ignore malformed saved preferences and keep defaults.
      }
    };

    loadNotificationPreferences();

    return () => {
      active = false;
    };
  }, []);

  const updateNotificationPreferences = useCallback((next: Partial<NotificationPreferences>) => {
    setNotificationPreferences((prev) => {
      const merged = { ...prev, ...next };
      SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify(merged)).catch(() => undefined);
      return merged;
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setIsDemoMode(false);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated]);

  const formatRelativeTime = useCallback((iso: string | null | undefined) => {
    if (!iso) return 'Just now';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return 'Just now';
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }, []);

  const normalizeNotification = useCallback((raw: any): NotificationItem => {
    const type = String(raw.type || 'ride_update') as NotificationItem['type'];
    const rideId = raw.related_ride_id != null ? String(raw.related_ride_id) : undefined;
    const requestId = raw.related_request_id != null ? String(raw.related_request_id) : undefined;
    const userId = raw.related_user_id != null ? String(raw.related_user_id) : undefined;

    let actionTarget: NotificationItem['actionTarget'] = 'none';
    if ((type === 'join_request' || (type === 'ride_update' && requestId)) && rideId) {
      actionTarget = 'ride_join_requests';
    } else if (rideId) {
      actionTarget = 'ride_details';
    } else if (userId) {
      actionTarget = 'user_profile';
    }

    return {
      id: String(raw.notification_id ?? raw.id ?? `n_${Date.now()}`),
      type,
      title: type === 'join_request'
        ? 'New join request for your ride'
        : type === 'join_request_sent'
          ? 'Request sent'
          : 'Ride update',
      body: raw.message || '',
      time: formatRelativeTime(raw.created_at),
      read: Boolean(raw.is_read),
      rideId,
      requestId,
      actionTarget,
      fromUser: raw.related_user_id ? {
        id: String(raw.related_user_id),
        name: raw.user_name || 'Someone',
        username: raw.user_username || 'user',
        avatar: raw.user_avatar || undefined,
        rating: Number(raw.user_rating || 0),
      } : undefined,
    };
  }, [formatRelativeTime]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationsAPI.getNotifications('all', 50, 0);
      const rows = Array.isArray(data?.notifications) ? data.notifications : [];
      setNotifications(rows.map(normalizeNotification).filter((item: NotificationItem) => !shouldMuteNotificationType(item.type)));
    } catch {
      // Keep UI usable with existing local notifications if API fetch fails.
    }
  }, [isAuthenticated, normalizeNotification, shouldMuteNotificationType]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshNotifications();
    const interval = setInterval(() => {
      refreshNotifications();
    }, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshNotifications]);



  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);


  const markAllRead = useCallback(() => {
    notificationsAPI.markAllRead().catch(() => undefined);
    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
  }, []);

  const markRead = useCallback((notificationId: string) => {
    notificationsAPI.markAsRead(notificationId).catch(() => undefined);
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'time' | 'read'>) => {
    if (shouldMuteNotificationType(notification.type)) {
      return;
    }

    const newNotification: NotificationItem = {
      ...notification,
      id: `n_${Date.now()}`,
      time: 'Just now',
      read: false,
    };

    setNotifications((previous) => [newNotification, ...previous]);
  }, [shouldMuteNotificationType]);

  const sendGroupMessage = useCallback((chatId: string, text: string, senderId: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    setGroupChats((previous) =>
      previous.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        return {
          ...chat,
          lastMessage: trimmed,
          lastTime: time,
          messages: [
            ...chat.messages,
            {
              id: `gm_${Date.now()}`,
              senderId,
              text: trimmed,
              time,
              read: false,
            },
          ],
        };
      })
    );
  }, []);

  const markChatRead = useCallback((chatId: string) => {
    setGroupChats((previous) =>
      previous.map((chat) => {
        if (chat.id !== chatId || chat.unreadCount === 0) {
          return chat;
        }
        return { ...chat, unreadCount: 0 };
      })
    );
  }, []);

  const blockUser = useCallback((userId: string) => {
    setBlockedUsers((previous) =>
      previous.includes(userId) ? previous.filter((id) => id !== userId) : [...previous, userId]
    );
  }, []);

  const reportMessage = useCallback((messageId: string, _reason?: string) => {
    setGroupChats((previous) =>
      previous.map((chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.id === messageId ? { ...message, reported: true } : message
        ),
      }))
    );
  }, []);

  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode,
      isDemoMode,
      setIsDemoMode,
      currentUserAvatar,
      setCurrentUserAvatar,
      notifications,
      notificationPreferences,
      unreadCount,
      markRead,
      markAllRead,
      refreshNotifications,
      updateNotificationPreferences,
      addNotification,
      groupChats,
      setGroupChats,
      sendGroupMessage,
      markChatRead,
      blockedUsers,
      blockUser,
      reportMessage,
    }),
    [
      addNotification,
      blockUser,
      blockedUsers,
      currentUserAvatar,
      darkMode,
      groupChats,
      isDemoMode,
      notificationPreferences,
      markAllRead,
      markRead,
      refreshNotifications,
      updateNotificationPreferences,
      markChatRead,
      notifications,
      reportMessage,
      unreadCount,
      sendGroupMessage,
      toggleDarkMode,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}
