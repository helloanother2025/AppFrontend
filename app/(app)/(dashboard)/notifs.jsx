import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../../../src/api/notifications';
import { joinRequestsAPI } from '../../../src/api/joinRequests';
import { friendsAPI } from '../../../src/api/friends';
import { useFriends } from '../../../context/FriendsContext';
import { useRide } from '../../../context/RideContext';
import { useUser } from '../../../context/UserContext';
import { useRouter } from 'expo-router';
import { parseServerDate } from '../../../src/utils/date';

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
    
    // Auto-refresh notifications every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    
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
      // console.log removed
      const data = await notificationsAPI.getNotifications('all', 50);
      // console.log removed
      // console.log removed
      setNotificationData(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      console.error('Error details:', error.message);
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
      const requestId = notification.related_request_id;
      if (notification.type === 'friend_request' && requestId) {
        await friendsAPI.acceptFriendRequest(requestId);
        await fetchFriends();
        Alert.alert('Success', 'Friend request accepted!');
      } else if (notification.type === 'join_request' && requestId) {
        await joinRequestsAPI.acceptJoinRequest(requestId);
        // Fetch the ride details to get updated passengers
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
      
      // If this was an acceptance notification, refresh joined rides
      if (notification?.type === 'join_request_accepted') {
        console.log('🔄 Refreshing joined rides after acceptance notification');
        await fetchJoinedRides();
      }
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return '#4CAF50';
      case 'declined':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      default:
        return 'Pending';
    }
  };

  // ✅ Empty state fallback
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
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchNotifications}
          disabled={loading}
        >
          <Text style={styles.refreshText}>{loading ? '⟳' : '↻'}</Text>
        </TouchableOpacity>
      </View>

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

        // Handler for ride completed notification
        const handleRideCompleted = () => {
          if (notification.ride_info && notification.ride_info.rideId) {
            // Pass rideId and partners as needed
            router.push({
              pathname: '/(app)/(completeRide)/partnerFeedback',
              params: { rideId: notification.ride_info.rideId }
            });
          }
        };

        return (
          <CardButton
            key={notifId}
            onPress={
              isRideCompleted
                ? handleRideCompleted
                : (isJoinRequest || isFriendRequest) && (notification.related_user_handle || notification.user_username || notification.user_handle || notification.related_user_id)
                ? () => {
                    const handle = notification.related_user_handle || notification.user_username || notification.user_handle;
                    if (handle) {
                      router.push(`/user/${handle.replace(/^@/, '')}`);
                    } else if (notification.related_user_id) {
                      router.push(`/user/${notification.related_user_id}`);
                    }
                  }
                : undefined
            }
          >
            <View style={styles.notificationContent}>
              {/* Header */}
              <View style={styles.notificationHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.notificationMessage}>
                    {displayMessage}
                  </Text>
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

              {/* Ride Info */}
              {(notification.ride_start_time || notification.ride) && (
                <View style={styles.rideInfo}>
                  {notification.ride?.destination && (
                    <Text style={styles.rideDestination}>
                      📍 {notification.ride.destination}
                    </Text>
                  )}
                  <Text style={styles.rideDetails}>
                    {notification.ride_transport || notification.ride?.transport || 'Ride'} • {notification.ride_start_time 
                      ? parseServerDate(notification.ride_start_time)?.toLocaleDateString()
                      : (notification.ride?.date || '')}
                  </Text>
                </View>
              )}

                {/* Action or Status */}
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

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    paddingTop: 10,
    backgroundColor: '#f7f7f7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
    columnGap: 148,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
  },
  refreshButton: {
    width: 32,
    height: 32,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cfcfcf',
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#666',
  },
  notificationContent: {
    width: '100%',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  notificationMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  requesterHandle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  rideInfo: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rideDestination: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rideDetails: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#000',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  declineButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
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
  crossButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  // ✅ Empty state styles (from first version)
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
  },
});
