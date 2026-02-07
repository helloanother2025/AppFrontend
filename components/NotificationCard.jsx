import { StyleSheet, View, TouchableOpacity } from 'react-native';
import React from 'react';
import { StyledText as Text } from '../components/StyledText';
import { StyledCard as Card } from '../components/StyledCard';
import { StyledButton as Button } from '../components/StyledButton';
import Entypo from '@expo/vector-icons/Entypo';

const NotificationCard = ({ 
  notification, 
  onAccept, 
  onDecline, 
  onRemove,
}) => {
  
    const isJoinRequest = notification.type === 'join_request';
    const isJoinRequestAccepted = notification.type === 'join_request_accepted';
    const isJoinRequestRejected = notification.type === 'join_request_rejected';
    const isFareChanged = notification.type === 'fare_changed';
    const isFriendAddedToRide = notification.type === 'friend_added_to_ride';
    const isFriendRequest = notification.type === 'friend_request';
  
    const getStatusColor = (status) => {
      switch (status) {
        case 'accepted':
          return '#4CAF50';
        case 'declined':
          return '#e63e4c';
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

    let message = '';
    if (isJoinRequestAccepted) {
      message = `${notification.user?.handle} has accepted your join request`;
    } else if (isJoinRequestRejected) {
      message = `${notification.user?.handle} has rejected your join request`;
    } else if (isFareChanged) {
      message = `The fare for your ride has changed to ৳ ${notification.ride?.fare}`;
    } else if (isFriendAddedToRide) {
      message = `${notification.user?.handle} added you to a ride`;
    } else if (isFriendRequest) {
      message = `${notification.user?.handle} sent you a friend request`;
    } else if (isJoinRequest) {
      message = `${notification.user?.handle} wants to join your ride`;
    }

  return (
    <Card>
    <View style={styles.notificationContent}>
      {/* Header */}
      <View style={styles.notificationHeader}>
        {!isFareChanged &&  <Text style={{ fontSize: 30 }}>👤 </Text>}
      
        <View style={styles.headerLeft}>
          <Text style={styles.notificationMessage}>{message}</Text>
        </View>
        <TouchableOpacity onPress={() => onRemove?.(notification.id)}>
          <Entypo name="circle-with-cross" size={20} color="#888" />
        </TouchableOpacity>
      </View>
      <Text style={styles.timestamp}>{notification.timestamp}</Text>

      {/* Ride Info */}
      {!isFriendRequest && (
        <View style={styles.rideInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginVertical: 8 }}>
            <Entypo name="location-pin" size={18} color="#e63e4c" style={{marginRight: 5}} />
            <Text style={styles.rideText}>{notification.ride?.destination}</Text>
          </View>

          <Text style={styles.rideDetails}>
            {notification.ride?.transport} • {notification.ride?.date} •{' '}
            {notification.ride?.time}
          </Text>
        </View>
      )}

      {/* Action or Status */}
      {(isFriendRequest && notification.status === 'pending') || (isJoinRequest && notification.status === 'pending') ? (
        <View style={styles.buttonContainer}>
          <Button
            style={styles.acceptButton}
            onPress={() => onAccept?.(notification.id)}
            title="Accept"
          >
          </Button>
          <Button
            style={styles.declineButton}
            onPress={() => onDecline?.(notification.id)}
            title="Decline"
          >
          </Button>
        </View>
      ) : (
        // Display status for friend requests (not pending) and other informative notifications
        (isFriendRequest || isJoinRequest || isJoinRequestAccepted || isJoinRequestRejected) && (
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(notification.status) },
              ]}
            >
              {getStatusText(notification.status)}
            </Text>
          </View>
        )
      )}
    </View>
  </Card>
  )
}

export default NotificationCard

const styles = StyleSheet.create({
    notificationContent: {
      width: '100%',
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 0,
    },
    headerLeft: {
      flex: 1,
      marginRight: 10,
    },
    notificationMessage: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
      width: '95%'
    },
    timestamp: {
      fontSize: 12,
      color: '#666',
      marginBottom: 8,
    },
    rideInfo: {
      marginBottom: 5,
      paddingTop: 5,
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
    },
    acceptButton: {
      backgroundColor: '#4caf50',
      paddingVertical: 10,
      width: '48%',
    },
    declineButton: {
      backgroundColor: '#e63e4c',
      paddingVertical: 10,
      width: '48%',
    },
    statusContainer: {
      alignItems: 'center',
      marginTop: 10,
    },
    statusText: {
      fontSize: 14,
      fontWeight: 'semibold',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: '#f0f0f0',
    },
  });
  