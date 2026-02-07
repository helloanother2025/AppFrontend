import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from './StyledText';
import React, { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';

const DashboardHeader = () => {
  const router = useRouter();
  const { chats, fetchChats } = useChat();
  const { isAuthenticated } = useUser();
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let intervalId;
    let isMounted = true;

    const load = async () => {
      if (!isAuthenticated) return;
      if (polling) return;
      try {
        setPolling(true);
        await fetchChats();
      } catch (e) {
        // ignore
      } finally {
        if (isMounted) setPolling(false);
      }
    };

    load();
    intervalId = setInterval(load, 8000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchChats, polling, isAuthenticated]);

  const unreadCount = useMemo(() => {
    return (chats || []).reduce((sum, c) => sum + (Number(c.unread_count || 0) > 0 ? 1 : 0), 0);
  }, [chats]);
  return (
    <View style={styles.container}>
      <Text style={{ fontWeight: 'bold', color: '#e63e4c', fontSize: 16 }}>
        BashayJabo
      </Text>

      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(chat)')}>
          <View style={styles.iconWrapper}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#ababab" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                {unreadCount < 10 ? (
                  <Text style={styles.badgeText}>{String(unreadCount)}</Text>
                ) : null}
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Ionicons name="settings-sharp" size={24} color="#ababab" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DashboardHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 5,
    backgroundColor: '#f7f7f7',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#e63e4c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  buttonText: {
    color: '#ababab',
    marginLeft: 8,
    fontSize: 14,
  },
});

