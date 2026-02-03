import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledCardButton as CardButton } from '../../../components/StyledCardButton';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../../../src/api/notifications';
import { joinRequestsAPI } from '../../../src/api/joinRequests';
import { useRide } from '../../../context/RideContext';
import notificationsFallback from '../../../data/notificationData.json';

const Notifications = () => {
  const [notificationData, setNotificationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const { fetchMyRides, fetchJoinedRides } = useRide();

  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh notifications every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      console.log('Fetching notifications...');
      const data = await notificationsAPI.getNotifications('all', 50);
      console.log('Notifications received:', data);
      console.log('Number of notifications:', data.notifications?.length || 0);
      setNotificationData(data.notifications || notificationsFallback);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      console.error('Error details:', error.message);
      setNotificationData(notificationsFallback);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (notification) => {
    if (processing[notification.notification_id]) return;
    
    setProcessing(prev => ({ ...prev, [notification.notification_id]: true }));
    try {
      const requestId = notification.related_request_id;
      
      if (requestId) {
        await joinRequestsAPI.acceptJoinRequest(requestId);
      }
      
      await notificationsAPI.markAsRead(notification.notification_id);
      await notificationsAPI.deleteNotification(notification.notification_id);
      
      setNotificationData(prev => prev.filter(n => n.notification_id !== notification.notification_id));
      
      // Refresh rides to update the list
      await fetchMyRides();
      
      Alert.alert('Success', 'Join request accepted!');
    } catch (error) {
      console.error('Failed to accept request:', error);
      Alert.alert('Error', error.message || 'Failed to accept join request');
    } finally {
      setProcessing(prev => ({ ...prev, [notification.notification_id]: false }));
    }
  };

  const handleDecline = async (notification) => {
    if (processing[notification.notification_id]) return;
    
    setProcessing(prev => ({ ...prev, [notification.notification_id]: true }));
    try {
      const requestId = notification.related_request_id;
      
      if (requestId) {
        await joinRequestsAPI.rejectJoinRequest(requestId);
      }
      
      await notificationsAPI.markAsRead(notification.notification_id);
      await notificationsAPI.deleteNotification(notification.notification_id);
      
      setNotificationData(prev => prev.filter(n => n.notification_id !== notification.notification_id));
      
      Alert.alert('Success', 'Join request declined');
    } catch (error) {
      console.error('Failed to decline request:', error);
      Alert.alert('Error', error.message || 'Failed to decline join request');
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
        <Text style={styles.emptyText}>Loading notifications...</Text>
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
          <Text style={styles.refreshText}>{loading ? '⟳' : '↻'} Refresh</Text>
        </TouchableOpacity>
      </View>

      {notificationData.map((notification) => {
        const notifId = notification.notification_id || notification.id;
        const isProcessing = processing[notifId];
        const isJoinRequest = notification.type === 'join_request';
        const timestamp = notification.created_at 
          ? new Date(notification.created_at).toLocaleString()
          : notification.timestamp;

        return (
          <CardButton key={notifId}>
            <View style={styles.notificationContent}>
              {/* Header */}
              <View style={styles.notificationHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
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
                      ? new Date(notification.ride_start_time).toLocaleDateString()
                      : (notification.ride?.date || '')}
                  </Text>
                </View>
              )}

              {/* Action or Status */}
              {isJoinRequest && !notification.is_read ? (
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
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#4CAF50',
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
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
  },
});
