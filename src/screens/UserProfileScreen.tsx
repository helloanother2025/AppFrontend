import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/ScreenShell';
import { UserAvatar } from '../components/UserAvatar';
import { usersAPI } from '../api/users';
import { friendsAPI } from '../api/friends';
import { chatAPI } from '../api/chat';
import {
  availableRides,
  chats,
  currentUser,
  friends,
  getUserById,
  incomingJoinRequests,
  type User,
} from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { useUser } from '../context/UserContext';
import { colors } from '../theme';

const normalizeGender = (value: unknown): 'Male' | 'Female' | undefined => {
  if (!value) return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return undefined;
};

const isMockUserId = (id: string) => /^u\d+$/i.test(id);

export function UserProfileScreen() {
  const { darkMode, currentUserAvatar, isDemoMode } = useAppContext();
  const { user: authUser } = useUser();
  const { id: rawUserId } = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = useMemo(() => (Array.isArray(rawUserId) ? rawUserId[0] : rawUserId) || '', [rawUserId]);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);
  const [isRespondingToFriendRequest, setIsRespondingToFriendRequest] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [incomingFriendRequestId, setIncomingFriendRequestId] = useState<string | null>(null);
  const [isFriendFromApi, setIsFriendFromApi] = useState<boolean | null>(null);

  const localUser = getUserById(userId);
  const user = remoteUser ?? localUser;

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';
  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';

  useEffect(() => {
    let active = true;

    const loadRemoteUser = async () => {
      if (!userId || isMockUserId(userId)) {
        setRemoteUser(null);
        return;
      }

      setIsLoadingUser(true);
      try {
        const [profile, stats] = await Promise.all([
          usersAPI.getUserProfile(userId),
          usersAPI.getUserRideStats(userId),
        ]);

        if (!active || !profile) return;

        setRemoteUser({
          id: String(profile.user_id ?? profile.id ?? userId),
          user_id: String(profile.user_id ?? profile.id ?? userId),
          name: profile.name ?? 'User',
          username: profile.username ?? 'user',
          avatar: profile.avatar_url ?? profile.avatar,
          gender: normalizeGender(profile.gender),
          rating: Number(profile.avg_rating ?? profile.rating ?? 0),
          ridesCreated: Number(stats?.createdCount ?? 0),
          ridesJoined: Number(stats?.joinedCount ?? 0),
          university: profile.university ?? undefined,
          department: profile.department ?? undefined,
          bio: profile.profile_bio ?? profile.bio ?? undefined,
          phone: profile.phone ?? undefined,
          email: profile.email ?? undefined,
          facebook: profile.fb ?? undefined,
          address: profile.address ?? undefined,
        });
      } catch {
        if (!active) return;
        setRemoteUser(null);
      } finally {
        if (active) setIsLoadingUser(false);
      }
    };

    loadRemoteUser();

    return () => {
      active = false;
    };
  }, [userId]);

  const activeUserId = String(authUser?.id ?? currentUser.id);
  const backendTargetUserId = useMemo(() => {
    if (remoteUser?.user_id && /^\d+$/.test(String(remoteUser.user_id))) {
      return String(remoteUser.user_id);
    }
    if (remoteUser?.id && /^\d+$/.test(String(remoteUser.id))) {
      return String(remoteUser.id);
    }
    if (/^\d+$/.test(userId)) {
      return userId;
    }
    return '';
  }, [remoteUser?.id, remoteUser?.user_id, userId]);

  useEffect(() => {
    let active = true;

    const loadFriendState = async () => {
      if (isDemoMode || !authUser?.id || !backendTargetUserId || backendTargetUserId === activeUserId) {
        setIsFriendFromApi(null);
        setFriendRequestSent(false);
        setIncomingFriendRequestId(null);
        return;
      }

      try {
        const [friendList, sentRequests, receivedRequests] = await Promise.all([
          friendsAPI.getFriends(authUser.id),
          friendsAPI.getSentRequests(),
          friendsAPI.getReceivedRequests(),
        ]);

        if (!active) return;

        const normalizedFriends = Array.isArray(friendList) ? friendList : friendList?.friends || [];
        const alreadyFriend = normalizedFriends.some((friend: any) =>
          String(friend.user_id ?? friend.id) === backendTargetUserId
        );

        const hasPendingSentRequest = (Array.isArray(sentRequests) ? sentRequests : []).some((request: any) =>
          String(request.receiver_id ?? request.user_id ?? request.id) === backendTargetUserId &&
          String(request.current_status ?? '').toLowerCase() === 'pending'
        );

        const incomingPending = (Array.isArray(receivedRequests) ? receivedRequests : []).find((request: any) =>
          String(request.sender_id ?? request.user_id ?? request.id) === backendTargetUserId &&
          String(request.current_status ?? 'pending').toLowerCase() === 'pending'
        );

        setIsFriendFromApi(alreadyFriend);
        setIncomingFriendRequestId(incomingPending ? String(incomingPending.request_id ?? incomingPending.id) : null);
        setFriendRequestSent(!alreadyFriend && !incomingPending && hasPendingSentRequest);
      } catch {
        if (!active) return;
        setIsFriendFromApi(null);
        setIncomingFriendRequestId(null);
      }
    };

    loadFriendState();

    return () => {
      active = false;
    };
  }, [activeUserId, authUser?.id, backendTargetUserId, isDemoMode]);

  if (isLoadingUser && !user) {
    return (
      <ScreenShell scroll={false}>
        <View style={styles.notFoundWrap}>
          <ActivityIndicator color={colors.brand} size="small" />
          <Text style={[styles.notFoundText, { color: textSecondary }]}>Loading user...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!user) {
    return (
      <ScreenShell scroll={false}>
        <View style={styles.notFoundWrap}>
          <Text style={[styles.notFoundText, { color: textSecondary }]}>User not found.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.notFoundBack}>Go back</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const isSelf = String(user.id) === activeUserId;
  const mockFriend = friends.some((friend) => String(friend.id) === String(user.id));
  const isFriend = isFriendFromApi ?? mockFriend;
  const userRating = Number(user.rating ?? 0);
  const directChat = chats.find((chat) => chat.participant.id === user.id) ?? chats[0];
  const sharedRides = [...availableRides, ...incomingJoinRequests.map((request) => request.ride)].filter(
    (ride) => String(ride.creator.id) === String(user.id) || incomingJoinRequests.some((request) => String(request.requester.id) === String(user.id))
  );

  const handleAddFriend = async () => {
    if (isDemoMode) {
      Alert.alert('Demo mode', 'Sign in to send friend requests.');
      return;
    }

    if (!backendTargetUserId || !authUser?.id) {
      Alert.alert('Unable to send request', 'This profile cannot receive friend requests yet.');
      return;
    }

    if (backendTargetUserId === activeUserId) {
      return;
    }

    if (isFriend || friendRequestSent || isSendingFriendRequest) {
      return;
    }

    try {
      setIsSendingFriendRequest(true);
      await friendsAPI.sendFriendRequest(backendTargetUserId);
      setFriendRequestSent(true);
      Alert.alert('Friend request sent', `You sent a friend request to ${user.name}.`);
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || '');

      if (message.toLowerCase().includes('already exists')) {
        setFriendRequestSent(true);
        Alert.alert('Already requested', 'Friend request is already pending.');
        return;
      }

      Alert.alert('Failed to send request', message || 'Please try again.');
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  const handleConfirmFriend = async () => {
    if (!incomingFriendRequestId || isRespondingToFriendRequest) {
      return;
    }

    try {
      setIsRespondingToFriendRequest(true);
      await friendsAPI.acceptFriendRequest(incomingFriendRequestId);
      setIncomingFriendRequestId(null);
      setFriendRequestSent(false);
      setIsFriendFromApi(true);
      Alert.alert('Friend added', `You and ${user.name} are now friends.`);
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || 'Please try again.');
      Alert.alert('Failed to confirm', message);
    } finally {
      setIsRespondingToFriendRequest(false);
    }
  };

  const handleMessage = async () => {
    if (isOpeningChat) return;

    if (isDemoMode) {
      if (directChat?.id) {
        router.push({ pathname: '/(app)/chat/[id]', params: { id: String(directChat.id) } });
      } else {
        Alert.alert('Unable to open chat', 'No direct chat is available in demo mode.');
      }
      return;
    }

    if (!backendTargetUserId) {
      Alert.alert('Unable to open chat', 'This user cannot be messaged yet.');
      return;
    }

    try {
      setIsOpeningChat(true);
      const response = await chatAPI.getPrivateChat(backendTargetUserId);
      const chatId = response?.chat?.chat_id || response?.chat?.id;
      if (chatId) {
        router.push({ pathname: '/(app)/chat/[id]', params: { id: String(chatId) } });
      } else {
        Alert.alert('Unable to open chat', 'Chat could not be created.');
      }
    } catch (err: any) {
      Alert.alert('Unable to open chat', err?.message || 'Please try again.');
    } finally {
      setIsOpeningChat(false);
    }
  };

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}> 
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={textSecondary} />
          <Text style={[styles.backText, { color: textSecondary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.heroCard, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}> 
          <View style={styles.heroTop}>
            <UserAvatar
              size="lg"
              name={user.name}
              source={user.id === currentUser.id ? currentUserAvatar ?? user.avatar : user.avatar}
            />

            <View style={styles.heroCopy}>
              <Text style={[styles.name, { color: textPrimary }]}>{user.name}</Text>
              <Text style={[styles.username, { color: textSecondary }]}>@{user.username}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(userRating) ? 'star' : 'star-outline'}
                    size={13}
                    color={star <= Math.round(userRating) ? '#F59E0B' : '#D1D5DB'}
                  />
                ))}
                <Text style={[styles.ratingText, { color: textSecondary }]}>{userRating.toFixed(1)}</Text>
              </View>
            </View>

            {isFriend ? (
              <View style={styles.friendPill}>
                <Text style={styles.friendPillText}>Friend</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: textPrimary }]}>{user.ridesCreated}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Created</Text>
            </View>
            <View style={[styles.statCell, styles.statDivider, { borderLeftColor: cardBorder, borderRightColor: cardBorder }]}>
              <Text style={[styles.statValue, { color: textPrimary }]}>{user.ridesJoined}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Joined</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: textPrimary }]}>{sharedRides.length}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Related rides</Text>
            </View>
          </View>

          {!isSelf ? (
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleMessage}
                disabled={isOpeningChat}
                style={styles.messageButton}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                <Text style={styles.messageButtonText}>{isOpeningChat ? 'Opening...' : 'Message'}</Text>
              </Pressable>

              {!isFriend ? (
                <Pressable
                  style={[
                    styles.friendButton,
                    friendRequestSent ? styles.friendButtonPending : null,
                    incomingFriendRequestId ? styles.friendButtonConfirm : null,
                  ]}
                  onPress={incomingFriendRequestId ? handleConfirmFriend : handleAddFriend}
                  disabled={isSendingFriendRequest || isRespondingToFriendRequest || friendRequestSent}
                >
                  <Ionicons
                    name={incomingFriendRequestId ? 'checkmark-circle-outline' : 'person-add-outline'}
                    size={16}
                    color={incomingFriendRequestId ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[styles.friendButtonText, incomingFriendRequestId ? styles.friendButtonTextConfirm : null]}>
                    {incomingFriendRequestId
                      ? isRespondingToFriendRequest
                        ? 'Confirming...'
                        : 'Confirm'
                      : isSendingFriendRequest
                        ? 'Sending...'
                        : friendRequestSent
                          ? 'Request sent'
                          : 'Add friend'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {user.bio ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
            <Text style={styles.sectionHead}>About</Text>
            <Text style={[styles.bodyText, { color: textSecondary }]}>{user.bio}</Text>
          </View>
        ) : null}

        {user.university || user.department || user.address ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
            <Text style={styles.sectionHead}>Education</Text>

            {user.university ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="book-outline" size={14} color="#6B7280" />
                </View>
                <View style={styles.infoCopy}>
                  <Text style={[styles.infoMain, { color: textPrimary }]}>{user.university}</Text>
                  {user.department ? <Text style={[styles.infoSub, { color: textSecondary }]}>{user.department}</Text> : null}
                </View>
              </View>
            ) : null}

            {user.address ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                </View>
                <View style={styles.infoCopy}>
                  <Text style={[styles.infoMain, { color: textPrimary }]}>{user.address}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {(isSelf || isFriend) && (user.phone || user.email) ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
            <Text style={styles.sectionHead}>Contact</Text>

            {user.phone ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call-outline" size={14} color="#6B7280" />
                </View>
                <View style={styles.infoCopy}>
                  <Text style={[styles.infoMain, { color: textPrimary }]}>{user.phone}</Text>
                </View>
              </View>
            ) : null}

            {user.email ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail-outline" size={14} color="#6B7280" />
                </View>
                <View style={styles.infoCopy}>
                  <Text style={[styles.infoMain, { color: textPrimary }]}>{user.email}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}> 
          <View style={styles.genderRow}>
            <Text style={[styles.genderLabel, { color: textSecondary }]}>Gender</Text>
            <Text style={[styles.genderValue, { color: textPrimary }]}>{user.gender}</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    paddingBottom: 24,
  },
  heroCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  username: {
    fontSize: 13,
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 11,
  },
  friendPill: {
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  friendPillText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  messageButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  friendButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
  },
  friendButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  friendButtonTextConfirm: {
    color: '#FFFFFF',
  },
  friendButtonPending: {
    backgroundColor: '#F3F4F6',
  },
  friendButtonConfirm: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  sectionHead: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
  },
  infoMain: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoSub: {
    marginTop: 1,
    fontSize: 11,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genderLabel: {
    fontSize: 13,
  },
  genderValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notFoundText: {
    fontSize: 14,
  },
  notFoundBack: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
});
