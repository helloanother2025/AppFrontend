import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '../components/ScreenShell';
import { UserAvatar } from '../components/UserAvatar';
import { type User } from '../utils/rideMapper';
import { useAppContext } from '../context/AppContext';
import { useUser } from '../context/UserContext';
import { useRide } from '../context/RideContext';
import { colors } from '../theme';
import { feedbackAPI } from '../api/feedback';

type FeedbackBuddy = User & { id: string };

export function RideReviewScreen() {
  const { darkMode, currentUserAvatar } = useAppContext();
  const { user } = useUser();
  const { myRides, joinedRides, getRideDetails } = useRide();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();

  const completedRides = useMemo(
    () => [...(myRides ?? []), ...(joinedRides ?? [])].filter((item) => item.status === 'completed'),
    [myRides, joinedRides]
  );
  const selectedRideId = rideId ? String(rideId) : completedRides[0]?.id ?? null;

  const [ride, setRide] = useState<any | null>(null);
  const [buddies, setBuddies] = useState<FeedbackBuddy[]>([]);
  const [loadingRide, setLoadingRide] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const [selectedBuddyId, setSelectedBuddyId] = useState<string | null>(buddies.length === 1 ? buddies[0].id : null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'select' | 'review'>('select');

  const selectedBuddy = buddies.find((buddy) => buddy.id === selectedBuddyId) ?? null;
  const allDone = buddies.length > 0 && buddies.every((buddy) => submitted.includes(buddy.id));

  const textPrimary = darkMode ? colors.textPrimaryDark : '#111827';
  const textSecondary = darkMode ? colors.textSecondaryDark : '#6B7280';
  const cardBg = darkMode ? colors.cardDark : '#FFFFFF';
  const cardBorder = darkMode ? colors.borderDark : '#E5E7EB';

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  useEffect(() => {
    let active = true;

    const loadReviewData = async () => {
      if (!selectedRideId || !user?.id) {
        setRide(null);
        setBuddies([]);
        setSubmitted([]);
        setLoadingRide(false);
        return;
      }

      setLoadingRide(true);
      setLoadError(null);

      try {
        const rideDetails = await getRideDetails(selectedRideId);
        if (!active) return;

        if (!rideDetails) {
          setRide(null);
          setBuddies([]);
          setLoadError('Ride not found.');
          setLoadingRide(false);
          return;
        }

        setRide(rideDetails);

        const me = String(user.id);
        const creatorId = String(rideDetails.creator?.id ?? rideDetails.creator?.user_id ?? '');
        const isCreator = creatorId === me;
        const passengers = Array.isArray((rideDetails as any).passengers) ? (rideDetails as any).passengers : [];

        const nextBuddies: FeedbackBuddy[] = [];
        const seen = new Set<string>();

        if (!isCreator && creatorId && creatorId !== me) {
          nextBuddies.push({
            id: creatorId,
            name: rideDetails.creator?.name || 'Ride creator',
            username: rideDetails.creator?.username || 'user',
            avatar: rideDetails.creator?.avatar,
            rating: Number(rideDetails.creator?.rating || 0),
            gender: rideDetails.creator?.gender,
            university: rideDetails.creator?.university,
          });
          seen.add(creatorId);
        }

        passengers.forEach((p: any) => {
          const passengerId = String(p.user_id ?? p.id ?? '');
          if (!passengerId || passengerId === me || seen.has(passengerId)) {
            return;
          }
          nextBuddies.push({
            id: passengerId,
            name: p.name || 'Passenger',
            username: p.username || 'user',
            avatar: p.avatar_url || p.avatar,
            rating: Number(p.avg_rating || 0),
          });
          seen.add(passengerId);
        });

        setBuddies(nextBuddies);

        const existing = await feedbackAPI.getRideReviewerFeedback(selectedRideId, user.id);
        if (!active) return;
        const submittedIds = Array.isArray(existing?.feedback)
          ? existing.feedback.map((item: any) => String(item.reviewee_id))
          : [];
        setSubmitted(Array.from(new Set(submittedIds)));
      } catch (err: any) {
        if (!active) return;
        setRide(null);
        setBuddies([]);
        setSubmitted([]);
        setLoadError(err?.message || 'Failed to load ride review data.');
      } finally {
        if (active) {
          setLoadingRide(false);
          setSelectedBuddyId(null);
          setRating(0);
          setComment('');
          setStep('select');
        }
      }
    };

    loadReviewData();

    return () => {
      active = false;
    };
  }, [selectedRideId, user?.id, getRideDetails]);

  const submitReview = async () => {
    if (!selectedBuddyId || rating === 0 || !selectedRideId || !user?.id) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await feedbackAPI.submitFeedback({
        rideId: selectedRideId,
        revieweeId: selectedBuddyId,
        rating,
        review: comment,
      });

      setSubmitted((prev) => (prev.includes(selectedBuddyId) ? prev : [...prev, selectedBuddyId]));
      setRating(0);
      setComment('');
      setSelectedBuddyId(null);
      setStep('select');
    } catch (err: any) {
      const message = String(err?.message || 'Failed to submit review');
      if (message.toLowerCase().includes('already submitted') || message.toLowerCase().includes('already')) {
        setSubmitted((prev) => (prev.includes(selectedBuddyId) ? prev : [...prev, selectedBuddyId]));
        setRating(0);
        setComment('');
        setSelectedBuddyId(null);
        setStep('select');
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell scroll={false}>
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}> 
        <Pressable onPress={() => router.push('/(app)/ride-status')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={textSecondary} />
          <Text style={[styles.backText, { color: textSecondary }]}>Back</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Review Ride Buddies</Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            {ride ? `${ride.from.shortName} -> ${ride.to.shortName}` : 'Completed ride feedback'}
          </Text>
        </View>
        {buddies.length > 0 ? (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>{submitted.length}/{buddies.length}</Text>
          </View>
        ) : null}
      </View>

      {loadingRide ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.brand} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>Loading ride feedback...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: textSecondary }]}>{loadError}</Text>
          <Pressable onPress={() => router.push('/(app)/ride-status')}>
            <Text style={styles.emptyBack}>Back to My Rides</Text>
          </Pressable>
        </View>
      ) : !selectedRideId ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: textSecondary }]}>No completed rides available for review.</Text>
          <Pressable onPress={() => router.push('/(app)/ride-status')}>
            <Text style={styles.emptyBack}>Back to My Rides</Text>
          </Pressable>
        </View>
      ) : allDone ? (
        <View style={styles.doneWrap}>
          <View style={styles.doneIconWrap}>
            <Ionicons name="checkmark-circle" size={40} color={colors.brand} />
          </View>
          <Text style={[styles.doneTitle, { color: textPrimary }]}>All reviews done!</Text>
          <Text style={[styles.doneText, { color: textSecondary }]}>Thanks for reviewing your ride buddies.</Text>
          <Pressable style={styles.doneButton} onPress={() => router.push('/(app)/ride-status')}>
            <Text style={styles.doneButtonText}>Back to My Rides</Text>
          </Pressable>
        </View>
      ) : step === 'select' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.stepHint, { color: textSecondary }]}>Select a buddy to review:</Text>

          {buddies.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: textSecondary }]}>No buddies to review for this ride.</Text>
              <Pressable onPress={() => router.push('/(app)/ride-status')}>
                <Text style={styles.emptyBack}>Back to My Rides</Text>
              </Pressable>
            </View>
          ) : (
            buddies.map((buddy) => {
              const done = submitted.includes(buddy.id);
              return (
                <Pressable
                  key={buddy.id}
                  style={[
                    styles.buddyCard,
                    {
                      backgroundColor: done ? (darkMode ? '#1A2A1A' : '#F0FFF4') : cardBg,
                      borderColor: done ? '#16A34A40' : cardBorder,
                      opacity: done ? 0.72 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (done) return;
                    setSelectedBuddyId(buddy.id);
                    setRating(0);
                    setComment('');
                    setStep('review');
                  }}
                >
                  <View style={styles.buddyAvatarWrap}>
                    <UserAvatar size="md" name={buddy.name} source={buddy.avatar ?? (buddy.id === String(user?.id ?? '') ? currentUserAvatar : undefined)} />
                    {done ? (
                      <View style={styles.doneDot}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.buddyCopy}>
                    <Text style={[styles.buddyName, { color: textPrimary }]}>{buddy.name}</Text>
                    <View style={styles.buddyMeta}>
                      <Ionicons name="star" size={10} color="#F59E0B" />
                      <Text style={[styles.buddyMetaText, { color: textSecondary }]}>{buddy.rating} rating</Text>
                      {buddy.university ? <Text style={[styles.buddyMetaText, { color: textSecondary }]}>• {buddy.university}</Text> : null}
                    </View>
                  </View>
                  {done ? (
                    <Text style={styles.doneLabel}>Reviewed</Text>
                  ) : (
                    <Text style={styles.reviewLabel}>Review {'->'}</Text>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Pressable onPress={() => setStep('select')} style={styles.backToList}>
            <Ionicons name="chevron-back" size={16} color={textSecondary} />
            <Text style={[styles.backToListText, { color: textSecondary }]}>Back</Text>
          </Pressable>

          {selectedBuddy ? (
            <>
              <View style={styles.selectedBuddyRow}>
                <UserAvatar size="lg" name={selectedBuddy.name} source={selectedBuddy.avatar ?? undefined} />
                <View>
                  <Text style={[styles.selectedBuddyName, { color: textPrimary }]}>{selectedBuddy.name}</Text>
                  <Text style={[styles.selectedBuddyUsername, { color: textSecondary }]}>@{selectedBuddy.username}</Text>
                </View>
              </View>

              <Text style={[styles.reviewPrompt, { color: textSecondary }]}>Rate your experience:</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={34}
                      color={star <= rating ? colors.brand : darkMode ? '#444' : '#D1D5DB'}
                    />
                  </Pressable>
                ))}
              </View>
              {rating > 0 ? <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text> : null}

              <Text style={[styles.reviewPrompt, { color: textSecondary }]}>Quick tags (optional):</Text>
              <View style={styles.tagsWrap}>
                {['Punctual', 'Friendly', 'Reliable', 'Good communicator', 'Paid on time', 'No-show'].map((tag) => {
                  const selected = comment.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => {
                        if (selected) {
                          setComment((value) => value.replace(`${tag}. `, '').replace(tag, '').trim());
                        } else {
                          setComment((value) => (value ? `${value}. ${tag}` : tag));
                        }
                      }}
                      style={[selected ? styles.tagChipActive : styles.tagChipIdle, { borderColor: selected ? colors.brand : cardBorder }]}
                    >
                      <Text style={selected ? styles.tagChipActiveText : styles.tagChipIdleText}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={comment}
                onChangeText={setComment}
                multiline
                placeholder="Write a comment (optional)..."
                placeholderTextColor="#9CA3AF"
                style={[styles.commentBox, { backgroundColor: darkMode ? '#2A2A2A' : '#F9F9F9', borderColor: cardBorder, color: textPrimary }]}
              />

              {submitError ? <Text style={styles.submitErrorText}>{submitError}</Text> : null}

              <Pressable onPress={submitReview} disabled={rating === 0 || submitting} style={[styles.submitButton, rating === 0 || submitting ? styles.submitButtonDisabled : null]}>
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      )}
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
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  doneBadge: {
    borderRadius: 999,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  doneBadgeText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  body: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  stepHint: {
    fontSize: 13,
  },
  buddyCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buddyAvatarWrap: {
    position: 'relative',
  },
  doneDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyCopy: {
    flex: 1,
  },
  buddyName: {
    fontSize: 14,
    fontWeight: '600',
  },
  buddyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  buddyMetaText: {
    fontSize: 11,
  },
  doneLabel: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '600',
  },
  reviewLabel: {
    color: '#FFFFFF',
    backgroundColor: colors.brand,
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },
  emptyBack: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  doneIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(232,57,80,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  doneText: {
    fontSize: 13,
    marginBottom: 18,
    textAlign: 'center',
  },
  doneButton: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    paddingVertical: 14,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backToList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  backToListText: {
    fontSize: 13,
  },
  selectedBuddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  selectedBuddyName: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectedBuddyUsername: {
    fontSize: 13,
  },
  reviewPrompt: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  ratingLabel: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagChipIdle: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  tagChipActive: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.brand,
  },
  tagChipIdleText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  tagChipActiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  commentBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 98,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  submitButton: {
    marginTop: 2,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  submitErrorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
});
