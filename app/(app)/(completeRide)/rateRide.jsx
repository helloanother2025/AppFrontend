import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Modal, TouchableOpacity } from 'react-native';
import RatingForm from '../../../components/RatingForm';
import { useToast } from '../../../context/ToastContext';
import { ratingsAPI } from '../../../src/api/ratings';
import { Ionicons } from '@expo/vector-icons';

/**
 * Example Rating Screen
 * 
 * This screen shows how to use the RatingForm component
 * to submit ratings for users after a ride.
 * 
 * Usage in your app:
 * - After a ride is completed
 * - From user profile screen
 * - From ride details screen
 */
export default function RatingModalExample({
  visible = false,
  onClose,
  rideId,
  recipientId,
  recipientName = 'Driver',
  onRatingSubmitted = () => {},
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmitRating = async (ratingData) => {
    setIsLoading(true);
    try {
      const result = await ratingsAPI.submitRating(
        rideId,
        recipientId,
        ratingData.rating,
        ratingData.comment
      );

      showSuccess(`Rating submitted! Thanks for your feedback.`);
      onRatingSubmitted(result.rating);
      onClose();
    } catch (error) {
      showError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            disabled={isLoading}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Ride</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <RatingForm
            onSubmit={handleSubmitRating}
            onCancel={onClose}
            recipientName={recipientName}
            isLoading={isLoading}
            initialRating={5}
            initialComment=""
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

// Example screen demonstrating how to use the rating modal
export function RideCompletionScreenExample() {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideData] = useState({
    id: 123,
    driverId: 456,
    driverName: 'John Smith',
  });

  return (
    <View style={styles.exampleContainer}>
      <Text style={styles.exampleTitle}>Ride Completed</Text>
      <Text style={styles.exampleText}>Great ride! Rate your experience.</Text>

      <TouchableOpacity
        style={styles.rateButton}
        onPress={() => setShowRatingModal(true)}
      >
        <Ionicons name="star" size={20} color="#fff" />
        <Text style={styles.rateButtonText}>Rate Driver</Text>
      </TouchableOpacity>

      <RatingModalExample
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        rideId={rideData.id}
        recipientId={rideData.driverId}
        recipientName={rideData.driverName}
        onRatingSubmitted={(rating) => {
          console.log('Rating submitted:', rating);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 20,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  exampleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exampleTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'Montserrat-Bold',
  },
  exampleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    fontFamily: 'Montserrat-Regular',
  },
  rateButton: {
    backgroundColor: '#e63e4c',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
  },
});
