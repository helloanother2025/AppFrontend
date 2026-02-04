import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StyledText as Text } from '../../../components/StyledText';
import { chatAPI } from '../../../src/api/chat';
import { useUser } from '../../../context/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { parseServerDate } from '../../../src/utils/date';

export default function ChatListScreen() {
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
          } catch (e) {
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

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      let intervalId;

      loadChats();
      intervalId = setInterval(loadChats, 8000);

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
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
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#e63e4c" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadChats} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Chats</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => String(item.chatId)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRow} onPress={() => openChat(item)}>
            {item.otherUser?.avatar_url ? (
              <Image source={{ uri: item.otherUser.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {(item.otherUser?.name || 'U').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.chatInfo}>
              <View style={styles.chatTopRow}>
                <Text style={styles.chatName}>{item.otherUser?.name || 'User'}</Text>
                <Text style={styles.chatTime}>
                  {item.lastMessageTime
                    ? parseServerDate(item.lastMessageTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </Text>
              </View>
              <Text style={styles.chatHandle}>@{item.otherUser?.username || 'user'}</Text>
              <Text numberOfLines={1} style={styles.chatPreview}>
                {item.lastMessage || 'No messages yet'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 8,
    color: '#000',
  },
  listContent: {
    paddingVertical: 8,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  chatHandle: {
    color: '#888',
    marginBottom: 4,
  },
  chatPreview: {
    color: '#666',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: 'bold',
    color: '#555',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  errorText: {
    color: '#e63e4c',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#e63e4c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
