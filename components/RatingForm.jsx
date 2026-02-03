import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StyledButton from './StyledButton';

const RatingForm = ({
  onSubmit,
  onCancel,
  recipientName = 'User',
  isLoading = false,
  initialRating = 5,
  initialComment = '',
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!rating || rating < 1 || rating > 5) {
      newErrors.rating = 'Please select a rating between 1 and 5';
    }

    if (comment.trim().length < 5 && comment.trim().length > 0) {
      newErrors.comment = 'Comment must be at least 5 characters';
    }

    if (comment.length > 500) {
      newErrors.comment = 'Comment must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onSubmit({
      rating,
      comment: comment.trim(),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rate your experience</Text>
        <Text style={styles.subtitle}>with {recipientName}</Text>
      </View>

      {/* Star Rating */}
      <View style={styles.ratingContainer}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              disabled={isLoading}
            >
              <MaterialCommunityIcons
                name={star <= rating ? 'star' : 'star-outline'}
                size={48}
                color={star <= rating ? '#FFD700' : '#ccc'}
                style={styles.star}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingText}>{rating}.0 / 5.0</Text>
        {errors.rating && <Text style={styles.errorText}>{errors.rating}</Text>}
      </View>

      {/* Rating Labels */}
      <View style={styles.labelRow}>
        <Text style={[styles.ratingLabel, { textAlign: 'left' }]}>Poor</Text>
        <Text style={[styles.ratingLabel, { textAlign: 'center' }]}>Average</Text>
        <Text style={[styles.ratingLabel, { textAlign: 'right' }]}>Excellent</Text>
      </View>

      {/* Comment Section */}
      <View style={styles.commentSection}>
        <Text style={styles.commentLabel}>Add a comment (optional)</Text>
        <TextInput
          style={[
            styles.commentInput,
            errors.comment && styles.commentInputError,
          ]}
          placeholder="Share your experience..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          maxLength={500}
          value={comment}
          onChangeText={setComment}
          editable={!isLoading}
          textAlignVertical="top"
        />
        <View style={styles.commentFooter}>
          <Text style={styles.characterCount}>
            {comment.length}/500
          </Text>
          {errors.comment && (
            <Text style={styles.errorText}>{errors.comment}</Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <StyledButton
          title={isLoading ? 'Submitting...' : 'Submit Rating'}
          onPress={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
        />
      </View>

      {/* Quick Comment Suggestions */}
      {rating > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Quick suggestions:</Text>
          <View style={styles.suggestionsRow}>
            {getQuickComments(rating).map((text, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => setComment(text)}
                disabled={isLoading}
              >
                <Text style={styles.suggestionText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const getQuickComments = (rating) => {
  switch (rating) {
    case 1:
      return ['Poor experience', 'Not satisfied', 'Would not recommend'];
    case 2:
      return ['Below average', 'Could be better', 'Disappointed'];
    case 3:
      return ['Average ride', 'Acceptable', 'It was okay'];
    case 4:
      return ['Good experience', 'Very satisfied', 'Would ride again'];
    case 5:
      return ['Excellent driver', 'Highly recommend', 'Perfect ride'];
    default:
      return [];
  }
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
  },
  ratingContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  star: {
    marginHorizontal: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e63e4c',
    fontFamily: 'Montserrat-SemiBold',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat-Regular',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    fontFamily: 'Montserrat-SemiBold',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    fontFamily: 'Montserrat-Regular',
    color: '#000',
  },
  commentInputError: {
    borderColor: '#ff6b6b',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat-Regular',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Montserrat-SemiBold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  suggestionsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    fontFamily: 'Montserrat-SemiBold',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e63e4c',
  },
  suggestionText: {
    fontSize: 12,
    color: '#e63e4c',
    fontFamily: 'Montserrat-Regular',
  },
});

export default RatingForm;
