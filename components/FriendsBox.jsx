import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from './StyledText';

const FriendsBox = ({ friends, onFriendPress }) => {
  if (!friends || friends.length === 0) {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.empty}>No friends yet</Text>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Friends</Text>
      <View style={styles.list}>
        {friends.map(friend => (
          <TouchableOpacity key={friend.id} style={styles.friend} onPress={() => onFriendPress(friend)}>
            <Text style={styles.friendName}>{friend.name}</Text>
            <Text style={styles.friendHandle}>{friend.handle || (friend.username ? `@${friend.username}` : '')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  empty: {
    color: '#888',
    fontSize: 14,
  },
  list: {
    marginTop: 8,
  },
  friend: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendHandle: {
    fontSize: 13,
    color: '#888',
  },
});

export default FriendsBox;
