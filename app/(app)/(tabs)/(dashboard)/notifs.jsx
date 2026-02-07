import { StyleSheet } from 'react-native';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledTitle as Title } from '../../../../components/StyledTitle'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import NotificationCard from '../../../../components/NotificationCard';
import React, { useState } from 'react';
import notifications from '../../../../data/notificationData.json';

const Notifications = () => {
  const [notificationData, setNotificationData] = useState(notifications);

  if (notificationData.length === 0) {
    return (
      <ScrollView>
        <Title>Notifications</Title>
        <Text style={styles.emptySubText}>You're all caught up!</Text>
      </ScrollView>
    );
  }

  const handleAccept = (id) => {
    setNotificationData(prev => prev.map(n => n.id === id ? { ...n, status: 'accepted' } : n));
  };
  const handleDecline = (id) => {
    setNotificationData(prev => prev.map(n => n.id === id ? { ...n, status: 'declined' } : n));
  };
  const handleRemove = (id) => {
    setNotificationData(prev => prev.filter(n => n.id !== id));
  };

  return (
    <ScrollView>
      <Title>Notifications</Title>

      {notificationData.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onRemove={handleRemove}
        />
      ))}
    </ScrollView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
})