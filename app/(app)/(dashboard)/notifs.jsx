import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import React, { useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../../../src/api/notifications';
import { joinRequestsAPI } from '../../../src/api/joinRequests';
import { friendsAPI } from '../../../src/api/friends';
import { useFriends } from '../../../context/FriendsContext';
import { useRide } from '../../../context/RideContext';
import { useUser } from '../../../context/UserContext';
import { useRouter } from 'expo-router';
import { parseServerDate } from '../../../src/utils/date';
import StyledSlidingPill from '../../../components/StyledSlidingPill';
import { useTheme } from '../../../context/ThemeContext';

// Embedded Chat List (from (chat)/index.jsx logic)
import { FlatList, Image, ActivityIndicator } from 'react-native';
import { chatAPI } from '../../../src/api/chat';
import { useFocusEffect } from '@react-navigation/native';

function ChatListTab() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chats, setChats] = useState([]);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatAPI.getChats();
      const rawChats = data?.chats || [];

      const detailed = await Promise.all(
        rawChats.map(async (chat) => {
          try {
            const details = await chatAPI.getChat(chat.chat_id);
            const participants = details?.participants || [];
            const other = participants.find(
              (p) => p.participant_id !== currentUser?.user_id
            );
            return {
              chatId: chat.chat_id,
              lastMessage: chat.last_message,
              lastMessageTime: chat.last_message_time,
              otherUser: other
                ? {
                    user_id: other.participant_id,
                    name: other.name,
                    username: other.username,
                    handle: other.username ? `@${other.username}` : '@user',
                    phone: other.phone || null,
                    avatar_url: other.avatar_url,
                  }
                : null,
            };
          } catch {
            return {
              chatId: chat.chat_id,
              lastMessage: chat.last_message,
              lastMessageTime: chat.last_message_time,
              otherUser: null,
            };
          }
        })
      );
      setChats(detailed);
    } catch (e) {
      setError(e?.message || 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.user_id]);

  useEffect(() => { loadChats(); }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      let intervalId;
      loadChats();
      intervalId = setInterval(loadChats, 8000);
      return () => { if (intervalId) clearInterval(intervalId); };
    }, [loadChats])
  );

  const openChat = (item) => {
    if (!item?.otherUser?.user_id) return;
    router.push({
      pathname: '/(chat)/chatScreen',
      params: {
        chatId: item.chatId,
        userId: item.otherUser.user_id,
        userName: item.otherUser.name,
        userHandle: item.otherUser.handle,
      },
    });
  };

  if (loading) {
    return (
      <View style={chatStyles.centered}>
        <ActivityIndicator size="small" color="#e63e4c" />
        <Text style={chatStyles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={chatStyles.centered}>
        <Text style={chatStyles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadChats} style={chatStyles.retryButton}>
          <Text style={chatStyles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => String(item.chatId)}
      contentContainerStyle={chatStyles.listContent}
      ListEmptyComponent={
        <View style={chatStyles.emptyContainer}>
          <Text style={chatStyles.emptyText}>No messages yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={chatStyles.chatRow} onPress={() => openChat(item)}>
          {item.otherUser?.avatar_url ? (
            <Image source={{ uri: item.otherUser.avatar_url }} style={chatStyles.avatar} />
          ) : (
            <View style={chatStyles.avatarPlaceholder}>
              <Text style={chatStyles.avatarInitials}>
                {(item.otherUser?.name || 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={chatStyles.chatInfo}>
            <View style={chatStyles.chatTopRow}>
              <Text style={chatStyles.chatName}>{item.otherUser?.name || 'User'}</Text>
              <Text style={chatStyles.chatTime}>
                {item.lastMessageTime
                  ? parseServerDate(item.lastMessageTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </Text>
            </View>
            <Text style={chatStyles.chatHandle}>@{item.otherUser?.username || 'user'}</Text>
            <Text numberOfLines={1} style={chatStyles.chatPreview}>
              {item.lastMessage || 'No messages yet'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

//  Notifications Tab 
const Notifications = () => {
  const [notificationData, setNotificationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const { fetchMyRides, fetchJoinedRides, updateRidePassengers } = useRide();
  const { isAuthenticated } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setNotificationData([]);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setNotificationData([]);
      return;
    }
    setLoading(true);
    try {
      const data = await notificationsAPI.getNotifications('all', 50);
      setNotificationData(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotificationData([]);
    } finally {
      setLoading(false);
    }
  };

  const { fetchFriends } = useFriends();

  const handleAccept = async (notification) => {
    if (processing[notification.notification_id]) return;
    setProcessing(prev => ({ ...prev, [notification.notification_id]: true }));
    try {
      let requestId = notification.related_request_id;

      if (notification.type === 'friend_request') {
        // Fallback for old notifications where related_request_id was stored as null
        if (!requestId) {
          const received = await friendsAPI.getReceivedRequests();
          const senderId = notification.related_user_id;
          const match = received.find(r => String(r.user_id) === String(senderId));
          requestId = match?.request_id;
        }
        if (requestId) {
          await friendsAPI.acceptFriendRequest(requestId);
          await fetchFriends();
          Alert.alert('Success', 'Friend request accepted!');
        } else {
          Alert.alert('Error', 'Could not find the friend request.');
        }
      } else if (notification.type === 'join_request' && requestId) {
        await joinRequestsAPI.acceptJoinRequest(requestId);
        if (notification.related_ride_id && updateRidePassengers) {
          await updateRidePassengers(notification.related_ride_id);
        }
        await fetchMyRides();
        await fetchJoinedRides && fetchJoinedRides();
        Alert.alert('Success', 'Join request accepted!');
      }
      await notificationsAPI.markAsRead(notification.notification_id);
      await notificationsAPI.deleteNotification(notification.notification_id);
      setNotificationData(prev => prev.filter(n => n.notification_id !== notification.notification_id));
    } catch (error) {
      console.error('Failed to accept request:', error);
      Alert.alert('Error', error.message || 'Failed to accept request');
    } finally {
      setProcessing(prev => ({ ...prev, [notification.notification_id]: false }));
    }
  };

  const handleDecline = async (notification) => {
    if (processing[notification.notification_id]) return;
    setProcessing(prev => ({ ...prev, [notification.notification_id]: true }));
    try {
      const requestId = notification.related_request_id;
      if (notification.type === 'friend_request' && requestId) {
        await friendsAPI.declineFriendRequest(requestId);
        await fetchFriends();
        Alert.alert('Success', 'Friend request declined');
      } else if (notification.type === 'join_request' && requestId) {
        await joinRequestsAPI.rejectJoinRequest(requestId);
        Alert.alert('Success', 'Join request declined');
      }
      await notificationsAPI.markAsRead(notification.notification_id);
      await notificationsAPI.deleteNotification(notification.notification_id);
      setNotificationData(prev => prev.filter(n => n.notification_id !== notification.notification_id));
    } catch (error) {
      console.error('Failed to decline request:', error);
      Alert.alert('Error', error.message || 'Failed to decline request');
    } finally {
      setProcessing(prev => ({ ...prev, [notification.notification_id]: false }));
    }
  };

  const handleRemove = async (notificationId, notification) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      setNotificationData(prev => prev.filter(n => n.notification_id !== notificationId));
      if (notification?.type === 'join_request_accepted') {
        await fetchJoinedRides();
      }
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  if (notificationData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Notifications</Text>
        <Text style={styles.emptySubText}>You're all caught up!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {notificationData.map((notification) => {
        const notifId = notification.notification_id || notification.id;
        const isProcessing = processing[notifId];
        const isJoinRequest = notification.type === 'join_request';
        const isFriendRequest = notification.type === 'friend_request';
        const isRideCompleted = notification.type === 'ride_completed' && notification.action && notification.action.type === 'open_buddy_feedback';
        const requesterName = notification.user_name;
        const requesterHandle = notification.user_username ? `@${notification.user_username}` : null;
        const displayMessage = isJoinRequest && requesterName
          ? `${requesterName} wants to join your ride`
          : notification.message;
        const timestamp = notification.created_at
          ? parseServerDate(notification.created_at)?.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, hourCycle: 'h12', month: 'short', day: 'numeric' })
          : notification.timestamp;

        const handleRideCompleted = () => {
          if (notification.ride_info && notification.ride_info.rideId) {
            router.push({
              pathname: '/(app)/(completeRide)/partnerFeedback',
              params: { rideId: notification.ride_info.rideId }
            });
          }
        };

        return (
          <CardButton
            key={notifId}
            onPress={() => {
              // 1. ride_completed with feedback action
              if (isRideCompleted) {
                handleRideCompleted();
                return;
              }

              // 2. join_request_accepted → go to the ride
              if (notification.type === 'join_request_accepted') {
                const rideId = notification.related_ride_id;
                if (rideId) router.push(`/(dashboard)/(rides)/${rideId}`);
                return;
              }

              // 3. join_request or friend_request → go to the requester's profile
              if (isJoinRequest || isFriendRequest) {
                const handle =
                  notification.related_user_handle ||
                  notification.user_username ||
                  notification.user_handle;
                if (handle) {
                  router.push(`/(dashboard)/user/${handle.replace(/^@/, '')}`);
                } else if (notification.related_user_id) {
                  router.push(`/(dashboard)/user/${notification.related_user_id}`);
                }
                return;
              }

              // 4. Any other notification with a ride id → go to ride
              const rideId = notification.related_ride_id;
              if (rideId) router.push(`/(dashboard)/(rides)/${rideId}`);
            }}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.notificationMessage}>{displayMessage}</Text>
                  {isJoinRequest && requesterHandle && (
                    <Text style={styles.requesterHandle}>{requesterHandle}</Text>
                  )}
                  <Text style={styles.timestamp}>{timestamp}</Text>
                </View>
                <TouchableOpacity
                  style={styles.crossButton}
                  onPress={() => handleRemove(notifId, notification)}
                >
                  <Text style={styles.crossButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              {(notification.ride_start_time || notification.ride) && (
                <View style={styles.rideInfo}>
                  {notification.ride?.destination && (
                    <Text style={styles.rideDestination}>📍 {notification.ride.destination}</Text>
                  )}
                  <Text style={styles.rideDetails}>
                    {notification.ride_transport || notification.ride?.transport || 'Ride'} •{' '}
                    {notification.ride_start_time
                      ? parseServerDate(notification.ride_start_time)?.toLocaleDateString()
                      : notification.ride?.date || ''}
                  </Text>
                </View>
              )}

              {(isJoinRequest || isFriendRequest) && !notification.is_read ? (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton, isProcessing && styles.disabledButton]}
                    onPress={() => handleAccept(notification)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.acceptButtonText}>{isProcessing ? 'Processing...' : 'Accept'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton, isProcessing && styles.disabledButton]}
                    onPress={() => handleDecline(notification)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.declineButtonText}>{isProcessing ? 'Processing...' : 'Decline'}</Text>
                  </TouchableOpacity>
                </View>
              ) : notification.is_read || notification.status !== 'pending' ? (
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusText, { color: '#888' }]}>
                    {notification.status === 'accepted' ? 'Accepted' : notification.status === 'declined' ? 'Declined' : 'Read'}
                  </Text>
                </View>
              ) : null}
            </View>
          </CardButton>
        );
      })}
    </ScrollView>
  );
};

// Combined Screen 
const TAB_OPTIONS = ['Notifications', 'Chats'];

export default function NotificationScreen() {
  const [activeTab, setActiveTab] = useState('Notifications');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const bg = isDark ? '#181c22' : '#f7f7f7';

  return (
    <View style={[styles.screenWrapper, { backgroundColor: bg }]}>
      {/* Header — same horizontal padding as StyledScrollView */}
      <View style={styles.header}>
        <Title>Notifications</Title>
        <StyledSlidingPill
          options={TAB_OPTIONS}
          activeOption={activeTab}
          onOptionSelect={setActiveTab}
        />
      </View>

      {/* Tab content fills the rest */}
      {activeTab === 'Notifications' ? <Notifications /> : <ChatListTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  container: {
    flex: 1,
    padding: 25,
    paddingTop: 10,
    backgroundColor: '#f7f7f7',
  },
  notificationContent: { width: '100%' },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 10 },
  notificationMessage: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  timestamp: { fontSize: 12, color: '#666' },
  requesterHandle: { fontSize: 12, color: '#888', marginTop: 2 },
  rideInfo: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rideDestination: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  rideDetails: { fontSize: 12, color: '#666' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: { backgroundColor: '#000' },
  declineButton: { backgroundColor: '#F44336' },
  acceptButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  declineButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  disabledButton: { opacity: 0.5 },
  statusContainer: { alignItems: 'center', marginTop: 10 },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  crossButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossButtonText: { color: '#666', fontSize: 16, fontWeight: 'bold', lineHeight: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 22, fontWeight: 'bold' },
  loadingText: { fontSize: 14, fontWeight: 'normal', color: '#666' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 6 },
});

const chatStyles = StyleSheet.create({
  listContent: { paddingVertical: 8 },
  emptyContainer: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatName: { fontWeight: 'bold', marginBottom: 4 },
  chatTime: { fontSize: 12, color: '#888', marginLeft: 8 },
  chatHandle: { color: '#888', marginBottom: 4 },
  chatPreview: { color: '#666' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontWeight: 'bold', color: '#555' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: '#666' },
  errorText: { color: '#e63e4c', marginBottom: 12 },
  retryButton: { backgroundColor: '#e63e4c', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: 'bold' },
});
