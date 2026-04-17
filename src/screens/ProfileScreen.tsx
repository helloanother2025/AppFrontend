
// ...existing imports...
import { useCallback } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenShell } from '../components/ScreenShell';
import { UserAvatar } from '../components/UserAvatar';
import { useAppContext } from '../context/AppContext';
import { useUser } from '../context/UserContext';
import { friendsAPI } from '../api/friends';
import { usersAPI } from '../api/users';
import { feedbackAPI } from '../api/feedback';
import { currentUser } from '../utils/rideMapper';

type ProfileTab = 'info' | 'rides' | 'friends';

export function ProfileScreen() {
  // Add Friends modal state and logic (move up for useEffect ordering)
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [addFriendsSearch, setAddFriendsSearch] = useState('');
  const [addFriendsResults, setAddFriendsResults] = useState<any[]>([]);
  const [addFriendsLoading, setAddFriendsLoading] = useState(false);
  const [addFriendStatus, setAddFriendStatus] = useState<{ [userId: string]: 'idle' | 'loading' | 'sent' }>({});

  // Requests modal data
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Fetch requests when modal opens
  useEffect(() => {
    if (!showAddFriendsModal) return;
    setRequestsLoading(true);
    Promise.all([
      friendsAPI.getReceivedRequests(),
      friendsAPI.getSentRequests(),
    ])
      .then(([received, sent]) => {
        setReceivedRequests(Array.isArray(received) ? received : []);
        setSentRequests(Array.isArray(sent) ? sent : []);
      })
      .catch(() => {
        setReceivedRequests([]);
        setSentRequests([]);
      })
      .finally(() => setRequestsLoading(false));
  }, [showAddFriendsModal]);
  const {
    currentUserAvatar,
    setCurrentUserAvatar,
    darkMode,
    toggleDarkMode,
    isDemoMode,
    setIsDemoMode,
    notificationPreferences,
    updateNotificationPreferences,
  } = useAppContext();
  const { user, logout } = useUser();
  const liveUser = user ?? currentUser;
  const rideStatsUser = liveUser as any;
  const rating = liveUser.rating ?? 0;

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [friendList, setFriendList] = useState<any[]>([]);
  const [receivedFeedback, setReceivedFeedback] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Requests modal tab state
  const [requestsTab, setRequestsTab] = useState<'received' | 'sent'>('received');


  const searchUsers = useCallback(async (query: string) => {
    setAddFriendsLoading(true);
    try {
      const res = await usersAPI.searchUsers(query);
      setAddFriendsResults(Array.isArray(res) ? res : res?.users || []);
    } catch {
      setAddFriendsResults([]);
    } finally {
      setAddFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showAddFriendsModal) return;
    if (!addFriendsSearch) {
      setAddFriendsResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchUsers(addFriendsSearch);
    }, 400);
    return () => clearTimeout(timeout);
  }, [addFriendsSearch, showAddFriendsModal, searchUsers]);

  const refetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const [received, sent] = await Promise.all([
        friendsAPI.getReceivedRequests(),
        friendsAPI.getSentRequests(),
      ]);
      setReceivedRequests(Array.isArray(received) ? received : []);
      setSentRequests(Array.isArray(sent) ? sent : []);
    } catch {
      setReceivedRequests([]);
      setSentRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    setAddFriendStatus((prev) => ({ ...prev, [userId]: 'loading' }));
    try {
      await friendsAPI.sendFriendRequest(userId);
      setAddFriendStatus((prev) => ({ ...prev, [userId]: 'sent' }));
      await refetchRequests();
    } catch {
      setAddFriendStatus((prev) => ({ ...prev, [userId]: 'idle' }));
    }
  };

  useEffect(() => {
    setBio((liveUser as any).bio || '');
    setPhone(liveUser.phone || '');
  }, [liveUser]);

  useEffect(() => {
    let active = true;

    const loadProfileData = async () => {
      if (isDemoMode || !user?.id) {
        setFriendList([]);
        setReceivedFeedback([]);
        return;
      }

      setFeedbackLoading(true);

      try {
        const [friendResponse, fallbackFriendResponse, statsResponse, profileResponse, feedbackResponse] = await Promise.allSettled([
          usersAPI.getMyFriends(),
          friendsAPI.getFriends(user.id),
          usersAPI.getUserRideStats(user.id),
          usersAPI.getCurrentUser(),
          feedbackAPI.getUserFeedback(user.id),
        ]);

        if (!active) return;

        const resolvedFriendPayload =
          friendResponse.status === 'fulfilled'
            ? friendResponse.value
            : fallbackFriendResponse.status === 'fulfilled'
              ? fallbackFriendResponse.value
              : [];
        setFriendList(Array.isArray(resolvedFriendPayload) ? resolvedFriendPayload : resolvedFriendPayload?.friends || []);

        if (profileResponse.status === 'fulfilled') {
          setBio(profileResponse.value.profile_bio || profileResponse.value.bio || '');
          setPhone(profileResponse.value.phone || '');
        }

        if (feedbackResponse.status === 'fulfilled') {
          setReceivedFeedback(Array.isArray(feedbackResponse.value) ? feedbackResponse.value : []);
        } else {
          setReceivedFeedback([]);
        }

        if (statsResponse.status === 'fulfilled' && statsResponse.value) {
          // keep the existing UI structure; stats are read from the backend response when available
        }
      } catch {
        if (active) {
          setFriendList([]);
          setReceivedFeedback([]);
        }
      } finally {
        if (active) {
          setFeedbackLoading(false);
        }
      }
    };

    loadProfileData();

    return () => {
      active = false;
    };
  }, [isDemoMode, user]);

  const bg = darkMode ? '#0A0A0A' : '#F5F5F7';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? '#2A2A2A' : '#EEEEEE';
  const textPrimary = darkMode ? '#F5F5F5' : '#111111';
  const textSecondary = darkMode ? '#888888' : '#666666';
  const statBg = darkMode ? '#111111' : '#F5F5F7';
  const surface = darkMode ? '#1A1A1A' : '#FFFFFF';
  const surfaceMuted = darkMode ? '#111111' : '#FFFFFF';

  const handleLogout = async () => {
    setCurrentUserAvatar(null);
    setIsDemoMode(false);
    await logout();
    router.replace('/Login');
  };

  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setCurrentUserAvatar(result.assets[0].uri);
    }

    setShowAvatarOptions(false);
  };

  const handleSave = () => {
    setEditing(false);
  };

  const infoRows = [
    { icon: 'call-outline', label: 'Phone', value: phone, editable: true },
    { icon: 'mail-outline', label: 'Email', value: liveUser.email || '', editable: false },
    { icon: 'logo-facebook', label: 'Facebook', value: (liveUser as any).facebook || (liveUser as any).fb || '', editable: false },
    { icon: 'book-outline', label: 'University', value: `${liveUser.university || ''}${liveUser.department ? ` · ${liveUser.department}` : ''}`, editable: false },
    { icon: 'location-outline', label: 'Address', value: liveUser.address || '', editable: false },
    { icon: 'shield-checkmark-outline', label: 'Student ID', value: (liveUser as any).studentId || '', editable: false },
  ];

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.root, { backgroundColor: bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.hero, { backgroundColor: card, borderBottomColor: border }]}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatarWrap}>
                <Pressable onPress={() => setShowAvatarOptions(true)}>
                  <UserAvatar size={72} name={liveUser.name} source={currentUserAvatar || liveUser.avatar || undefined} />
                  <View style={[styles.cameraBadge, { borderColor: card }]}>
                    <Ionicons name="camera" size={12} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>

              <View style={styles.heroInfo}>
                <Text style={[styles.nameText, { color: textPrimary }]}>{isDemoMode ? 'Guest' : liveUser.name}</Text>
                <Text style={[styles.usernameText, { color: textSecondary }]}>@{liveUser.username}</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(rating) ? 'star' : 'star-outline'}
                      size={13}
                      color={star <= Math.round(rating) ? '#E83950' : darkMode ? '#444444' : '#DDDDDD'}
                    />
                  ))}
                  <Text style={[styles.ratingValue, { color: textSecondary }]}>{rating}</Text>
                </View>
              </View>

              <View style={styles.heroActions}>
                <Pressable onPress={() => setEditing((prev) => !prev)} style={[styles.actionIconButton, { backgroundColor: statBg }]}> 
                  <Ionicons name="create-outline" size={16} color={textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.statsGrid, { backgroundColor: statBg }]}> 
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: textPrimary }]}>{rideStatsUser.totalRides ?? rideStatsUser.ridesCreated ?? 0}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Created</Text>
              </View>
              <View style={[styles.statCell, { borderLeftColor: border, borderRightColor: border, borderLeftWidth: 1, borderRightWidth: 1 }]}> 
                <Text style={[styles.statValue, { color: textPrimary }]}>{(liveUser as any).ridesJoined ?? 0}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Joined</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: textPrimary }]}>{friendList.length}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Friends</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabsWrap}>
            <View style={[styles.tabsRow, { backgroundColor: darkMode ? '#1A1A1A' : '#EBEBEB' }]}>
              {(['info', 'rides', 'friends'] as const).map((tab) => (
                <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabButton, activeTab === tab ? styles.tabButtonActive : null]}>
                  <Text style={[styles.tabText, { color: activeTab === tab ? '#FFFFFF' : textSecondary, fontWeight: activeTab === tab ? '600' : '400' }]}>
                    {tab === 'info' ? 'Info' : tab === 'rides' ? 'My Rides' : 'Friends'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'info' ? (
              <View style={styles.sectionStack}>
                <View style={[styles.cardPanel, { backgroundColor: card, borderColor: border }]}> 
                  <Text style={[styles.smallUpper, { color: textSecondary }]}>Bio</Text>
                  {editing ? (
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      style={[styles.bioInput, { backgroundColor: statBg, color: textPrimary, borderColor: border }]}
                    />
                  ) : (
                    <Text style={[styles.bioText, { color: textPrimary }]}>{bio || 'No bio yet.'}</Text>
                  )}
                </View>

                <View style={[styles.cardPanel, { backgroundColor: card, borderColor: border, paddingVertical: 0 }]}> 
                  {infoRows
                    .filter((row) => row.value)
                    .map((row, index) => (
                      <View key={row.label} style={[styles.infoRow, index < infoRows.length - 1 ? { borderBottomWidth: 1, borderBottomColor: border } : null]}>
                        <View style={[styles.infoIconWrap, { backgroundColor: statBg }]}> 
                          <Ionicons name={row.icon as any} size={14} color={textSecondary} />
                        </View>
                        {editing && row.editable ? (
                          <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            style={[styles.infoInput, { color: textPrimary, borderColor: border }]}
                          />
                        ) : (
                          <Text style={[styles.infoText, { color: textPrimary }]}>{row.value}</Text>
                        )}
                      </View>
                    ))}
                </View>

                {editing ? (
                  <Pressable onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </Pressable>
                ) : null}

                <View style={[styles.cardPanel, { backgroundColor: card, borderColor: border, paddingVertical: 0 }]}> 
                  <Pressable onPress={toggleDarkMode} style={[styles.settingRow, { borderBottomColor: border }]}> 
                    <View style={styles.settingLeft}>
                      <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={18} color={darkMode ? '#F5C542' : textSecondary} />
                      <Text style={[styles.settingText, { color: textPrimary }]}>{darkMode ? 'Light Mode' : 'Dark Mode'}</Text>
                    </View>
                    <View style={[styles.toggleTrack, { backgroundColor: darkMode ? '#E83950' : '#E5E5E5' }]}>
                      <View style={[styles.toggleDot, { transform: [{ translateX: darkMode ? 20 : 0 }] }]} />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => updateNotificationPreferences({ muteRideUpdates: !notificationPreferences.muteRideUpdates })}
                    style={[styles.settingRow, { borderBottomColor: border }]}
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons name="car-outline" size={18} color={textSecondary} />
                      <Text style={[styles.settingText, { color: textPrimary }]}>Mute Ride Updates</Text>
                    </View>
                    <View style={[styles.toggleTrack, { backgroundColor: notificationPreferences.muteRideUpdates ? '#E83950' : '#E5E5E5' }]}> 
                      <View style={[styles.toggleDot, { transform: [{ translateX: notificationPreferences.muteRideUpdates ? 20 : 0 }] }]} />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => updateNotificationPreferences({ muteChatNotifications: !notificationPreferences.muteChatNotifications })}
                    style={[styles.settingRow, { borderBottomColor: border }]}
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons name="chatbubble-outline" size={18} color={textSecondary} />
                      <Text style={[styles.settingText, { color: textPrimary }]}>Mute Chat Notifications</Text>
                    </View>
                    <View style={[styles.toggleTrack, { backgroundColor: notificationPreferences.muteChatNotifications ? '#E83950' : '#E5E5E5' }]}> 
                      <View style={[styles.toggleDot, { transform: [{ translateX: notificationPreferences.muteChatNotifications ? 20 : 0 }] }]} />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => updateNotificationPreferences({ mutePaymentReminders: !notificationPreferences.mutePaymentReminders })}
                    style={[styles.settingRow, { borderBottomColor: border }]}
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons name="card-outline" size={18} color={textSecondary} />
                      <Text style={[styles.settingText, { color: textPrimary }]}>Mute Payment Reminders</Text>
                    </View>
                    <View style={[styles.toggleTrack, { backgroundColor: notificationPreferences.mutePaymentReminders ? '#E83950' : '#E5E5E5' }]}> 
                      <View style={[styles.toggleDot, { transform: [{ translateX: notificationPreferences.mutePaymentReminders ? 20 : 0 }] }]} />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push({ pathname: '/(app)/legal', params: { type: 'terms' } })}
                    style={[styles.settingRow, { borderBottomColor: border }]}
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons name="document-text-outline" size={18} color={textSecondary} />
                      <Text style={[styles.settingText, { color: textPrimary }]}>Terms of Use</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                  </Pressable>

                  <Pressable
                    onPress={() => router.push({ pathname: '/(app)/legal', params: { type: 'privacy' } })}
                    style={[styles.settingRow, { borderBottomColor: border }]}
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons name="shield-outline" size={18} color={textSecondary} />
                      <Text style={[styles.settingText, { color: textPrimary }]}>Privacy Policy</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                  </Pressable>

                  <Pressable
                    onPress={() => router.push({ pathname: '/(app)/legal', params: { type: 'safety' } })}
                    style={[styles.settingRow, { borderBottomColor: border }]}
                  >
                    <View style={styles.settingLeft}>
                      <Ionicons name="warning-outline" size={18} color={textSecondary} />
                      <Text style={[styles.settingText, { color: textPrimary }]}>Safety Guidelines</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                  </Pressable>

                  <Pressable onPress={handleLogout} style={styles.settingRow}> 
                    <View style={styles.settingLeft}>
                      <Ionicons name="log-out-outline" size={18} color="#E83950" />
                      <Text style={styles.logoutText}>Log out</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {activeTab === 'rides' ? (
              <View style={styles.sectionStack}>
                <Pressable onPress={() => router.push('/(app)/ride-status')} style={[styles.rideCard, { backgroundColor: card, borderColor: border }]}> 
                  <View>
                    <Text style={[styles.rideCardTitle, { color: textPrimary }]}>View All Rides</Text>
                    <Text style={[styles.rideCardSub, { color: textSecondary }]}>{currentUser.ridesCreated} created · {currentUser.ridesJoined} joined</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={textSecondary} />
                </Pressable>

                <View style={[styles.cardPanel, { backgroundColor: card, borderColor: border }]}> 
                  <Text style={[styles.smallUpper, { color: textSecondary }]}>Received Feedback</Text>

                  {feedbackLoading ? (
                    <Text style={[styles.feedbackMeta, { color: textSecondary }]}>Loading feedback...</Text>
                  ) : receivedFeedback.length === 0 ? (
                    <Text style={[styles.feedbackMeta, { color: textSecondary }]}>No feedback yet.</Text>
                  ) : (
                    receivedFeedback.slice(0, 5).map((item) => (
                      <View key={String(item.id)} style={[styles.feedbackItem, { borderBottomColor: border }]}> 
                        <View style={styles.feedbackHeaderRow}>
                          <Text style={[styles.feedbackReviewer, { color: textPrimary }]}>
                            {item.reviewer_name || `User #${item.reviewer_id}`}
                          </Text>
                          <View style={styles.feedbackRatingRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= Number(item.rating || 0) ? 'star' : 'star-outline'}
                                size={11}
                                color={star <= Number(item.rating || 0) ? '#E83950' : '#D1D5DB'}
                              />
                            ))}
                          </View>
                        </View>

                        {item.review ? (
                          <Text style={[styles.feedbackBody, { color: textSecondary }]}>{item.review}</Text>
                        ) : (
                          <Text style={[styles.feedbackBody, { color: textSecondary }]}>No comment provided.</Text>
                        )}

                        <Text style={[styles.feedbackMeta, { color: textSecondary }]}>
                          {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Unknown date'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {activeTab === 'friends' ? (
              <View style={styles.sectionStack}>
                {friendList.map((friend) => (
                  <Pressable
                    key={friend.user_id || friend.id}
                    style={[styles.friendCard, { backgroundColor: card, borderColor: border }]}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/user/[id]',
                        params: { id: String(friend.user_id || friend.id || '') },
                      })
                    }
                  >
                    <UserAvatar name={friend.name} size={42} source={friend.avatar_url || friend.avatar || undefined} />
                    <View style={styles.friendCopy}>
                      <Text style={[styles.friendName, { color: textPrimary }]}>{friend.name}</Text>
                      <Text style={[styles.friendUsername, { color: textSecondary }]}>@{friend.username}</Text>
                    </View>
                    <View style={styles.friendRatingWrap}>
                      <Ionicons name="star" size={12} color="#E83950" />
                      <Text style={[styles.friendRatingText, { color: textSecondary }]}>{friend.avg_rating ?? friend.rating ?? 0}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={textSecondary} />
                  </Pressable>
                ))}

                <Pressable
                  style={[styles.addFriendsButton, { borderColor: border, backgroundColor: darkMode ? surfaceMuted : '#FFFFFF' }]}
                  onPress={() => setShowAddFriendsModal(true)}
                >
                  <Text style={[styles.addFriendsText, { color: textSecondary }]}>Requests</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Requests Modal */}
        <Modal
          visible={!!showAddFriendsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddFriendsModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.addFriendsSheet, { backgroundColor: card }]}> 
              <View style={[styles.sheetGrabber, { backgroundColor: border }]} />
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>Friend Requests</Text>
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <Pressable
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: requestsTab === 'received' ? '#8B5CF6' : 'transparent' }}
                  onPress={() => setRequestsTab('received')}
                >
                  <Text style={{ color: requestsTab === 'received' ? textPrimary : textSecondary, fontWeight: requestsTab === 'received' ? '600' : '400' }}>Received</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: requestsTab === 'sent' ? '#8B5CF6' : 'transparent' }}
                  onPress={() => setRequestsTab('sent')}
                >
                  <Text style={{ color: requestsTab === 'sent' ? textPrimary : textSecondary, fontWeight: requestsTab === 'sent' ? '600' : '400' }}>Sent</Text>
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 320 }}>
                {requestsLoading ? (
                  <Text style={{ color: textSecondary, marginTop: 16 }}>Loading...</Text>
                ) : requestsTab === 'received' ? (
                  receivedRequests.length === 0 ? (
                    <Text style={{ color: textSecondary, marginTop: 16 }}>No received requests.</Text>
                  ) : (
                    receivedRequests.map((req, idx) => (
                      <View key={req.id || `received-${idx}`} style={styles.suggestedUserRow}>
                        <UserAvatar name={req.sender?.name || req.name} size={36} source={req.sender?.avatar || req.avatar || undefined} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: textPrimary, fontWeight: '600' }}>{req.sender?.name || req.name}</Text>
                          <Text style={{ color: textSecondary, fontSize: 12 }}>@{req.sender?.username || req.username}</Text>
                        </View>
                        {/* Accept/Decline buttons can be added here */}
                      </View>
                    ))
                  )
                ) : (
                  sentRequests.length === 0 ? (
                    <Text style={{ color: textSecondary, marginTop: 16 }}>No sent requests.</Text>
                  ) : (
                    sentRequests.map((req, idx) => (
                      <View key={req.id || `sent-${idx}`} style={styles.suggestedUserRow}>
                        <UserAvatar name={req.receiver?.name || req.name} size={36} source={req.receiver?.avatar || req.avatar || undefined} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: textPrimary, fontWeight: '600' }}>{req.receiver?.name || req.name}</Text>
                          <Text style={{ color: textSecondary, fontSize: 12 }}>@{req.receiver?.username || req.username}</Text>
                        </View>
                        <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>Pending</Text>
                      </View>
                    ))
                  )
                )}
              </ScrollView>
              <Pressable onPress={() => setShowAddFriendsModal(false)} style={styles.sheetCancelButton}>
                <Text style={[styles.sheetCancelText, { color: textSecondary }]}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showAvatarOptions} transparent animationType="slide" onRequestClose={() => setShowAvatarOptions(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.avatarSheet, { backgroundColor: card }]}> 
              <View style={[styles.sheetGrabber, { backgroundColor: border }]} />
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>Profile Picture</Text>
              <View style={styles.sheetAvatarWrap}>
                <UserAvatar size={72} name={currentUser.name} source={currentUserAvatar || undefined} />
              </View>

              <Pressable onPress={handleAvatarPick} style={styles.sheetPrimaryButton}>
                <Text style={styles.sheetPrimaryButtonText}>Choose from Gallery</Text>
              </Pressable>

              {currentUserAvatar ? (
                <Pressable
                  onPress={() => {
                    setCurrentUserAvatar(null);
                    setShowAvatarOptions(false);
                  }}
                  style={styles.sheetDangerButton}
                >
                  <Text style={styles.sheetDangerButtonText}>Remove photo</Text>
                </Pressable>
              ) : null}

              <Pressable onPress={() => setShowAvatarOptions(false)} style={styles.sheetCancelButton}>
                <Text style={[styles.sheetCancelText, { color: textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  hero: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#E83950',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  heroInfo: {
    flex: 1,
    minHeight: 72,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  usernameText: {
    marginTop: 2,
    fontSize: 13,
  },
  ratingRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingValue: {
    marginLeft: 4,
    fontSize: 12,
  },
  heroActions: {
    gap: 6,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1C1C1E',
  },
  tabText: {
    fontSize: 12,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionStack: {
    gap: 10,
  },
  cardPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  smallUpper: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#E83950',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 14,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  logoutText: {
    color: '#E83950',
    fontSize: 14,
    fontWeight: '500',
  },
  rideCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rideCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rideCardSub: {
    marginTop: 2,
    fontSize: 12,
  },
  createRideButton: {
    borderWidth: 2,
    borderColor: '#E83950',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createRideButtonText: {
    color: '#E83950',
    fontSize: 14,
    fontWeight: '600',
  },
  friendCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendCopy: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
  },
  friendUsername: {
    marginTop: 2,
    fontSize: 12,
  },
  friendRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  friendRatingText: {
    fontSize: 12,
  },
  feedbackItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedbackReviewer: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  feedbackRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  feedbackBody: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  feedbackMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  addFriendsButton: {
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  addFriendsText: {
    fontSize: 12,
  },
  addFriendsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 320,
    maxHeight: 520,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#F5F5F7',
  },
  suggestedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    gap: 8,
  },
  addFriendButton: {
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  avatarSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetGrabber: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  sheetAvatarWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetPrimaryButton: {
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sheetDangerButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E83950',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetDangerButtonText: {
    color: '#E83950',
    fontSize: 14,
    fontWeight: '500',
  },
  sheetCancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetCancelText: {
    fontSize: 14,
  },
});
