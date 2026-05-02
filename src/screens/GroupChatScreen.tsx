import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/ScreenShell';
import { UserAvatar } from '../components/UserAvatar';
import { InCallModal } from '../components/InCallModal';
import { RemoveAndReportModal } from '../components/RemoveAndReportModal';
import { ridesAPI } from '../api/rides';
import { useAppContext } from '../context/AppContext';
import { currentUser, type User } from '../utils/rideMapper';
import { useUser } from '../context/UserContext';
import { chatAPI } from '../api/chat';
import { colors } from '../theme';


export function GroupChatScreen() {
  const { groupChats, markChatRead, sendGroupMessage, darkMode, blockedUsers, blockUser, reportMessage, isDemoMode } = useAppContext();
  const { user } = useUser();
  const [messageText, setMessageText] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; senderId: string } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const reportReasons = ['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'];
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [callingUser, setCallingUser] = useState<User | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<any[]>([]);
  const [remoteMessages, setRemoteMessages] = useState<any[]>([]);
  const [remoteRideName, setRemoteRideName] = useState<string>('Group chat');
  const [remoteRideStatus, setRemoteRideStatus] = useState<string>('active');
  const [remoteRideId, setRemoteRideId] = useState<string | null>(null);
  const [loadingRemoteChat, setLoadingRemoteChat] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<any>(null);
  const [removalLoading, setRemovalLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const params = useLocalSearchParams<{ chatId?: string; id?: string }>();
  const resolvedChatId = String(params.id || params.chatId || '');
  const chat = useMemo(() => groupChats.find((item) => String(item.id) === resolvedChatId) ?? groupChats[0], [resolvedChatId, groupChats]);

  // Determine chat state: fallback to 'active' (no state property on chat)
  const chatState = 'active';
  const activeUserId = String(user?.id ?? currentUser.id);

  const participants = isDemoMode ? (chat?.participants ?? []) : remoteParticipants;
  const messages = isDemoMode ? (chat?.messages ?? []) : remoteMessages;
  const rideName = isDemoMode ? (chat?.rideName || 'Group chat') : remoteRideName;

  const myParticipant = participants.find((p: any) => p.id === activeUserId);
  const isCreator = Boolean(myParticipant && String(myParticipant.rideStatus || myParticipant.role || '') === 'creator');
  // Use membershipStatus if available, else fallback to rideStatus
  const isExcluded = myParticipant && ['cancelled', 'removed', 'rejected', 'left', 'removed_passenger'].includes(myParticipant.membershipStatus || myParticipant.rideStatus);
  // Use backend ride status for read-only logic
  const rideStatus = isDemoMode ? 'active' : remoteRideStatus;
  const isReadOnly = ['completed', 'cancelled'].includes(rideStatus) || !!isExcluded;

  const loadRemoteChat = useCallback(async () => {
    if (isDemoMode || !resolvedChatId) {
      setRemoteParticipants([]);
      setRemoteMessages([]);
      setRemoteRideName(chat?.rideName || 'Group chat');
      setRemoteRideStatus('active');
      setRemoteRideId(chat?.rideId ? String(chat.rideId) : null);
      return;
    }

    setLoadingRemoteChat(true);
    try {
      const [chatResponse, messageResponse] = await Promise.all([
        chatAPI.getChat(resolvedChatId),
        chatAPI.getMessages(resolvedChatId),
      ]);

      const normalizedParticipants = (chatResponse?.participants ?? []).map((participant: any) => ({
        id: String(participant.participant_id ?? participant.user_id ?? participant.id),
        name: participant.name || 'User',
        username: participant.username || 'user',
        avatar: participant.avatar_url ?? participant.avatar,
        rideStatus: participant.ride_status,
        role: participant.role,
        membershipStatus: participant.membership_status, // backend may provide this
      }));

      const normalizedMessages = (messageResponse?.messages ?? []).map((message: any) => ({
        id: String(message.message_id ?? message.id),
        senderId: String(message.sender_id ?? message.senderId),
        text: message.content ?? message.text ?? '',
        time: message.created_at ?? message.time ?? '',
        read: Boolean(message.is_read ?? message.read),
        reported: Boolean(message.reported),
      }));

      setRemoteParticipants(normalizedParticipants);
      setRemoteMessages(normalizedMessages);
      setRemoteRideName(chat?.rideName || chatResponse?.chat?.title || `Ride Chat #${resolvedChatId}`);
      setRemoteRideStatus(chatResponse?.rideStatus || chatResponse?.ride_status || 'active');
      setRemoteRideId(chatResponse?.chat?.ride_id ? String(chatResponse.chat.ride_id) : (chat?.rideId ? String(chat.rideId) : null));
    } catch {
      setRemoteParticipants([]);
      setRemoteMessages([]);
      setRemoteRideName(chat?.rideName || 'Group chat');
      setRemoteRideStatus('active');
      setRemoteRideId(chat?.rideId ? String(chat.rideId) : null);
    } finally {
      setLoadingRemoteChat(false);
    }
  }, [chat?.rideId, chat?.rideName, isDemoMode, resolvedChatId]);

  useEffect(() => {
    loadRemoteChat();
  }, [loadRemoteChat]);

  const openParticipants = useCallback(async () => {
    setShowParticipants(true);
    // Fetch fresh members when user explicitly opens the member sheet.
    await loadRemoteChat();
  }, [loadRemoteChat]);

  useEffect(() => {
    if (chat?.id) {
      markChatRead(chat.id);
    }
  }, [chat?.id, markChatRead]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = async () => {
    if (isReadOnly) return;
    const chatIdToUse = resolvedChatId || chat?.id;
    if (!chatIdToUse) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;

    if (isDemoMode) {
      sendGroupMessage(String(chatIdToUse), trimmed, activeUserId);
    } else {
      const now = new Date();
      const optimisticMessage = {
        id: `gm_${Date.now()}`,
        senderId: activeUserId,
        text: trimmed,
        time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        read: false,
      };

      setRemoteMessages((previous) => [...previous, optimisticMessage]);

      try {
        const response = await chatAPI.sendMessage(String(chatIdToUse), trimmed);
        const created = response?.message;
        if (created) {
          setRemoteMessages((previous) =>
            previous.map((message) =>
              message.id === optimisticMessage.id
                ? {
                    id: String(created.message_id ?? created.id),
                    senderId: String(created.sender_id ?? activeUserId),
                    text: created.content ?? trimmed,
                    time: created.created_at ?? optimisticMessage.time,
                    read: Boolean(created.is_read),
                  }
                : message
            )
          );
        }
      } catch {
        setRemoteMessages((previous) => previous.filter((message) => message.id !== optimisticMessage.id));
      }
    }

    setMessageText('');
  };

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111111';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#666666';
  const card = darkMode ? '#1A1A1A' : '#FFFFFF';
  const border = darkMode ? '#2A2A2A' : '#E5E7EB';
  const inputBg = darkMode ? '#1A1A1A' : '#F5F5F7';

  const isBlocked = (userId: string) => blockedUsers.includes(userId);

  return (
    <ScreenShell scroll={false}>
      {/* Read-only banner */}
      {isReadOnly && (
        <View style={{ backgroundColor: '#FFF3CD', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FFD966' }}>
          <Text style={{ color: '#856404', fontWeight: '600', fontSize: 13 }}>Ride completed – this chat is now read-only</Text>
        </View>
      )}
      <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}> 
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={textPrimary} />
        </Pressable>

        <View style={styles.groupIcon}>
          <Ionicons name="people" size={16} color="#FFFFFF" />
        </View>

        <View style={styles.headerCopy}>
          <Text style={[styles.headerName, { color: textPrimary }]} numberOfLines={1}>{rideName || 'Group chat'}</Text>
          <Pressable onPress={openParticipants}>
            <Text style={styles.membersHint}>{participants.length ?? 0} members · tap to view</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setCallingUser(participants.find((participant) => participant.id !== activeUserId) ?? null)}
          style={[styles.iconButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}
        >
          <Ionicons name="call-outline" size={15} color={textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => setShowMenu((previous) => !previous)}
          style={[styles.iconButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}
        >
          <Ionicons name="ellipsis-vertical" size={15} color={textSecondary} />
        </Pressable>
      </View>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuSheet, { backgroundColor: card, borderColor: border }]}> 
            <Pressable
              style={[styles.menuItem, { borderBottomColor: border }]}
              onPress={() => {
                setShowMenu(false);
                openParticipants();
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color={textSecondary} />
              <Text style={[styles.menuItemText, { color: textPrimary }]}>Group info</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/(app)/ride-details');
              }}
            >
              <Ionicons name="shield-outline" size={16} color={textSecondary} />
              <Text style={[styles.menuItemText, { color: textPrimary }]}>View ride</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.datePillWrap}>
            <View style={[styles.datePill, { backgroundColor: darkMode ? '#2A2A2A' : '#EBEBEB' }]}>
              <Text style={[styles.datePillText, { color: textSecondary }]}>Today</Text>
            </View>
          </View>

          {messages.map((message) => {
            const mine = String(message.senderId) === activeUserId;
            const sender = participants.find((participant) => String(participant.id) === String(message.senderId));
            const senderBlocked = sender ? isBlocked(sender.id) : false;

            if (!mine && senderBlocked) {
              return (
                <View key={message.id} style={styles.msgRowOther}>
                  <View style={[styles.hiddenMessage, { backgroundColor: darkMode ? '#2A2A2A' : '#F0F0F0' }]}> 
                    <Text style={[styles.hiddenMessageText, { color: textSecondary }]}>Message hidden - user blocked</Text>
                  </View>
                </View>
              );
            }

            if (!mine && message.reported) {
              return (
                <View key={message.id} style={styles.msgRowOther}>
                  <View style={[styles.hiddenMessage, { backgroundColor: darkMode ? '#2A2A2A' : '#F0F0F0' }]}> 
                    <Text style={[styles.hiddenMessageText, { color: textSecondary }]}>Message reported and hidden</Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={message.id} style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowOther]}>
                {!mine ? (
                  <View style={styles.otherAvatarWrap}>
                    <UserAvatar size="sm" name={sender?.name || 'User'} source={sender?.avatar ?? undefined} />
                  </View>
                ) : null}

                <View style={styles.msgContentWrap}>
                  {!mine && sender ? <Text style={styles.senderName}>{sender.name.split(' ')[0]}</Text> : null}
                  <Pressable
                    onLongPress={() => {
                      if (!mine && sender) {
                        setSelectedMessage({ id: message.id, senderId: sender.id });
                      }
                    }}
                    delayLongPress={400}
                    style={[
                      styles.messageBubble,
                      mine
                        ? { backgroundColor: colors.brand, borderBottomRightRadius: 4 }
                        : { backgroundColor: card, borderColor: border, borderWidth: 1, borderBottomLeftRadius: 4 },
                    ]}
                  >
                    <Text style={[styles.messageText, { color: mine ? '#FFFFFF' : textPrimary }]}>{message.text}</Text>
                  </Pressable>
                  <Text style={[styles.messageTime, { color: textSecondary, textAlign: mine ? 'right' : 'left' }]}>
                    {message.time}
                    {mine ? ` ${message.read ? '✓✓' : '✓'}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: card, borderTopColor: border, opacity: isReadOnly ? 0.5 : 1 }]}> 
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={isReadOnly ? "Chat is read-only" : "Message the group..."}
            placeholderTextColor="#9CA3AF"
            style={[styles.composerInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
            multiline
            editable={!isReadOnly}
          />
          <Pressable
            onPress={handleSend}
            disabled={!messageText.trim() || isReadOnly}
            style={[styles.sendButton, { backgroundColor: (!messageText.trim() || isReadOnly) ? (darkMode ? '#2A2A2A' : '#E5E5E5') : colors.brand }]}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showParticipants} transparent animationType="slide" onRequestClose={() => setShowParticipants(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: card }]}> 
            <View style={[styles.sheetHandle, { backgroundColor: border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>Group Members ({participants.length ?? 0})</Text>
              <Pressable onPress={() => setShowParticipants(false)}>
                <Ionicons name="close" size={20} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
              {loadingRemoteChat && participants.length === 0 ? (
                <Text style={[styles.memberUsername, { color: textSecondary }]}>Loading members...</Text>
              ) : null}
              {participants.map((participant) => (
                <View key={participant.id} style={styles.memberRow}>
                  <UserAvatar size="md" name={participant.name} source={participant.avatar ?? undefined} />
                  <View style={styles.memberCopy}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: textPrimary }]}>{participant.name}</Text>
                      {String(participant.id) === activeUserId ? <Text style={styles.youPill}>You</Text> : null}
                    </View>
                    <View style={styles.memberSubtitleRow}>
                      <Text style={[styles.memberUsername, { color: textSecondary }]}>@{participant.username}</Text>
                      {participant.rideStatus && (
                        <Text style={[
                          styles.memberStatusPill, 
                          { 
                            backgroundColor: participant.rideStatus === 'creator' || participant.rideStatus === 'accepted' ? 'rgba(46,196,182,0.1)' : 'rgba(232,57,80,0.1)',
                            color: participant.rideStatus === 'creator' || participant.rideStatus === 'accepted' ? '#2EC4B6' : '#E83950',
                          }
                        ]}>
                          {participant.rideStatus}
                        </Text>
                      )}
                    </View>
                  </View>
                  {String(participant.id) !== activeUserId ? (
                    <View style={styles.memberActions}>
                      <Pressable
                        onPress={() => {
                          setShowParticipants(false);
                          setCallingUser(participant);
                        }}
                        style={[styles.memberCallButton, { backgroundColor: darkMode ? '#2A2A2A' : '#F5F5F7' }]}
                      >
                        <Ionicons name="call-outline" size={13} color={textSecondary} />
                      </Pressable>
                      <Pressable
                        onPress={() => blockUser(participant.id)}
                        style={[
                          styles.memberCallButton,
                          {
                            backgroundColor: isBlocked(participant.id)
                              ? 'rgba(232,57,80,0.1)'
                              : darkMode
                                ? '#2A2A2A'
                                : '#F5F5F7',
                          },
                        ]}
                      >
                        <Ionicons name="ban-outline" size={13} color={isBlocked(participant.id) ? colors.brand : textSecondary} />
                      </Pressable>
                      {!isDemoMode && isCreator && participant.rideStatus !== 'creator' ? (
                        <Pressable
                          onPress={() => {
                            setShowParticipants(false);
                            setRemovalTarget(participant);
                            setShowRemoveModal(true);
                          }}
                          style={[styles.memberCallButton, { backgroundColor: '#DC2626' }]}
                          accessibilityLabel={`Remove ${participant.name}`}
                        >
                          <Ionicons name="remove-circle-outline" size={15} color="#fff" />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <RemoveAndReportModal
        visible={showRemoveModal}
        passenger={removalTarget ? { name: removalTarget.name } : null}
        onClose={() => {
          setShowRemoveModal(false);
          setRemovalTarget(null);
        }}
        onConfirm={async (reason, reportReason) => {
          if (!removalTarget) return;
          if (removalLoading) return;

          const rideIdToUse = remoteRideId || (chat?.rideId ? String(chat.rideId) : null);
          if (!rideIdToUse) {
            Alert.alert('Unable to remove', 'Could not determine ride id for this group chat.');
            return;
          }

          setRemovalLoading(true);
          try {
            await ridesAPI.removePassenger(rideIdToUse, removalTarget.id, {
              report: Boolean(reportReason),
              reportReason: reportReason || undefined,
              reportDetails: reason,
            });

            setShowRemoveModal(false);
            setRemovalTarget(null);
            await loadRemoteChat();
          } catch (err: any) {
            Alert.alert('Failed to remove', err?.message || 'Failed to remove participant.');
          } finally {
            setRemovalLoading(false);
          }
        }}
      />

      <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setSelectedMessage(null)}>
          <View style={[styles.menuSheet, { backgroundColor: card, borderColor: border }]}> 
            <Pressable
              style={[styles.menuItem, { borderBottomColor: border }]}
              onPress={() => {
                setShowReportModal(true);
              }}
            >
              <Ionicons name="flag-outline" size={16} color={colors.brand} />
              <Text style={[styles.menuItemText, { color: textPrimary }]}>Report message</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                if (selectedMessage) {
                  blockUser(selectedMessage.senderId);
                }
                setSelectedMessage(null);
              }}
            >
              <Ionicons name="ban-outline" size={16} color={colors.brand} />
              <Text style={[styles.menuItemText, { color: textPrimary }]}>Block user</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: card }]}> 
            <View style={[styles.sheetHandle, { backgroundColor: border }]} />
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>Report Message</Text>
            <Text style={[styles.reportSubtitle, { color: textSecondary }]}>Select a reason for reporting this message.</Text>

            <View style={styles.reasonList}>
              {reportReasons.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={[
                    styles.reasonRow,
                    {
                      backgroundColor: reportReason === reason ? 'rgba(232,57,80,0.1)' : inputBg,
                      borderColor: reportReason === reason ? colors.brand : border,
                    },
                  ]}
                >
                  <View style={[styles.reasonDot, { borderColor: reportReason === reason ? colors.brand : '#BDBDBD' }]}>
                    {reportReason === reason ? <View style={styles.reasonDotInner} /> : null}
                  </View>
                  <Text style={[styles.reasonText, { color: textPrimary }]}>{reason}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.reportActions}>
              <Pressable
                style={[styles.reportButton, { borderColor: border }]}
                onPress={() => {
                  setShowReportModal(false);
                  setSelectedMessage(null);
                }}
              >
                <Text style={[styles.reportCancelText, { color: textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.reportButton, { backgroundColor: colors.brand, borderColor: colors.brand }]}
                onPress={() => {
                  if (selectedMessage) {
                    reportMessage(selectedMessage.id, reportReason);
                  }
                  setShowReportModal(false);
                  setSelectedMessage(null);
                }}
              >
                <Text style={styles.reportConfirmText}>Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {callingUser ? <InCallModal user={callingUser} onClose={() => setCallingUser(null)} /> : null}
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
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  membersHint: {
    fontSize: 11,
    color: colors.brand,
    marginTop: 1,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 76,
    paddingRight: 12,
  },
  menuSheet: {
    minWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  root: {
    flex: 1,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  datePillWrap: {
    alignItems: 'center',
  },
  datePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  datePillText: {
    fontSize: 11,
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
  hiddenMessage: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hiddenMessageText: {
    fontSize: 11,
    fontStyle: 'italic',
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetListContent: {
    gap: 10,
    paddingVertical: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberCopy: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  youPill: {
    color: '#FFFFFF',
    backgroundColor: colors.brand,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '600',
  },
  memberUsername: {
    fontSize: 11,
  },
  memberSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  memberStatusPill: {
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '600',
    overflow: 'hidden',
  },
  memberCallButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  reasonList: {
    gap: 8,
    marginBottom: 12,
  },
  reasonRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  reasonText: {
    fontSize: 13,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reportButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCancelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reportConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
