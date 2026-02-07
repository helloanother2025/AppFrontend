import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StyledText as Text } from './StyledText';
import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
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
  const { theme, toggleTheme } = useTheme ? useTheme() : { theme: 'light', toggleTheme: () => {} };
  const isDark = theme === 'dark';
  const [showSettings, setShowSettings] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#181c22' : '#f7f7f7' }] }>
      <Text style={{ fontWeight: 'bold', color: isDark ? '#e63e4c' : '#e63e4c', fontSize: 16 }}>
        BashayJabo
      </Text>

      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(chat)')}>
          <View style={styles.iconWrapper}>
            <Ionicons name="chatbubble-ellipses" size={24} color={isDark ? '#fff' : '#ababab'} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                {unreadCount < 10 ? (
                  <Text style={styles.badgeText}>{String(unreadCount)}</Text>
                ) : null}
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setShowSettings(!showSettings)}>
          <Ionicons name="settings-sharp" size={24} color={isDark ? '#fff' : '#ababab'} />
        </TouchableOpacity>
        {showSettings && (
          <View style={{ marginLeft: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#23272f' : '#fff', borderRadius: 12, padding: 8, elevation: 2 }}>
            <Text style={{ color: isDark ? '#fff' : '#333', marginRight: 8 }}>Dark mode</Text>
            <TouchableOpacity onPress={toggleTheme} style={{ padding: 4 }}>
              <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={22} color={theme === 'dark' ? '#e63e4c' : '#333'} />
            </TouchableOpacity>
          </View>
        )}
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
    paddingBottom: 10,
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

