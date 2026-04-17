import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/ScreenShell';
import { useAppContext } from '../context/AppContext';
import { chats as demoChats, currentUser as demoCurrentUser } from '../utils/rideMapper';
import { useUser } from '../context/UserContext';
import { chatAPI } from '../api/chat';
import { colors } from '../theme';

type ChatTab = 'groups' | 'direct';

export function ChatListScreen() {
  const { groupChats, darkMode, isDemoMode } = useAppContext();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<ChatTab>('groups');
  const [searchQ, setSearchQ] = useState('');
  const [liveChats, setLiveChats] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    const loadChats = async () => {
      if (isDemoMode) {
        setLiveChats([]);
        return;
      }

      try {
        const response = await chatAPI.getChats();
        const rows = response?.chats ?? [];

        const enriched = await Promise.all(
          rows.map(async (chat: any) => {
            try {
              const details = await chatAPI.getChat(chat.chat_id ?? chat.id);
              const participants = (details?.participants ?? []).map((participant: any) => ({
                id: String(participant.participant_id ?? participant.user_id ?? participant.id),
                name: participant.name,
                username: participant.username,
                avatar: participant.avatar_url ?? participant.avatar,
                rideStatus: participant.ride_status,
              }));

              const otherParticipants = participants.filter((participant: { id: string }) => participant.id !== String(user?.id));

              // Prefer ride_status from backend if present, else fallback to chat.state
              let rideStatus = null;
              if (details?.participants?.length > 0 && chat.type === 'ride') {
                // Find current user's ride_status if available
                const myParticipant = participants.find((p: any) => p.id === String(user?.id));
                rideStatus = myParticipant?.rideStatus || null;
              }

              return {
                id: String(chat.chat_id ?? chat.id),
                type: chat.type,
                state: rideStatus || chat.state || 'active',
                rideName: chat.ride_name || (chat.type === 'private' ? otherParticipants[0]?.name || 'Direct chat' : `Ride ${chat.ride_id ?? chat.chat_id}`),
                lastMessage: chat.last_message || '',
                lastTime: chat.last_message_time || '',
                unreadCount: Number(chat.unread_count || 0),
                participants,
              };
            } catch {
              return {
                id: String(chat.chat_id ?? chat.id),
                type: chat.type,
                rideName: chat.ride_name || `Ride ${chat.ride_id ?? chat.chat_id}`,
                lastMessage: chat.last_message || '',
                lastTime: chat.last_message_time || '',
                unreadCount: Number(chat.unread_count || 0),
                participants: [],
              };
            }
          })
        );

        if (active) {
          setLiveChats(enriched);
        }
      } catch {
        if (active) {
          setLiveChats([]);
        }
      }
    };

    loadChats();

    return () => {
      active = false;
    };
  }, [isDemoMode, user?.id]);

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111111';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#666666';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? '#2A2A2A' : '#EEEEEE';
  const searchBg = darkMode ? '#2A2A2A' : '#F5F5F7';
  const tabBg = darkMode ? '#111111' : '#EBEBEB';

  const chatsToShow = isDemoMode ? (demoChats as any[]) : liveChats;

  const filteredGroups = useMemo(
    () =>
      chatsToShow
        .filter((chat) => {
          // Only group chats (rides)
          if (String(chat.type ?? 'ride') !== 'ride') return false;
          // Find creator (participant with matching user id)
          const creator = (chat.participants || []).find(
            (p: any) => p.id === String(user?.id)
          );
          // If I am creator, check if there was ever any non-creator participant
          if (creator) {
            // If there is a property like chat.everHadJoiner, prefer it (future-proof)
            // Otherwise, keep if there is at least one non-creator participant (even if removed)
            // For now, if participants array ever had >1, keep
            if ((chat.participants || []).length <= 1) return false;
          }
          return true;
        })
        .filter(
          (chat) =>
            (chat.rideName ?? '').toLowerCase().includes(searchQ.toLowerCase()) ||
            (chat.lastMessage ?? '').toLowerCase().includes(searchQ.toLowerCase())
        ),
    [chatsToShow, searchQ, user?.id]
  );

  const filteredDirect = useMemo(
    () =>
      chatsToShow
        .filter((chat) => String(chat.type ?? '') === 'private')
        .filter(
          (chat) =>
            (chat.rideName ?? '').toLowerCase().includes(searchQ.toLowerCase()) ||
            (chat.lastMessage ?? '').toLowerCase().includes(searchQ.toLowerCase())
        ),
    [chatsToShow, searchQ]
  );

  const renderChatCard = (chat: any, icon: 'people' | 'chatbubble') => {
    // Status badge rendering for group chats
    let statusBadge = null;
    if (chat.type === 'ride') {
      let badgeColor = '#E5E7EB';
      let badgeText = '';
      // Map backend statuses to only: Active, Inactive, Archived
      let mappedState = 'active';
      switch (chat.state) {
        case 'started':
        case 'active':
          mappedState = 'active'; break;
        case 'completed':
        case 'cancelled':
        case 'expired':
        case 'unactive':
          mappedState = 'inactive'; break;
        case 'archived':
        case 'read_only':
        case 'locked':
          mappedState = 'archived'; break;
        default:
          mappedState = 'active'; break;
      }
      switch (mappedState) {
        case 'active':
          badgeColor = colors.brand; badgeText = 'Active'; break;
        case 'inactive':
          badgeColor = '#A3A3A3'; badgeText = 'Inactive'; break;
        case 'archived':
          badgeColor = '#D1D5DB'; badgeText = 'Archived'; break;
      }
      statusBadge = (
        <View style={{ backgroundColor: badgeColor, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 2 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badgeText}</Text>
        </View>
      );
    }
    const otherParticipants = (chat.participants || []).filter((participant: any) => participant.id !== String(user?.id ?? demoCurrentUser.id));

    return (
      <Pressable
        key={chat.id}
        onPress={() =>
          router.push(
            String(chat.type ?? '') === 'ride'
              ? { pathname: '/(app)/group-chat/[id]', params: { id: chat.id } }
              : { pathname: '/(app)/chat/[id]', params: { id: chat.id } }
          )
        }
        style={[styles.chatCard, { backgroundColor: card, borderColor: border }]}
      >
        <View style={styles.chatIconWrap}>
          <View style={styles.chatIcon}>
            <Ionicons name={icon} size={20} color="#FFFFFF" />
          </View>
          {chat.unreadCount > 0 ? (
            <View style={styles.chatUnreadDot}>
              <Text style={styles.chatUnreadText}>{chat.unreadCount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.chatCopy}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatTitle, { color: textPrimary }]} numberOfLines={1}>{chat.rideName}</Text>
            <Text style={[styles.chatTime, { color: textSecondary }]}>{chat.lastTime}</Text>
          </View>
          {statusBadge}
          <Text style={[styles.chatMeta, { color: textSecondary }]} numberOfLines={1}>
            {otherParticipants.map((participant: { name: string }) => participant.name.split(' ')[0]).join(', ')}
          </Text>
          <Text
            style={[
              styles.chatLast,
              { color: chat.unreadCount > 0 ? textPrimary : textSecondary, fontWeight: chat.unreadCount > 0 ? '600' : '400' },
            ]}
            numberOfLines={1}
          >
            {chat.lastMessage}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={14} color={textSecondary} />
      </Pressable>
    );
  };

  const totalUnread = chatsToShow.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}> 
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Messages</Text>
          {totalUnread > 0 ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{totalUnread} unread</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.searchRow, { backgroundColor: searchBg }]}> 
          <Ionicons name="search-outline" size={14} color={textSecondary} />
          <TextInput
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder="Search chats..."
            placeholderTextColor="#9CA3AF"
            style={[styles.searchInput, { color: textPrimary }]}
          />
          {searchQ ? (
            <Pressable onPress={() => setSearchQ('')}>
              <Ionicons name="close" size={13} color={textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.tabBar, { backgroundColor: tabBg }]}> 
          <Pressable
            onPress={() => setActiveTab('groups')}
            style={[styles.tabButton, activeTab === 'groups' ? styles.tabActive : styles.tabIdle]}
          >
            <Ionicons name="people-outline" size={12} color={activeTab === 'groups' ? '#FFFFFF' : textSecondary} />
            <Text style={activeTab === 'groups' ? styles.tabActiveText : [styles.tabIdleText, { color: textSecondary }]}>Ride Groups</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('direct')}
            style={[styles.tabButton, activeTab === 'direct' ? styles.tabActive : styles.tabIdle]}
          >
            <Ionicons name="chatbubble-outline" size={12} color={activeTab === 'direct' ? '#FFFFFF' : textSecondary} />
            <Text style={activeTab === 'direct' ? styles.tabActiveText : [styles.tabIdleText, { color: textSecondary }]}>Direct</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {activeTab === 'groups' ? (
          filteredGroups.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={40} color={darkMode ? '#444444' : '#CCCCCC'} />
              <Text style={[styles.emptyTitle, { color: textSecondary }]}>No group chats yet</Text>
              <Text style={[styles.emptySubtitle, { color: darkMode ? '#555555' : '#BBBBBB' }]}>Join or create a ride to start chatting</Text>
            </View>
          ) : (
            filteredGroups.map((chat) => renderChatCard(chat, 'people'))
          )
        ) : (
          filteredDirect.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-outline" size={40} color={darkMode ? '#444444' : '#CCCCCC'} />
              <Text style={[styles.emptyTitle, { color: textSecondary }]}>No direct chats yet</Text>
              <Text style={[styles.emptySubtitle, { color: darkMode ? '#555555' : '#BBBBBB' }]}>Direct chats appear after ride interaction</Text>
            </View>
          ) : (
            filteredDirect.map((chat) => renderChatCard(chat, 'chatbubble'))
          )
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  unreadPill: {
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchRow: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1C1C1E',
  },
  tabIdle: {
    backgroundColor: 'transparent',
  },
  tabActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabIdleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  body: {
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  chatCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatIconWrap: {
    position: 'relative',
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  chatUnreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chatUnreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  chatCopy: {
    flex: 1,
    minWidth: 0,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  chatTime: {
    fontSize: 11,
  },
  chatMeta: {
    marginTop: 2,
    fontSize: 11,
  },
  chatLast: {
    marginTop: 2,
    fontSize: 12,
  },
});
