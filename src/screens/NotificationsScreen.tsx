import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/ScreenShell';
import { AppHeader } from '../components/AppHeader';
import { UserAvatar } from '../components/UserAvatar';
import { useAppContext } from '../context/AppContext';
import { friendsAPI } from '../api/friends';
import { colors } from '../theme';


const typeConfig = {
  join_request: { icon: 'car-outline', color: '#3B82F6', bg: '#EFF6FF' },
  join_request_sent: { icon: 'paper-plane-outline', color: '#2563EB', bg: '#EFF6FF' },
  friend_request: { icon: 'person-add-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  friend_request_accepted: { icon: 'person-done-outline', color: '#22C55E', bg: '#ECFDF5' },
  ride_update: { icon: 'car-outline', color: '#16A34A', bg: '#F0FDF4' },
  message: { icon: 'chatbubble-outline', color: '#E83950', bg: '#FFF0F2' },
  ride_cancelled: { icon: 'close-circle-outline', color: '#DC2626', bg: '#FEF2F2' },
  passenger_removed: { icon: 'person-remove-outline', color: '#DC2626', bg: '#FEF2F2' },
  payment_request: { icon: 'card-outline', color: '#D97706', bg: '#FFFBEB' },
  ride_edited: { icon: 'create-outline', color: '#0EA5E9', bg: '#ECFEFF' },
} as const;

export function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    refreshNotifications,
    darkMode,
    deleteNotification,
  } = useAppContext();
  const [processingFriendRequestNotificationId, setProcessingFriendRequestNotificationId] = useState<string | null>(null);
  const [friendRequestAction, setFriendRequestAction] = useState<'accept' | 'decline' | null>(null);
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null);
  const [acceptedNotificationId, setAcceptedNotificationId] = useState<string | null>(null);
  const [declinedNotificationId, setDeclinedNotificationId] = useState<string | null>(null);
  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';
  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';

  const handleFriendRequestDecision = async (notification: any, decision: 'accept' | 'reject') => {
    setFriendRequestError(null);
    const resolveRequestId = async (): Promise<string | null> => {
      if (notification?.requestId) {
        return String(notification.requestId);
      }

      if (!notification?.fromUser?.id) {
        return null;
      }

      const receivedRequests = await friendsAPI.getReceivedRequests();
      const pendingMatch = (Array.isArray(receivedRequests) ? receivedRequests : []).find((request: any) =>
        String(request.sender_id ?? request.user_id ?? request.id) === String(notification.fromUser.id) &&
        String(request.current_status ?? 'pending').toLowerCase() === 'pending'
      );

      if (!pendingMatch) {
        return null;
      }

      return String(pendingMatch.request_id ?? pendingMatch.id);
    };

    try {
      setProcessingFriendRequestNotificationId(String(notification.id));
      setFriendRequestAction(decision === 'accept' ? 'accept' : 'decline');
      const requestId = await resolveRequestId();

      if (!requestId) {
        markRead(notification.id);
        setFriendRequestError('This friend request is no longer pending.');
        setProcessingFriendRequestNotificationId(null);
        setFriendRequestAction(null);
        return;
      }

      if (decision === 'accept') {
        await friendsAPI.acceptFriendRequest(requestId);
        setAcceptedNotificationId(String(notification.id));
        setTimeout(() => {
          setAcceptedNotificationId(null);
          refreshNotifications();
        }, 1200);
      } else {
        // Confirm decline
        Alert.alert(
          `Decline ${notification.fromUser?.name || 'this user'}'s friend request?`,
          '',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setProcessingFriendRequestNotificationId(null);
                setFriendRequestAction(null);
              },
            },
            {
              text: 'Decline',
              style: 'destructive',
              onPress: async () => {
                try {
                  await friendsAPI.declineFriendRequest(requestId);
                  setDeclinedNotificationId(String(notification.id));
                  setTimeout(() => {
                    setDeclinedNotificationId(null);
                    refreshNotifications();
                  }, 600);
                } catch (error: any) {
                  setFriendRequestError('Could not decline. Try again.');
                } finally {
                  setProcessingFriendRequestNotificationId(null);
                  setFriendRequestAction(null);
                }
              },
            },
          ]
        );
        return;
      }

      markRead(notification.id);
    } catch (error: any) {
      setFriendRequestError(String(error?.response?.data?.error || error?.message || 'Please try again.'));
    } finally {
      setProcessingFriendRequestNotificationId(null);
      setFriendRequestAction(null);
    }
  };

  return (
    <ScreenShell scroll={false}>
      <AppHeader
        title="Notifications"
        showBack={true}
        onBack={() => router.back()}
        rightAction={
          <Pressable
            hitSlop={10}
            onPress={unreadCount > 0 ? markAllRead : undefined}
            style={[styles.markAllButton, { opacity: unreadCount > 0 ? 1 : 0.5 }]}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done-outline" size={14} color={unreadCount > 0 ? colors.brand : '#BDBDBD'} />
            <Text style={[styles.markAllText, { color: unreadCount > 0 ? colors.brand : '#BDBDBD' }]}>Mark all read</Text>
          </Pressable>
        }
      />

      {notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="notifications-outline" size={42} color={darkMode ? '#444444' : '#CCCCCC'} />
          <Text style={[styles.emptyText, { color: textSecondary }]}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((notification) => {
            const key = notification.type in typeConfig ? notification.type : 'ride_update';
            const config = typeConfig[key as keyof typeof typeConfig];

            return (
              <View key={notification.id} style={{ position: 'relative' }}>
                <Pressable
                  onPress={() => {
                    markRead(notification.id);
                    if (notification.actionTarget === 'ride_join_requests' && notification.rideId) {
                      router.push({
                        pathname: '/(app)/ride-status',
                        params: {
                          tab: 'created',
                          createdFilter: 'requests',
                          rideId: notification.rideId,
                          requestId: notification.requestId || '',
                        },
                      });
                      return;
                    }
                    if (notification.actionTarget === 'ride_details' && notification.rideId) {
                      router.push({ pathname: '/(app)/ride-details', params: { rideId: notification.rideId } });
                      return;
                    }
                    if (notification.actionTarget === 'user_profile' && notification.fromUser?.id) {
                      router.push({ pathname: '/(app)/user/[id]', params: { id: notification.fromUser.id } });
                    }
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                      opacity: notification.read ? 0.65 : 1,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: config.bg }]}> 
                    {notification.fromUser ? (
                      <UserAvatar size="sm" name={notification.fromUser.name} source={notification.fromUser.avatar ?? undefined} />
                    ) : (
                      <Ionicons name={config.icon as any} size={18} color={config.color} />
                    )}
                  </View>

                  <View style={styles.cardCopy}>
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.cardTitle, { color: textPrimary }]}>{notification.title}</Text>
                      <View style={[styles.timeWrap, { marginRight: 28 }]}> {/* Move time left to avoid X button */}
                        <Text style={[styles.cardTime, { color: textSecondary }]}>{notification.time}</Text>
                        {!notification.read ? <View style={styles.unreadDot} /> : null}
                      </View>
                    </View>

                    <Text style={[styles.cardBody, { color: textSecondary }]}>{notification.body}</Text>

                    {!notification.read && notification.type === 'join_request' ? (
                      <View style={styles.inlineActions}>
                        <Pressable onPress={() => markRead(notification.id)} style={styles.acceptButton}>
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </Pressable>
                        <Pressable onPress={() => markRead(notification.id)} style={styles.declineButton}>
                          <Text style={styles.declineButtonText}>Decline</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {!notification.read && notification.type === 'friend_request' ? (
                      <View style={styles.inlineActions}>
                        {acceptedNotificationId === String(notification.id) ? (
                          <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 12 }}>
                            You are now friends ✓
                          </Text>
                        ) : declinedNotificationId === String(notification.id) ? (
                          <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 12 }}>
                            Request declined
                          </Text>
                        ) : (
                          <>
                            <Pressable
                              onPress={() => handleFriendRequestDecision(notification, 'accept')}
                              style={styles.friendAcceptButton}
                              disabled={processingFriendRequestNotificationId === String(notification.id)}
                            >
                              <Text style={styles.acceptButtonText}>
                                {processingFriendRequestNotificationId === String(notification.id) && friendRequestAction === 'accept'
                                  ? 'Accepting...'
                                  : 'Accept'}
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleFriendRequestDecision(notification, 'reject')}
                              style={styles.declineButton}
                              disabled={processingFriendRequestNotificationId === String(notification.id)}
                            >
                              <Text style={styles.declineButtonText}>
                                {processingFriendRequestNotificationId === String(notification.id) && friendRequestAction === 'decline'
                                  ? 'Declining...'
                                  : 'Decline'}
                              </Text>
                            </Pressable>
                          </>
                        )}
                        {friendRequestError && processingFriendRequestNotificationId === String(notification.id) ? (
                          <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{friendRequestError}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {notification.type === 'friend_request_accepted' ? (
                      <View style={styles.inlineActions}>
                        <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 12 }}>
                          You are now friends!
                        </Text>
                      </View>
                    ) : null}

                    {!notification.read && (notification.type === 'ride_cancelled' || notification.type === 'passenger_removed') ? (
                      <View style={styles.warnStrip}>
                        <Text style={styles.warnStripText}>
                          {notification.type === 'ride_cancelled' ? 'Ride was cancelled' : 'You were removed'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => deleteNotification(notification.id)}
                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, padding: 4 }}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={18} color="#BDBDBD" />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  unreadCountBadge: {
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  markAllButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  markAllText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardTime: {
    fontSize: 10,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  cardBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    paddingVertical: 7,
  },
  friendAcceptButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    paddingVertical: 7,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 7,
  },
  declineButtonText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  warnStrip: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  warnStripText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
});
