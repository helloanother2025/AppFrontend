import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { useRouter } from 'expo-router';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledCard as Card } from '../../../components/StyledCard';
import { useRide } from '../../../context/RideContext';
import axios from 'axios';
import { TextInput } from 'react-native';

const PartnerFeedback = () => {
  const router = useRouter();
  const { selectedRide, myRides, rides: availableRides } = useRide();
  const currentRide = selectedRide || myRides[0] || availableRides[0];

  const participants = JSON.parse(router.query.participants || '[]');

  const [partners, setPartners] = useState(
    participants.map((p) => ({
      ...p,
      rating: p.rating || 0,
      review: p.review || '',
    }))
  );

  if (!currentRide || !currentRide.partners || currentRide.partners.length === 0) {
    return (
      <ScrollView>
        <Title>No Buddies Found</Title>
        <Text>No buddies available for feedback.</Text>
      </ScrollView>
    );
  }

  const Star = ({ filled, onClick }) => (
    <TouchableOpacity onPress={onClick} activeOpacity={1}>
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

  const handleSubmitFeedback = async () => {
    try {
      const feedbackData = partners.map((partner) => ({
        ride_id: currentRide.id, // Replace with actual ride ID
        reviewer_id: currentRide.reviewer_id, // Replace with actual reviewer ID
        reviewee_id: partner.id, // Replace with actual reviewee ID
        rating: partner.rating,
      }));

      await Promise.all(
        feedbackData.map(async (feedback) => {
          await axios.post(`${API_BASE_URL}/feedback/submit`, feedback);

          // Send notification to the user with a view button
          await axios.post(`${API_BASE_URL}/notifications/send`, {
            userId: feedback.reviewee_id,
            message: `You have been rated in your previous ride by ${currentRide.reviewer_name}. View feedback.`,
            action: {
              type: 'view_feedback',
              rideId: feedback.ride_id,
              reviewerId: currentRide.reviewer_id,
            },
          });
        })
      );

      alert('Feedback submitted successfully!');
      router.push('/(dashboard)/dash');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
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
            onChangeText={(text) =>
              optimizedSetPartners(partner.handle, 'review', text)
            }
            allowEmptyInput={true} // Allowing the review area to be optional
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
