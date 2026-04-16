import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/ScreenShell';
import { UserAvatar } from '../components/UserAvatar';
import { useAppContext } from '../context/AppContext';
import { chats as demoChats, currentUser as demoCurrentUser, type Message } from '../utils/rideMapper';
import { chatAPI } from '../api/chat';
import { useUser } from '../context/UserContext';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../theme';


export function ChatDetailScreen() {
  const { darkMode, currentUserAvatar, isDemoMode } = useAppContext();
  const { user } = useUser();
  const [messageText, setMessageText] = useState('');
  const [remoteMessages, setRemoteMessages] = useState<Message[]>([]);
  const [chatParticipant, setChatParticipant] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  const params = useLocalSearchParams<{ id?: string, chatId?: string }>();
  const chatId = String(params.id || params.chatId || '');
  const demoChat = useMemo(() => demoChats.find((item) => item.id === chatId) ?? demoChats[0], [chatId]);
  const activeUser = user ?? demoCurrentUser;
  const messages = isDemoMode ? demoChat.messages : remoteMessages;

  useEffect(() => {
    let active = true;

    const loadChat = async () => {
      if (isDemoMode || !chatId) {
        setRemoteMessages([]);
        setChatParticipant(null);
        return;
      }

      try {
        const [chatResponse, messageResponse] = await Promise.all([
          chatAPI.getChat(chatId),
          chatAPI.getMessages(chatId),
        ]);

        if (!active) return;

        const participants = chatResponse?.participants ?? [];
        const otherParticipant = participants.find((participant: any) => String(participant.participant_id ?? participant.user_id ?? participant.id) !== String(activeUser.id));

        setChatParticipant(otherParticipant || participants[0] || null);
        setRemoteMessages(
          (messageResponse?.messages ?? []).map((message: any) => ({
            id: String(message.message_id ?? message.id),
            senderId: String(message.sender_id),
            text: message.content ?? message.text ?? '',
            time: message.created_at ?? message.time ?? '',
            read: Boolean(message.is_read),
          }))
        );
      } catch {
        if (active) {
          setChatParticipant(null);
          setRemoteMessages([]);
        }
      }
    };

    loadChat();

    return () => {
      active = false;
    };
  }, [chatId, isDemoMode, activeUser.id]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isDemoMode) {
      setRemoteMessages((previous) => [
        ...previous,
        {
          id: `m-${Date.now()}`,
          senderId: activeUser.id,
          text: trimmed,
          time,
          read: false,
        },
      ]);
    } else if (chatId) {
      chatAPI.sendMessage(chatId, trimmed).then((response) => {
        const created = response?.message;
        if (created) {
          setRemoteMessages((previous) => [
            ...previous,
            {
              id: String(created.message_id ?? created.id),
              senderId: String(created.sender_id),
              text: created.content ?? created.text ?? trimmed,
              time: created.created_at ?? time,
              read: Boolean(created.is_read),
            },
          ]);
        }
      });
    }
    setMessageText('');
  };

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111111';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#666666';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? '#2A2A2A' : '#E5E5E5';

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}> 
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={textSecondary} />
        </Pressable>

        <UserAvatar
          size="sm"
            name={(isDemoMode ? demoChat?.participant?.name : chatParticipant?.name) || 'Chat'}
          source={(isDemoMode ? demoChat?.participant?.avatar : chatParticipant?.avatar_url ?? chatParticipant?.avatar) ?? currentUserAvatar ?? undefined}
        />

        <View style={styles.headerCopy}>
          <Text style={[styles.headerName, { color: textPrimary }]} numberOfLines={1}>
            {(isDemoMode ? demoChat?.participant?.name : chatParticipant?.name) || 'Chat'}
          </Text>
          <Text style={[styles.headerSub, { color: textSecondary }]}>@{(isDemoMode ? demoChat?.participant?.username : chatParticipant?.username) || 'user'}</Text>
        </View>

        <Pressable style={[styles.callButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}>
          <Ionicons name="call-outline" size={16} color={textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {messages.map((message: Message) => {
            const mine = message.senderId === activeUser.id;
            const sender = isDemoMode ? demoChat.participant : chatParticipant;

            return (
              <View key={message.id} style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowOther]}>
                {!mine ? (
                  <View style={styles.otherAvatarWrap}>
                    <UserAvatar size="sm" name={sender?.name || 'User'} source={sender?.avatar ?? undefined} />
                  </View>
                ) : null}

                <View style={styles.msgContentWrap}>
                  {!mine && sender ? <Text style={styles.senderName}>{sender.name.split(' ')[0]}</Text> : null}
                  <View
                    style={[
                      styles.messageBubble,
                      mine
                        ? { backgroundColor: '#1C1C1E', borderBottomRightRadius: 4 }
                        : { backgroundColor: card, borderColor: border, borderWidth: 1, borderBottomLeftRadius: 4 },
                    ]}
                  >
                    <Text style={[styles.messageText, { color: mine ? '#FFFFFF' : textPrimary }]}>{message.text}</Text>
                  </View>
                  <Text style={[styles.messageTime, { color: textSecondary, textAlign: mine ? 'right' : 'left' }]}>
                    {message.time}
                    {mine ? ` ${message.read ? '✓✓' : '✓'}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: card, borderTopColor: border }]}> 
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            style={[styles.composerInput, { borderColor: border, color: textPrimary, backgroundColor: darkMode ? '#1A1A1A' : '#F9FAFB' }]}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!messageText.trim()}
            style={[styles.sendButton, { backgroundColor: messageText.trim() ? colors.brand : darkMode ? '#2A2A2A' : '#E5E5E5' }]}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 2,
    marginLeft: -2,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  callButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  otherAvatarWrap: {
    marginBottom: 16,
  },
  msgContentWrap: {
    maxWidth: '75%',
  },
  senderName: {
    fontSize: 11,
    color: colors.brand,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    maxHeight: 110,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
