import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { useRouter } from 'expo-router';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledCard as Card } from '../../../components/StyledCard';
import { useRide } from '../../../context/RideContext';
import { useUser } from '../../../context/UserContext';
import axios from 'axios';
import { TextInput } from 'react-native';

const PartnerFeedback = () => {
  const router = useRouter();

  const { selectedRide, myRides, rides: availableRides, getRideDetails } = useRide();
  const { currentUser } = useUser();
  // Prefer rideId from route params if present
  const rideIdFromParams = router?.params?.rideId;
  const currentRide = rideIdFromParams
    ? (availableRides.find(r => r.id === Number(rideIdFromParams) || r.ride_id === Number(rideIdFromParams)) || { id: Number(rideIdFromParams) })
    : (selectedRide || myRides[0] || availableRides[0]);

  let participants = [];
  try {
    participants = router?.query?.participants ? JSON.parse(router.query.participants) : [];
  } catch {
    participants = [];
  }

  const [partners, setPartners] = useState([]);

  // Always fetch latest ride details if rideId is present or no participants param
  useEffect(() => {
    const fetchPartners = async () => {
      if (rideIdFromParams || (!participants || participants.length === 0)) {
        const rideId = rideIdFromParams || currentRide?.id;
        if (rideId) {
          const freshRide = await getRideDetails(rideId);
          console.log('Fetched ride details:', freshRide);
          if (freshRide && Array.isArray(freshRide.partners) && freshRide.partners.length > 0) {
            console.log('Fetched partners:', freshRide.partners);
            setPartners(freshRide.partners.map((p) => ({ ...p, rating: p.rating || 0, review: p.review || '' })));
            return;
          } else {
            console.log('No partners found in ride details.');
          }
        }
      }
      // fallback to participants param if available
      if (participants.length > 0) {
        setPartners(participants.map((p) => ({ ...p, rating: p.rating || 0, review: p.review || '' })));
      }
    };
    fetchPartners();
  }, [rideIdFromParams, currentRide?.id]);

  if (!currentRide || !currentRide.partners || currentRide.partners.length === 0) {
    return (
      <ScrollView style={styles.container}>
        <Title>No Buddies Found</Title>
        <Text>No buddies available for feedback.</Text>
      </ScrollView>
    );
  }


  const Star = ({ filled, onClick }) => (
    <TouchableOpacity onPressIn={onClick} activeOpacity={1}>
      <Text style={{ fontSize: 44, marginHorizontal: 2, color: filled ? "gold" : "#ccc" }}>★</Text>
    </TouchableOpacity>
  );

  const handleRating = (partnerHandle, rating) => {
    setPartners((prevPartners) => {
      const updatedPartners = prevPartners.map((p) =>
        p.handle === partnerHandle ? { ...p, rating } : p
      );
      return updatedPartners;
    });
  };

  const handleReviewChange = (partnerHandle, text) => {
    setPartners((prevPartners) =>
      prevPartners.map((p) =>
        p.handle === partnerHandle ? { ...p, review: text } : p
      )
    );
  };

  const optimizedSetPartners = (partnerHandle, key, value) => {
    setPartners((prevPartners) =>
      prevPartners.map((p) =>
        p.handle === partnerHandle ? { ...p, [key]: value } : p
      )
    );
  };


  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
  const FEEDBACK_URL = process.env.EXPO_PUBLIC_FEEDBACK_URL;

  // Completely rewritten feedback submission logic
  const handleSubmitFeedback = async () => {
    if (!currentRide || !currentUser) {
      alert('Missing ride or user information.');
      return;
    }
    let hadError = false;
    let errorMsg = '';
    for (const partner of partners) {
      const payload = {
        ride_id: currentRide.id,
        reviewer_id: currentUser.id || currentUser.user_id,
        reviewee_id: partner.user_id || partner.id,
        rating: partner.rating,
        review: partner.review || '',
      };
      try {
        const response = await axios.post(FEEDBACK_URL, payload);
        if (response.status !== 201) {
          hadError = true;
          errorMsg = 'Unexpected response from backend: ' + response.status;
          break;
        }
        // Send notification to the rated user
        const notifPayload = {
          userId: payload.reviewee_id,
          type: 'feedback',
          message: `You have been rated in your previous ride by ${currentUser.name || currentUser.username || 'a user'}.`,
          relatedUserId: payload.reviewer_id,
          relatedRideId: payload.ride_id,
        };
        try {
          // Remove any accidental /send from the URL
          let notifUrl = `${API_BASE_URL.replace(/\/?$/, '')}/notifications`;
          notifUrl = notifUrl.replace(/\/send$/, '');
          await axios.post(notifUrl, notifPayload);
        } catch (notifErr) {
          console.error('Notification error:', notifErr);
          // Do not block feedback success on notification failure
        }
      } catch (err) {
        hadError = true;
        if (err.response) {
          errorMsg = 'Backend error: ' + (err.response.data?.error || JSON.stringify(err.response.data));
        } else {
          errorMsg = 'Network or unknown error: ' + err.message;
        }
        break;
      }
    }
    if (hadError) {
      alert(errorMsg);
    } else {
      alert('Feedback submitted and saved!');
      router.push('/(dashboard)/dash');
    }
  };

  return (
    <ScrollView>
      <Title>Buddy feedback</Title>
      {partners.map((partner) => (
        <Card key={partner.handle} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 34 }}>👤 </Text>
            <View style={{ flexDirection: 'column', flex: 1 }}>
              <Text style={{ fontWeight: 'semibold', fontSize: 18 }}>{partner.name}</Text>
              <Text style={styles.handle}>{partner.handle}</Text>
            </View>
          </View>
          <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Rate this user:</Text>
          <View style={{ flexDirection: 'row', marginVertical: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                filled={i <= partner.rating}
                onClick={() => handleRating(partner.handle, i)}
              />
            ))}
          </View>
          <Text style={{ marginTop: 5, fontWeight: 'bold', marginBottom: 10 }}>Write a review:</Text>
          <TextInput
            style={[styles.reviewInput, { marginTop: 2, paddingTop: 10, fontFamily: 'Montserrat-Regular' }]}
            placeholder="Share your review"
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            value={partner.review || ''}
            onChangeText={(text) => optimizedSetPartners(partner.handle, 'review', text)}
            allowEmptyInput={true}
          />
        </Card>
      ))}
      <TouchableOpacity
        style={{ alignSelf: 'flex-end', marginTop: 8 }}
        onPress={handleSubmitFeedback}
      >
        <Text style={{ fontSize: 14, fontWeight: 'semibold', paddingRight: 10 }}>
          Submit Feedback
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  handle: {
    fontSize: 14,
    color: '#888',
  },
  reviewInput: {
    fontSize: 14,
    height: 100,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginVertical: 10, // Added spacing for better responsiveness
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10, // Added spacing for better responsiveness
  },
  submitButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PartnerFeedback;
