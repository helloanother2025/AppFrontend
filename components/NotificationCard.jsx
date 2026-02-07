import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from './StyledText';

const NotificationCard = ({ notification, onAccept, onDecline, onRemove }) => {
  const isJoinRequest = notification.type === 'join_request';
  const isJoinRequestAccepted = notification.type === 'join_request_accepted';
  const isJoinRequestRejected = notification.type === 'join_request_rejected';
  const isFareChanged = notification.type === 'fare_changed';
  const isFriendAddedToRide = notification.type === 'friend_added_to_ride';
  const isFriendRequest = notification.type === 'friend_request';

  let message = notification.message;
  if (isJoinRequest) {
    message = `${notification.user_name} wants to join your ride`;
  } else if (isJoinRequestAccepted) {
    message = 'Your join request was accepted!';
  } else if (isJoinRequestRejected) {
    message = 'Your join request was rejected.';
  } else if (isFareChanged) {
    message = 'Fare for your ride has changed.';
  } else if (isFriendAddedToRide) {
    message = `${notification.user_name} was added to your ride.`;
  } else if (isFriendRequest) {
    message = `${notification.user_name} sent you a friend request.`;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {isJoinRequest && (
          <>
            <TouchableOpacity style={styles.button} onPress={() => onAccept(notification)}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => onDecline(notification)}>
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </>
        )}
        {isFriendRequest && (
          <>
            <TouchableOpacity style={styles.button} onPress={() => onAccept(notification)}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => onDecline(notification)}>
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </>
        )}
        {(isJoinRequestAccepted || isJoinRequestRejected || isFareChanged || isFriendAddedToRide) && (
          <TouchableOpacity style={styles.button} onPress={() => onRemove(notification)}>
            <Text style={styles.buttonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    backgroundColor: '#e63e4c',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default NotificationCard;
