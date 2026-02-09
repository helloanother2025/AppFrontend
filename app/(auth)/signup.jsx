import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StyledText as Text } from '../../components/StyledText';
import { StyledTitle as Title } from '../../components/StyledTitle';
import { StyledButton as Button } from '../../components/StyledButton';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyledScrollView as ScrollView } from '../../components/StyledScrollView';
import { StyledSearchBar as TextInput } from '../../components/StyledSearchBar'
import { authAPI } from '../../src/api/auth';
import { usersAPI } from '../../src/api/users';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';

export default function Signup() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [address, setAddress] = useState('');
  const [fb, setFb] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const validateStep = () => {
    setError('');
    switch (step) {
      case 1:
        if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
          setError('Please fill in all required fields.');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError('Please enter a valid email address.');
          return false;
        }
        if (!/^\d+$/.test(phone.trim()) || phone.trim().length < 10) {
          setError('Please enter a valid phone number.');
          return false;
        }
        break;
      case 2:
        if (!password.trim() || !confirmPassword.trim()) {
          setError('Please fill in all required.');
          return false;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return false;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return false;
        }
        break;
      case 3:
        if (!gender.trim()) {
          setError('Please fill in all required fields.');
          return false;
        }
        break;
      case 4:
        // No required fields for step 4 (fb is optional)
        break;
      default:
        break;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep()) {
      setStep((s) => Math.min(5, s + 1));
    }
  };
  const goBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSignup = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim() || null;
      const username = email.trim().split('@')[0];
      
      // Register and get token
      const { token, userId, userUuid } = await authAPI.register(
        email.trim(), 
        password, 
        name, 
        username, 
        phone.trim() || null, 
        gender ? gender.toLowerCase() : null, 
        university || null, 
        department || null, 
        address || null, 
        fb || null
      );
      
      // Verify token is stored
      const storedToken = await SecureStore.getItemAsync('authToken');
      if (!storedToken) {
        throw new Error('Failed to store authentication token');
      }
      
      // Add a small delay to ensure token is available in subsequent requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch user data to verify registration
      try {
        await usersAPI.getCurrentUser();
      } catch (userErr) {
        console.log('Warning: Could not fetch user data after signup');
        console.log('getCurrentUser error details:', {
          message: userErr?.message,
          status: userErr?.response?.status,
          data: userErr?.response?.data,
          headers: userErr?.response?.headers?.authorization
        });
      }
      
      // Navigate to dashboard
      router.replace('/(app)/(dashboard)/dash');
    } catch (err) {
      console.log('Signup error:', err);
      console.log('Error response:', err?.response?.data);
      setError(err?.response?.data?.error || err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return false;
    }
    return true;
  };

  const requestLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return false;
    }
    return true;
  };

  const openCamera = async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const ok = await requestLibraryPermission();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <ScrollView>
      <View style={styles.headerSpacer} />
      <Title>Get started</Title>

      {step === 1 && (
        <>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.half]}>
              <Text style={styles.label}>First name <Text style={styles.requiredIndicator}>*</Text></Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First"
              />
            </View>
            <View style={[styles.fieldGroup, styles.half, styles.halfRight]}>
              <Text style={styles.label}>Last name <Text style={styles.requiredIndicator}>*</Text></Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone <Text style={styles.requiredIndicator}>*</Text></Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="01XXXXXXXXX"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email <Text style={styles.requiredIndicator}>*</Text></Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Next" onPress={goNext} style={[{marginTop: 20, width: '100%', alignSelf: 'flex-end'}]} />

        </>
      )}

      {step === 2 && (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password <Text style={styles.requiredIndicator}>*</Text></Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password <Text style={styles.requiredIndicator}>*</Text></Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="••••••••"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.stepRow}>
            <Button title="Back" onPress={goBack} style={styles.stepButton} />
            <Button title="Next" onPress={goNext} style={styles.stepButton} />
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender <Text style={styles.requiredIndicator}>*</Text></Text>
            <View style={styles.radioRow}>
              {['Male', 'Female', 'Other'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.radioPill, gender === opt && styles.radioPillActive]}
                  onPress={() => setGender(opt)}
                >
                  <Text style={[styles.radioText, gender === opt && styles.radioTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>University</Text>
            <TextInput
              value={university}
              onChangeText={setUniversity}
              placeholder="Your university"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Department</Text>
            <TextInput
              value={department}
              onChangeText={setDepartment}
              placeholder="Your department"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.stepRow}>
            <Button title="Back" onPress={goBack} style={styles.stepButton} />
            <Button title="Next" onPress={goNext} style={styles.stepButton} />
          </View>
        </>
      )}

      {step === 4 && (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Facebook (optional)</Text>
            <TextInput
              value={fb}
              onChangeText={setFb}
              placeholder="facebook.com/username"
            />
          </View>

          <View style={styles.stepRow}>
            <Button title="Back" onPress={goBack} style={styles.stepButton} />
            <Button title="Skip" onPress={goNext} style={styles.stepButton} />
          </View>
        </>
      )}

      {step === 5 && (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Profile picture</Text>
            <View style={styles.profilePicWrapper}>
              <View style={styles.profilePicCircle}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profilePicImage} />
                ) : (
                  <Ionicons name="person" size={112} color="#888" />
                )}
              </View>
            </View>

            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.profileActionButton} onPress={openCamera}>
                <Ionicons name="camera" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileActionButton} onPress={openGallery}>
                <Ionicons name="image" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.stepRow}>
            <Button title="Back" onPress={goBack} style={styles.stepButton} />
            <Button
              title={loading ? '...' : 'Skip'}
              onPress={handleSignup}
              disabled={loading}
              style={styles.stepButton}
            />
          </View>

          {loading && <ActivityIndicator size="small" color="#e63e4c" />}
        </>
      )}

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.linkRow}>
        <Text>Already have an account? </Text>
        <Text style={styles.linkText}>Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerSpacer: {
    height: 100,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  fieldGroup: {
    width: '100%',
    marginTop: 12,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  stepButton: {
    width: '42%',
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  radioPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#b3b3b3',
    backgroundColor: '#fff',
  },
  radioPillActive: {
    backgroundColor: '#1f1f1f',
    borderColor: '#1f1f1f',
  },
  radioText: {
    fontSize: 14,
    color: '#000',
  },
  radioTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  half: {
    flex: 1,
  },
  halfRight: {
    marginLeft: 10,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    marginTop: 16,
  },
  error: {
    color: '#e63e4c',
    marginTop: 16,
  },
  mutedText: {
    color: '#888',
    marginTop: 6,
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  profilePicWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePicCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profilePicImage: {
    width: '100%',
    height: '100%',
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  profileActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#e63e4c',
    fontWeight: 'bold',
  },
  requiredIndicator: {
    color: '#e63e4c',
  },
});
